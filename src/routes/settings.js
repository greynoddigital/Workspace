// src/routes/settings.js
//
//   GET /api/settings  -> full settings object
//   PUT /api/settings   -> merge and save changes

const express = require("express");
const settingsStore = require("../lib/settingsStore");

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
    const updated = await settingsStore.updateSettings(req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
