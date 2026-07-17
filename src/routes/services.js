// src/routes/services.js
//
// Manages the list of services attached to a project.
//   GET    /api/projects/:projectId/services
//   POST   /api/projects/:projectId/services
//   PUT    /api/projects/:projectId/services/:serviceId
//   DELETE /api/projects/:projectId/services/:serviceId

const express = require("express");
const projectStore = require("../lib/projectStore");
const { validateService } = require("../validators/serviceValidator");
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
    res.json(project.services || []);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;

    const errors = validateService(req.body);
    if (errors.length > 0) return res.status(400).json({ errors });

    const service = {
      id: uid(),
      name: req.body.name.trim(),
      price: Number(req.body.price),
      quantity: Number(req.body.quantity),
      // Carried over from the service catalog (settings.services) at
      // the time the service is added to the project, so quotations
      // built from this project's services can show the full HSN/SAC
      // and description without having to look the catalog up again
      // later (and so it stays correct even if the catalog entry is
      // edited/removed afterwards).
      hsnSac: (req.body.hsnSac || "").trim(),
      description: req.body.description || "",
    };

    project.services = project.services || [];
    project.services.push(service);
    await projectStore.writeProject(project.id, project);

    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
});

router.put("/:serviceId", async (req, res, next) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;

    const services = project.services || [];
    const index = services.findIndex((s) => s.id === req.params.serviceId);
    if (index === -1) return res.status(404).json({ errors: ["Service not found."] });

    const merged = { ...services[index], ...req.body, id: services[index].id };
    const errors = validateService(merged);
    if (errors.length > 0) return res.status(400).json({ errors });

    merged.price = Number(merged.price);
    merged.quantity = Number(merged.quantity);
    services[index] = merged;
    project.services = services;
    await projectStore.writeProject(project.id, project);

    res.json(merged);
  } catch (err) {
    next(err);
  }
});

router.delete("/:serviceId", async (req, res, next) => {
  try {
    const project = await loadProjectOr404(req, res);
    if (!project) return;

    const services = project.services || [];
    const filtered = services.filter((s) => s.id !== req.params.serviceId);
    if (filtered.length === services.length) {
      return res.status(404).json({ errors: ["Service not found."] });
    }

    project.services = filtered;
    await projectStore.writeProject(project.id, project);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
