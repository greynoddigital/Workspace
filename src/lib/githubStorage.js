// src/lib/githubStorage.js
//
// Replaces the filesystem as the application's storage backend.
// Every read/write that used to touch workspace-data/ on disk now
// goes through the GitHub Contents API (via @octokit/rest) against
// a dedicated private repository.
//
// Required environment variables:
//   GITHUB_TOKEN  - a GitHub personal access token with "repo" scope
//   GITHUB_OWNER  - the account/org that owns the data repo
//   GITHUB_REPO   - the name of the data repo (e.g. "Workspace-Data")
//   NODE_ENV      - "production" on Render, unset/"development" locally
//
// Repository layout (all paths are relative to the repo root):
//   projects/GN-YYYY-NNNN/project.json     - core project fields
//   projects/GN-YYYY-NNNN/services.json    - services array
//   projects/GN-YYYY-NNNN/payments.json    - payments array
//   projects/GN-YYYY-NNNN/files.json       - file links array
//   projects/GN-YYYY-NNNN/documents.json   - { quotations, checklists, invoices }
//   projects/GN-YYYY-NNNN/notes.md         - free-form notes
//   projects/GN-YYYY-NNNN/<kind>-NNNN.json - snapshot of a single generated document
//   projects/GN-YYYY-NNNN/<kind>-NNNN.pdf  - the PDF generated for that document
//   settings/settings.json                 - the single settings object
//   counters/counters.json                 - every sequential counter the app uses
//
// This file is the ONLY place in the app that talks to the GitHub API.
// Everything above it (projectStore, settingsStore, documentNumbering,
// idGenerator, search) keeps the exact same function names/shape it
// always had - just async now, since network I/O can't be synchronous.

const { Octokit } = require("@octokit/rest");

// ─── client & basic config ──────────────────────────────────────────────────

let _octokit = null;

function client() {
  if (_octokit) return _octokit;

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN is not set. GreyNod Workspace stores all data in GitHub " +
        "and cannot start without a token that can read/write the data repo."
    );
  }

  _octokit = new Octokit({ auth: token });
  return _octokit;
}

function repoConfig() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  if (!owner || !repo) {
    throw new Error("GITHUB_OWNER and GITHUB_REPO must both be set.");
  }
  return { owner, repo };
}

function isNotFound(err) {
  return err && (err.status === 404 || err.status === "404");
}

// ─── low-level primitives ───────────────────────────────────────────────────
// These four are the ones exposed for generic use, per spec. Everything
// else in this file is built on top of them.

/**
 * Resolves the base64 content of a file returned by repos.getContent().
 *
 * The Contents API only inlines file content when the file is under 1MB.
 * For anything larger (e.g. a generated invoice/quotation/checklist PDF
 * with the logo/stamp/QR code embedded as base64 images, which easily
 * crosses 1MB) it omits `content` entirely and sets `encoding: "none"`.
 * That "none" is a truthy string, so the old `data.encoding || "base64"`
 * fallback never kicked in and it was passed straight to Buffer.from()
 * as the encoding name, which Node doesn't recognize.
 *
 * When that happens, fetch the blob directly via the Git Data API
 * (using the sha we already have from the Contents API response) -
 * that endpoint always returns base64 content regardless of file size
 * (up to the Git blob API's own 100MB limit), which is the officially
 * documented way to read large files from a repo.
 */
async function resolveFileBase64(owner, repo, filePath, data) {
  if (data.encoding === "none") {
    const { data: blob } = await client().git.getBlob({ owner, repo, file_sha: data.sha });
    return blob.content;
  }
  return data.content;
}

/**
 * Reads a text file from the data repo.
 * Returns { content, sha } or null if the file doesn't exist.
 */
