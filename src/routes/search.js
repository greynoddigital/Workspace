// src/routes/search.js
//
// GET /api/search?q=... -> matching projects

const express = require("express");
const { searchProjects } = require("../lib/search");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    res.json(await searchProjects(req.query.q));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
