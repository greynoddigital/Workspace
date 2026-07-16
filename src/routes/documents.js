// src/routes/documents.js
//
// GET /api/projects/:projectId/documents
// Returns every generated document (quotations, checklists, invoices)
// for a project in one response - used by the Documents tab.

const express = require("express");
const projectStore = require("../lib/projectStore");

const router = express.Router({ mergeParams: true });

router.get("/", async (req, res, next) => {
  try {
    if (!(await projectStore.exists(req.params.projectId))) {
      return res.status(404).json({ errors: ["Project not found."] });
    }
    res.json(await projectStore.readDocuments(req.params.projectId));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