async function readFile(filePath) {
  const { owner, repo } = repoConfig();
  try {
    const { data } = await client().repos.getContent({ owner, repo, path: filePath });
    if (Array.isArray(data) || data.type !== "file") {
      throw new Error(`${filePath} is not a file`);
    }
    const base64 = await resolveFileBase64(owner, repo, filePath, data);
    const content = Buffer.from(base64, "base64").toString("utf-8");
    return { content, sha: data.sha };
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

/**
 * Reads a binary file. Returns { buffer, sha } or null if missing.
 */
async function readFileBuffer(filePath) {
  const { owner, repo } = repoConfig();
  try {
    const { data } = await client().repos.getContent({ owner, repo, path: filePath });
    if (Array.isArray(data) || data.type !== "file") {
      throw new Error(`${filePath} is not a file`);
    }
    const base64 = await resolveFileBase64(owner, repo, filePath, data);
    return { buffer: Buffer.from(base64, "base64"), sha: data.sha };
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

/**
 * Creates or updates a file. `content` may be a string (text) or a
 * Buffer (binary, e.g. a PDF). Automatically fetches the current sha
 * when one isn't supplied, and retries once on a 409 (sha mismatch
 * caused by a concurrent write) by re-fetching the latest sha.
 */
async function writeFile(filePath, content, options = {}) {
  const { owner, repo } = repoConfig();
  const message = options.message || `Update ${filePath}`;
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(String(content), "utf-8");
  const base64 = buffer.toString("base64");

  let sha = options.sha;
  const attempts = options._attempt || 0;

  if (sha === undefined) {
    const existing = await readFileBuffer(filePath);
    sha = existing ? existing.sha : undefined;
  }

  try {
    const { data } = await client().repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message,
      content: base64,
      sha,
    });
    return data.content ? data.content.sha : null;
  } catch (err) {
    if (err && err.status === 409 && attempts < 2) {
      // Someone else wrote to this file between our read and write.
      // Re-fetch the current sha and try again.
      return writeFile(filePath, content, { ...options, sha: undefined, _attempt: attempts + 1 });
    }
    throw err;
  }
}

/** Deletes a file if it exists. No-op (returns false) if it doesn't. */
async function deleteFile(filePath, options = {}) {
  const { owner, repo } = repoConfig();
  const existing = await readFileBuffer(filePath);
  if (!existing) return false;

  await client().repos.deleteFile({
    owner,
    repo,
    path: filePath,
    message: options.message || `Delete ${filePath}`,
    sha: existing.sha,
  });
  return true;
}

/** Lists entries of a directory. Returns [] if the directory doesn't exist. */
async function listDir(dirPath) {
  const { owner, repo } = repoConfig();
  try {
    const { data } = await client().repos.getContent({ owner, repo, path: dirPath });
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (isNotFound(err)) return [];
    throw err;
  }
}

// ─── JSON convenience helpers ───────────────────────────────────────────────

async function readJSON(filePath, defaultValue = null) {
  const file = await readFile(filePath);
  if (!file || !file.content.trim()) return defaultValue;
  return JSON.parse(file.content);
}

async function writeJSON(filePath, data, message) {
  return writeFile(filePath, JSON.stringify(data, null, 2), { message });
}

// ─── project path helpers ───────────────────────────────────────────────────

function projectDir(id) {
  return `projects/${id}`;
}
function projectFile(id) {
  return `${projectDir(id)}/project.json`;
}
function servicesFile(id) {
  return `${projectDir(id)}/services.json`;
}
function paymentsFile(id) {
  return `${projectDir(id)}/payments.json`;
}
function filesFile(id) {
  return `${projectDir(id)}/files.json`;
}
function documentsFile(id) {
  return `${projectDir(id)}/documents.json`;
}
function notesFile(id) {
  return `${projectDir(id)}/notes.md`;
}

const SETTINGS_PATH = "settings/settings.json";
const COUNTERS_PATH = "counters/counters.json";

function emptyDocuments() {
  return { quotations: [], checklists: [], invoices: [] };
}

// ─── counters (projects/quotations/checklists/invoices numbering) ──────────
// Read -> increment -> commit -> return, as specified. Retries on
// conflict so two near-simultaneous document creations don't collide.

async function loadCounters() {
  const counters = await readJSON(COUNTERS_PATH, null);
  return counters || {};
}

async function saveCounters(counters) {
  await writeJSON(COUNTERS_PATH, counters, "Update counters");
  return counters;
}

/**
 * Atomically reserves the next number for `kind` (e.g. "projects",
 * "quotation", "checklist", "invoice") within `year`, and returns it.
 */
async function reserveNextNumber(kind, year) {
  const { owner, repo } = repoConfig();

  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await readFile(COUNTERS_PATH);
    const counters = existing ? JSON.parse(existing.content) : {};
    if (!counters[kind]) counters[kind] = {};
    const current = counters[kind][year] || 0;
    const next = current + 1;
    counters[kind][year] = next;

    try {
      await client().repos.createOrUpdateFileContents({
        owner,
        repo,
        path: COUNTERS_PATH,
        message: `Reserve next ${kind} number for ${year}`,
        content: Buffer.from(JSON.stringify(counters, null, 2), "utf-8").toString("base64"),
        sha: existing ? existing.sha : undefined,
      });
      return next;
    } catch (err) {
      if (err && err.status === 409) continue; // someone else wrote first, retry
      throw err;
    }
  }

  throw new Error(`Could not reserve a ${kind} number after several attempts.`);
}

// ─── settings ────────────────────────────────────────────────────────────────

async function loadSettings() {
  return readJSON(SETTINGS_PATH, null);
}

async function saveSettings(settings) {
  await writeJSON(SETTINGS_PATH, settings, "Update settings");
  return settings;
}

// ─── projects ────────────────────────────────────────────────────────────────

/** Loads a full project (base fields + services + payments + files merged). */
async function loadProject(id) {
  const base = await readJSON(projectFile(id), null);
  if (!base) return null;

  const [services, payments, files] = await Promise.all([
    readJSON(servicesFile(id), []),
    readJSON(paymentsFile(id), []),
    readJSON(filesFile(id), []),
  ]);

  return { ...base, services, payments, files };
}

/** Creates a brand new project folder with all of its starting files. */
async function createProject(fields, id) {
  const now = new Date().toISOString();
  const base = {
    id,
    projectName: fields.projectName || "",
    clientName: fields.clientName || "",
    phone: fields.phone || "",
    email: fields.email || "",
    location: fields.location || "",
    description: fields.description || "",
    status: fields.status || "Lead",
    startDate: fields.startDate || null,
    expectedDelivery: fields.expectedDelivery || null,
    completedDate: fields.completedDate || null,
    createdAt: now,
    updatedAt: now,
  };

  await Promise.all([
    writeJSON(projectFile(id), base, `Create project ${id}`),
    writeJSON(servicesFile(id), [], `Create project ${id}`),
    writeJSON(paymentsFile(id), [], `Create project ${id}`),
    writeJSON(filesFile(id), [], `Create project ${id}`),
    writeJSON(documentsFile(id), emptyDocuments(), `Create project ${id}`),
    writeFile(notesFile(id), "", { message: `Create project ${id}` }),
  ]);

  return { ...base, services: [], payments: [], files: [] };
}

/**
 * Overwrites a project. `project` is the full merged object (base fields
 * + services + payments + files), same shape loadProject() returns.
 * Splits it back apart and writes each file.
 */
async function updateProject(id, project) {
  const { services = [], payments = [], files = [], ...base } = project;
  base.updatedAt = new Date().toISOString();

  await Promise.all([
    writeJSON(projectFile(id), base, `Update project ${id}`),
    writeJSON(servicesFile(id), services, `Update project ${id}`),
    writeJSON(paymentsFile(id), payments, `Update project ${id}`),
    writeJSON(filesFile(id), files, `Update project ${id}`),
  ]);

  return { ...base, services, payments, files };
}

async function projectExists(id) {
  const file = await readFile(projectFile(id));
  return Boolean(file);
}

async function deleteProjectData(id) {
  const entries = await listDir(projectDir(id));
  if (entries.length === 0) {
    // Might still be a project whose folder just wasn't listable this way;
    // check the canonical file directly.
    const exists = await projectExists(id);
    if (!exists) return false;
  }
  await Promise.all(entries.map((entry) => deleteFile(entry.path, { message: `Delete project ${id}` })));
  // Also remove project.json explicitly in case listDir raced with the loop above.
  await deleteFile(projectFile(id), { message: `Delete project ${id}` });
  return true;
}

/** Lists every project folder under projects/ and loads each one. */
async function listProjects() {
  const entries = await listDir("projects");
  const ids = entries.filter((e) => e.type === "dir").map((e) => e.name);
  const projects = await Promise.all(ids.map((id) => loadProject(id)));
  return projects.filter(Boolean);
}

// ─── documents.json (quotations/checklists/invoices index) ────────────────

async function loadDocuments(id) {
  return readJSON(documentsFile(id), emptyDocuments());
}

async function saveDocuments(id, documents) {
  await writeJSON(documentsFile(id), documents, "Update documents");
  return documents;
}

// ─── notes.md ────────────────────────────────────────────────────────────────

async function loadNotes(id) {
  const file = await readFile(notesFile(id));
  return file ? file.content : "";
}

async function saveNotes(id, content) {
  await writeFile(notesFile(id), content ?? "", { message: "Update notes" });
  return content;
}

// ─── individual document snapshots + PDFs ──────────────────────────────────
// On top of documents.json (which the routes use as the source of truth),
// each generated document also gets its own snapshot file, and each PDF
// download also gets uploaded into the project's folder in GitHub.

function seqSuffix(number) {
  // "QT-2026-0004" -> "0004"
  const parts = String(number).split("-");
  return parts[parts.length - 1] || String(number);
}

async function saveDocumentSnapshot(projectId, kind, doc) {
  const path = `${projectDir(projectId)}/${kind}-${seqSuffix(doc.number)}.json`;
  await writeJSON(path, doc, `Save ${kind} ${doc.number}`);
  return path;
}

async function saveQuotation(projectId, quotation) {
  return saveDocumentSnapshot(projectId, "quotation", quotation);
}

async function saveInvoice(projectId, invoice) {
  return saveDocumentSnapshot(projectId, "invoice", invoice);
}

async function saveChecklist(projectId, checklist) {
  return saveDocumentSnapshot(projectId, "checklist", checklist);
}

/** Uploads a generated PDF buffer into the project's folder. */
async function savePdf(projectId, kind, number, buffer) {
  const path = `${projectDir(projectId)}/${kind}-${seqSuffix(number)}.pdf`;
  await writeFile(path, buffer, { message: `Save ${kind} PDF ${number}` });
  return path;
}

module.exports = {
  // low-level
  readFile,
  readFileBuffer,
  writeFile,
  deleteFile,
  listDir,
  readJSON,
  writeJSON,
  // counters
  loadCounters,
  saveCounters,
  reserveNextNumber,
  // settings
  loadSettings,
  saveSettings,
  // projects
  createProject,
  updateProject,
  listProjects,
  loadProject,
  projectExists,
  deleteProjectData,
  // documents
  loadDocuments,
  saveDocuments,
  // notes
  loadNotes,
  saveNotes,
  // per-document snapshots + pdfs
  saveQuotation,
  saveInvoice,
  saveChecklist,
  savePdf,
};
