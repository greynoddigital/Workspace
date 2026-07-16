// src/routes/notes.js
//
// Free-form markdown notes for a project, stored as notes.md.
//   GET /api/projects/:projectId/notes  -> { content: "..." }
//   PUT /api/projects/:projectId/notes  -> { content: "..." }

const express = require("express");
const projectStore = require("../lib/projectStore");

const router = express.Router({ mergeParams: true });

router.get("/", async (req, res, next) => {
  try {
    if (!(await projectStore.exists(req.params.projectId))) {
      return res.status(404).json({ errors: ["Project not found."] });
    }
    res.json({ content: await projectStore.readNotes(req.params.projectId) });
  } catch (err) {
    next(err);
  }
});

router.put("/", async (req, res, next) => {
  try {
    if (!(await projectStore.exists(req.params.projectId))) {
      return res.status(404).json({ errors: ["Project not found."] });
    }
    const content = req.body.content ?? "";
    await projectStore.writeNotes(req.params.projectId, content);
    res.json({ content });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
