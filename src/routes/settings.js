// src/routes/settings.js
//
//   GET /api/settings  -> full settings object
//   PUT /api/settings   -> merge and save changes

const express = require("express");
const settingsStore = require("../lib/settingsStore");
const { validateWorkReferences } = require("../validators/workReferenceValidator");
const { uid } = require("../lib/uid");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    res.json(await settingsStore.readSettings());
  } catch (err) {
    next(err);
  }
});

router.put("/", async (req, res, next) => {
  try {
    const body = { ...req.body };

    // Work References are optional to include in a PUT (the Settings
    // page always sends the full list, but other callers don't have
    // to). Only validate/sanitize when the field is actually present.
    if (body.workReferences !== undefined) {
      const errors = validateWorkReferences(body.workReferences);
      if (errors.length > 0) return res.status(400).json({ errors });

      body.workReferences = body.workReferences.map((ref) => ({
        id: ref.id || uid(), // defensively assign an id if the client didn't send one
        projectName: String(ref.projectName).trim(),
        websiteUrl: String(ref.websiteUrl).trim(),
        description: ref.description ? String(ref.description).trim() : "",
        displayOrder: ref.displayOrder === "" || ref.displayOrder === undefined || ref.displayOrder === null
          ? null
          : Number(ref.displayOrder),
      }));
    }

    const updated = await settingsStore.updateSettings(body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
