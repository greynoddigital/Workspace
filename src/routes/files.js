// src/routes/files.js
//
// Stores references to files kept on Google Drive - just a file
// name and a link, nothing is uploaded to this server.
//   GET    /api/projects/:projectId/files
//   POST   /api/projects/:projectId/files
//   DELETE /api/projects/:projectId/files/:fileId

const express = require("express");
const projectStore = require("../lib/projectStore");
const { validateFile } = require("../validators/fileValidator");
const { uid } = require("../lib/uid");

const router = express.Router({ mergeParams: true });

async function loadProjectOr404(req, res) {
  const project = await projectStore.readProject(req.params.projectId);
  if (!project) {
    res.status(404).json({ errors: ["Project not found."] });
    return null;
  }
  return project;
}

router.get("/", async (req, res, next) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;
    res.json(project.files || []);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;

    const errors = validateFile(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const file = {
      id: uid(),
      fileName: req.body.fileName.trim(),
      driveLink: req.body.driveLink.trim(),
    };

    project.files = project.files || [];
    project.files.push(file);
    await projectStore.writeProject(project.id, project);

    res.status(201).json(file);
  } catch (err) {
    next(err);
  }
});

router.delete("/:fileId", async (req, res, next) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;

    const files = project.files || [];
    const filtered = files.filter((f) => f.id !== req.params.fileId);
    if (filtered.length === files.length) {
      return res.status(404).json({ errors: ["File not found."] });
    }

    project.files = filtered;
    await projectStore.writeProject(project.id, project);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
