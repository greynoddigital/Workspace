// src/lib/idGenerator.js
//
// Generates project IDs in the format GN-YYYY-NNNN, e.g. GN-2026-0001.
// The sequence is tracked in counters/counters.json in the GitHub data
// repo (kind: "projects"), reserved atomically so two projects created
// back-to-back never collide.

const githubStorage = require("./githubStorage");

async function nextProjectId() {
  const year = new Date().getFullYear();
  const seq = await githubStorage.reserveNextNumber("projects", year);
  return `GN-${year}-${String(seq).padStart(4, "0")}`;
}

module.exports = { nextProjectId };
