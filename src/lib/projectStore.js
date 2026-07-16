// src/lib/projectStore.js
//
// All reading and writing of individual project data lives here.
// Each project is a folder in the GitHub data repo:
//   projects/GN-2026-0001/
//     project.json    -> core project fields
//     services.json   -> services array
//     payments.json   -> payments array
//     files.json      -> file links array
//     documents.json  -> generated quotations, checklists, invoices
//     notes.md        -> free-form markdown notes
//
// This module keeps the exact same function names and return shapes
// it always had (a merged project object with services/payments/files
// embedded, just like before) - only the storage backend underneath
// changed, from the local filesystem to GitHub. Every function here is
// now async because it talks to the network; callers just need `await`.
//
// Nothing outside this file should build a project file path by hand.

const githubStorage = require("./githubStorage");
const { nextProjectId } = require("./idGenerator");

function emptyDocuments() {
  return { quotations: [], checklists: [], invoices: [] };
}

/** Returns true if a project with this ID exists. */
async function exists(projectId) {
  return githubStorage.projectExists(projectId);
}

/** Creates a new project folder with its starting files. Returns the new project. */
async function createProject(fields) {
  const id = await nextProjectId();
  return githubStorage.createProject(fields, id);
}

/** Reads a single project (merged). Returns null if it doesn't exist. */
async function readProject(projectId) {
  return githubStorage.loadProject(projectId);
}

/** Overwrites a project (also bumps updatedAt). */
async function writeProject(projectId, project) {
  return githubStorage.updateProject(projectId, project);
}

/** Shallow-merges fields into an existing project and saves it. */
async function updateProject(projectId, partialFields) {
  const current = await readProject(projectId);
  if (!current) return null;
  const updated = { ...current, ...partialFields, id: current.id };
  return writeProject(projectId, updated);
}

/** Deletes a project folder and everything inside it. */
async function deleteProject(projectId) {
  return githubStorage.deleteProjectData(projectId);
}

/** Returns every project, unsorted. Use listProjectsSorted() for display. */
async function listProjects() {
  return githubStorage.listProjects();
}

/** Returns every project, newest-updated first. */
async function listProjectsSorted() {
  const projects = await listProjects();
  return projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

// ─── documents.json ─────────────────────────────────────────────────────────

async function readDocuments(projectId) {
  return githubStorage.loadDocuments(projectId);
}

async function writeDocuments(projectId, documents) {
  return githubStorage.saveDocuments(projectId, documents);
}

// ─── notes.md ────────────────────────────────────────────────────────────────

async function readNotes(projectId) {
  return githubStorage.loadNotes(projectId);
}

async function writeNotes(projectId, content) {
  return githubStorage.saveNotes(projectId, content);
}

module.exports = {
  exists,
  createProject,
  readProject,
  writeProject,
  updateProject,
  deleteProject,
  listProjects,
  listProjectsSorted,
  readDocuments,
  writeDocuments,
  readNotes,
  writeNotes,
};
