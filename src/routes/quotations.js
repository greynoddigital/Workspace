// src/routes/quotations.js
//
//   POST   /api/projects/:projectId/quotations           -> create a quotation
//   PUT    /api/projects/:projectId/quotations/:id        -> update (e.g. Drive link)
//   DELETE /api/projects/:projectId/quotations/:id
//   GET    /api/projects/:projectId/quotations/:id/pdf    -> download PDF

const express = require("express");
const projectStore = require("../lib/projectStore");
const settingsStore = require("../lib/settingsStore");
const githubStorage = require("../lib/githubStorage");
const { nextDocumentNumber } = require("../lib/documentNumbering");
const { uid } = require("../lib/uid");
const { quotationHtml } = require("../lib/pdf/templates/quotationTemplate");
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

    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ errors: ["At least one line item is required."] });
    }

    const settings = await settingsStore.readSettings();

    const quotation = {
      id: uid(),
      number: await nextDocumentNumber("quotation"),
      date: req.body.date || new Date().toISOString().slice(0, 10),
      clientName: req.body.clientName || project.clientName,
      projectName: req.body.projectName || project.projectName,
      items,
      terms: req.body.terms !== undefined ? req.body.terms : settings.defaultQuotationTerms,
      driveLink: "",
      createdAt: new Date().toISOString(),
    };

    const documents = await projectStore.readDocuments(project.id);
    documents.quotations.push(quotation);
    await projectStore.writeDocuments(project.id, documents);

    // Snapshot the individual document into the project's GitHub folder too.
    githubStorage.saveQuotation(project.id, quotation).catch((err) => {
      console.error("Failed to snapshot quotation to GitHub:", err);
    });

    res.status(201).json(quotation);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const project = await loadOr404(req, res);
    if (!project) return;

    const documents = await projectStore.readDocuments(project.id);
    const index = documents.quotations.findIndex((q) => q.id === req.params.id);
    if (index === -1) return res.status(404).json({ errors: ["Quotation not found."] });

    documents.quotations[index] = { ...documents.quotations[index], ...req.body, id: req.params.id };
    await projectStore.writeDocuments(project.id, documents);

    res.json(documents.quotations[index]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const project = await loadOr404(req, res);
    if (!project) return;

    const documents = await projectStore.readDocuments(project.id);
    const filtered = documents.quotations.filter((q) => q.id !== req.params.id);
    if (filtered.length === documents.quotations.length) {
      return res.status(404).json({ errors: ["Quotation not found."] });
    }

    documents.quotations = filtered;
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
  const quotation = documents.quotations.find((q) => q.id === req.params.id);
  if (!quotation) return res.status(404).json({ errors: ["Quotation not found."] });

  const settings = await settingsStore.readSettings();
  const html = quotationHtml(project, quotation, settings);

  try {
    const pdfBuffer = await htmlToPdfBuffer(html);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${quotation.number}.pdf"`);
    res.send(pdfBuffer);

    // Upload the generated PDF into the project's GitHub folder.
    githubStorage.savePdf(project.id, "quotation", quotation.number, pdfBuffer).catch((err) => {
      console.error("Failed to save quotation PDF to GitHub:", err);
    });
  } catch (err) {
    console.error("Failed to generate quotation PDF:", err);
    res.status(500).json({ errors: ["Failed to generate PDF."] });
  }
});

module.exports = router;
