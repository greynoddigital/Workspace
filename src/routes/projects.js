// src/routes/projects.js
//
// Core project routes:
//   GET    /api/projects        -> list all projects
//   POST   /api/projects        -> create a project
//   GET    /api/projects/:id    -> get one project
//   PUT    /api/projects/:id    -> update project fields
//   DELETE /api/projects/:id    -> delete a project entirely

const express = require("express");
const projectStore = require("../lib/projectStore");
const { validateProject } = require("../validators/projectValidator");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    res.json(await projectStore.listProjectsSorted());
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const errors = validateProject(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    const project = await projectStore.createProject(req.body);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const project = await projectStore.readProject(req.params.id);
    if (!project) return res.status(404).json({ errors: ["Project not found."] });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const existing = await projectStore.readProject(req.params.id);
    if (!existing) return res.status(404).json({ errors: ["Project not found."] });

    const errors = validateProject({ ...existing, ...req.body });
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const updated = await projectStore.updateProject(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await projectStore.deleteProject(req.params.id);
    if (!deleted) return res.status(404).json({ errors: ["Project not found."] });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
