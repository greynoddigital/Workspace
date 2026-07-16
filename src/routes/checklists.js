// src/routes/checklists.js
//
//   POST   /api/projects/:projectId/checklists
//   PUT    /api/projects/:projectId/checklists/:id
//   DELETE /api/projects/:projectId/checklists/:id
//   GET    /api/projects/:projectId/checklists/:id/pdf

const express = require("express");
const projectStore = require("../lib/projectStore");
const settingsStore = require("../lib/settingsStore");
const githubStorage = require("../lib/githubStorage");
const { nextDocumentNumber } = require("../lib/documentNumbering");
const { uid } = require("../lib/uid");
const { checklistHtml } = require("../lib/pdf/templates/checklistTemplate");
const { htmlToPdfBuffer } = require("../lib/pdf/pdfGenerator");

const router = express.Router({ mergeParams: true });

async function loadOr404(req, res) {
  const project = await projectStore.readProject(req.params.projectId);
  if (!project) {
    res.status(404).json({ errors: ["Project not found."] });
    return null;
  }
  return project;
}

router.post("/", async (req, res, next) => {
  try {
    const project = await loadOr404(req, res);
    if (!project) return;

    const checklist = {
      id: uid(),
      number: await nextDocumentNumber("checklist"),
      date: req.body.date || new Date().toISOString().slice(0, 10),
      categories: req.body.categories || {},
      customItems: req.body.customItems || [],
      driveLink: "",
      createdAt: new Date().toISOString(),
    };

    const documents = await projectStore.readDocuments(project.id);
    documents.checklists.push(checklist);
    await projectStore.writeDocuments(project.id, documents);

    githubStorage.saveChecklist(project.id, checklist).catch((err) => {
      console.error("Failed to snapshot checklist to GitHub:", err);
    });

    res.status(201).json(checklist);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const project = await loadOr404(req, res);
    if (!project) return;

    const documents = await projectStore.readDocuments(project.id);
    const index = documents.checklists.findIndex((c) => c.id === req.params.id);
    if (index === -1) return res.status(404).json({ errors: ["Checklist not found."] });

    documents.checklists[index] = { ...documents.checklists[index], ...req.body, id: req.params.id };
    await projectStore.writeDocuments(project.id, documents);

    res.json(documents.checklists[index]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const project = await loadOr404(req, res);
    if (!project) return;

    const documents = await projectStore.readDocuments(project.id);
    const filtered = documents.checklists.filter((c) => c.id !== req.params.id);
    if (filtered.length === documents.checklists.length) {
      return res.status(404).json({ errors: ["Checklist not found."] });
    }

    documents.checklists = filtered;
    await projectStore.writeDocuments(project.id, documents);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/pdf", async (req, res) => {
  const project = await loadOr404(req, res);
  if (!project) return;

  const documents = await projectStore.readDocuments(project.id);
  const checklist = documents.checklists.find((c) => c.id === req.params.id);
  if (!checklist) return res.status(404).json({ errors: ["Checklist not found."] });

  const settings = await settingsStore.readSettings();
  const html = checklistHtml(project, checklist, settings);

  try {
    const pdfBuffer = await htmlToPdfBuffer(html);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${checklist.number}.pdf"`);
    res.send(pdfBuffer);

    githubStorage.savePdf(project.id, "checklist", checklist.number, pdfBuffer).catch((err) => {
      console.error("Failed to save checklist PDF to GitHub:", err);
    });
  } catch (err) {
    console.error("Failed to generate checklist PDF:", err);
    res.status(500).json({ errors: ["Failed to generate PDF."] });
  }
});

module.exports = router;
