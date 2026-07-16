// src/routes/invoices.js
//
//   POST   /api/projects/:projectId/invoices          -> generate invoice from selected payments
//   PUT    /api/projects/:projectId/invoices/:id       -> update (e.g. Drive link)
//   DELETE /api/projects/:projectId/invoices/:id
//   GET    /api/projects/:projectId/invoices/:id/pdf

const express = require("express");
const projectStore = require("../lib/projectStore");
const settingsStore = require("../lib/settingsStore");
const githubStorage = require("../lib/githubStorage");
const { nextDocumentNumber } = require("../lib/documentNumbering");
const { uid } = require("../lib/uid");
const { determineInvoiceType } = require("../lib/invoiceLogic");
const { projectValue, totalPaid } = require("../lib/calculations");
const { invoiceHtml } = require("../lib/pdf/templates/invoiceTemplate");
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

// Generate a new invoice covering the payments listed in req.body.paymentIds.
// If paymentIds is omitted, every payment not yet included in an invoice is used.
router.post("/", async (req, res, next) => {
  try {
    const project = await loadOr404(req, res);
    if (!project) return;

    const payments = project.payments || [];
    const unbilled = payments.filter((p) => !p.invoicedInInvoiceId);
    const requestedIds = Array.isArray(req.body.paymentIds) ? req.body.paymentIds : null;

    const paymentsToInvoice = requestedIds
      ? payments.filter((p) => requestedIds.includes(p.id) && !p.invoicedInInvoiceId)
      : unbilled;

    if (paymentsToInvoice.length === 0) {
      return res.status(400).json({ errors: ["No unbilled payments available to invoice."] });
    }

    const documents = await projectStore.readDocuments(project.id);
    const { type, includeThankYou, pendingAfter } = determineInvoiceType(project, documents.invoices.length);

    const amount = paymentsToInvoice.reduce((sum, p) => sum + Number(p.amount), 0);
    const invoiceId = uid();

    const invoice = {
      id: invoiceId,
      number: await nextDocumentNumber("invoice"),
      date: req.body.date || new Date().toISOString().slice(0, 10),
      type,
      includeThankYou,
      amount,
      projectTotal: projectValue(project),
      paidToDate: totalPaid(project),
      pendingAfter,
      payments: paymentsToInvoice.map((p) => ({ ...p })), // snapshot
      driveLink: "",
      createdAt: new Date().toISOString(),
    };

    documents.invoices.push(invoice);
    await projectStore.writeDocuments(project.id, documents);

    // Mark the included payments as invoiced so they aren't billed twice.
    project.payments = payments.map((p) =>
      paymentsToInvoice.some((included) => included.id === p.id) ? { ...p, invoicedInInvoiceId: invoiceId } : p
    );
    await projectStore.writeProject(project.id, project);

    githubStorage.saveInvoice(project.id, invoice).catch((err) => {
      console.error("Failed to snapshot invoice to GitHub:", err);
    });

    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const project = await loadOr404(req, res);
    if (!project) return;

    const documents = await projectStore.readDocuments(project.id);
    const index = documents.invoices.findIndex((inv) => inv.id === req.params.id);
    if (index === -1) return res.status(404).json({ errors: ["Invoice not found."] });

    documents.invoices[index] = { ...documents.invoices[index], ...req.body, id: req.params.id };
    await projectStore.writeDocuments(project.id, documents);

    res.json(documents.invoices[index]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const project = await loadOr404(req, res);
    if (!project) return;

    const documents = await projectStore.readDocuments(project.id);
    const invoice = documents.invoices.find((inv) => inv.id === req.params.id);
    if (!invoice) return res.status(404).json({ errors: ["Invoice not found."] });

    documents.invoices = documents.invoices.filter((inv) => inv.id !== req.params.id);
    await projectStore.writeDocuments(project.id, documents);

    // Un-mark the payments so they become billable again.
    project.payments = (project.payments || []).map((p) =>
      p.invoicedInInvoiceId === invoice.id ? { ...p, invoicedInInvoiceId: null } : p
    );
    await projectStore.writeProject(project.id, project);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/pdf", async (req, res) => {
  const project = await loadOr404(req, res);
  if (!project) return;

  const documents = await projectStore.readDocuments(project.id);
  const invoice = documents.invoices.find((inv) => inv.id === req.params.id);
  if (!invoice) return res.status(404).json({ errors: ["Invoice not found."] });

  const settings = await settingsStore.readSettings();
  const html = invoiceHtml(project, invoice, settings);

  try {
    const pdfBuffer = await htmlToPdfBuffer(html);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoice.number}.pdf"`);
    res.send(pdfBuffer);

    githubStorage.savePdf(project.id, "invoice", invoice.number, pdfBuffer).catch((err) => {
      console.error("Failed to save invoice PDF to GitHub:", err);
    });
  } catch (err) {
    console.error("Failed to generate invoice PDF:", err);
    res.status(500).json({ errors: ["Failed to generate PDF."] });
  }
});

module.exports = router;
