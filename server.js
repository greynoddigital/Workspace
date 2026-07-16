// server.js
//
// Entry point for GreyNod Workspace. Starts an Express server that:
//   1. Serves the plain HTML/Alpine.js frontend from /public
//   2. Exposes a JSON API under /api/*
//
// Run with:  npm install && npm start

// Load variables from a local .env file, if present (development
// convenience only - on Render, real environment variables are used
// and this is a harmless no-op since there's no .env file deployed).
require("dotenv").config();

const express = require("express");
const path = require("path");

// ─── Storage backend configuration check ───────────────────────────────────
// This app stores all application data in a private GitHub repository
// (see src/lib/githubStorage.js) instead of the local filesystem. It
// cannot function without these three variables, so fail fast with a
// clear message rather than letting the first API request blow up.
const REQUIRED_ENV_VARS = ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO"];
const missingEnvVars = REQUIRED_ENV_VARS.filter((name) => !process.env[name]);
if (missingEnvVars.length > 0) {
  console.error(
    `GreyNod Workspace cannot start: missing required environment variable(s): ${missingEnvVars.join(", ")}.\n` +
      "Set GITHUB_TOKEN (a token with repo access), GITHUB_OWNER (the account/org that owns the data repo), " +
      "and GITHUB_REPO (the data repo name, e.g. Workspace-Data). See README.md for setup instructions."
  );
  process.exit(1);
}

const dashboardRoutes = require("./src/routes/dashboard");
const projectsRoutes = require("./src/routes/projects");
const servicesRoutes = require("./src/routes/services");
const paymentsRoutes = require("./src/routes/payments");
const filesRoutes = require("./src/routes/files");
const notesRoutes = require("./src/routes/notes");
const documentsRoutes = require("./src/routes/documents");
const quotationsRoutes = require("./src/routes/quotations");
const checklistsRoutes = require("./src/routes/checklists");
const invoicesRoutes = require("./src/routes/invoices");
const settingsRoutes = require("./src/routes/settings");
const searchRoutes = require("./src/routes/search");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ─── API routes ──────────────────────────────────────────────────────────────

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/settings", settingsRoutes);

app.use("/api/projects", projectsRoutes);
app.use("/api/projects/:projectId/services", servicesRoutes);
app.use("/api/projects/:projectId/payments", paymentsRoutes);
app.use("/api/projects/:projectId/files", filesRoutes);
app.use("/api/projects/:projectId/notes", notesRoutes);
app.use("/api/projects/:projectId/documents", documentsRoutes);
app.use("/api/projects/:projectId/quotations", quotationsRoutes);
app.use("/api/projects/:projectId/checklists", checklistsRoutes);
app.use("/api/projects/:projectId/invoices", invoicesRoutes);

// ─── Frontend (static files) ─────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, "public")));

// Any unknown non-API route falls back to the dashboard page.
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ─── Error handling ───────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ errors: ["Something went wrong on the server."] });
});

app.listen(PORT, () => {
  console.log(`GreyNod Workspace running at http://localhost:${PORT}`);
});
