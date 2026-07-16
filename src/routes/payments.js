// src/routes/payments.js
//
// Manages payments received against a project.
//   GET    /api/projects/:projectId/payments
//   POST   /api/projects/:projectId/payments
//   PUT    /api/projects/:projectId/payments/:paymentId
//   DELETE /api/projects/:projectId/payments/:paymentId

const express = require("express");
const projectStore = require("../lib/projectStore");
const { validatePayment } = require("../validators/paymentValidator");
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
    res.json(project.payments || []);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;

    const errors = validatePayment(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const payment = {
      id: uid(),
      date: req.body.date,
      amount: Number(req.body.amount),
      method: req.body.method.trim(),
      reference: (req.body.reference || "").trim(),
      notes: (req.body.notes || "").trim(),
      invoicedInInvoiceId: null, // set once this payment is included in an invoice
    };

    project.payments = project.payments || [];
    project.payments.push(payment);
    await projectStore.writeProject(project.id, project);

    res.status(201).json(payment);
  } catch (err) {
    next(err);
  }
});

router.put("/:paymentId", async (req, res, next) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;

    const payments = project.payments || [];
    const index = payments.findIndex((p) => p.id === req.params.paymentId);
    if (index === -1) return res.status(404).json({ errors: ["Payment not found."] });

    const merged = { ...payments[index], ...req.body, id: payments[index].id };
    const errors = validatePayment(merged);
    if (errors.length > 0) return res.status(400).json({ errors });

    merged.amount = Number(merged.amount);
    payments[index] = merged;
    project.payments = payments;
    await projectStore.writeProject(project.id, project);

    res.json(merged);
  } catch (err) {
    next(err);
  }
});

router.delete("/:paymentId", async (req, res, next) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;

    const payments = project.payments || [];
    const filtered = payments.filter((p) => p.id !== req.params.paymentId);
    if (filtered.length === payments.length) {
      return res.status(404).json({ errors: ["Payment not found."] });
    }

    project.payments = filtered;
    await projectStore.writeProject(project.id, project);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
