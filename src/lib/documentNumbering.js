// src/lib/documentNumbering.js
//
// Generates sequential document numbers for Quotations, Checklists,
// and Invoices, in the format PREFIX-YYYY-NNNN (e.g. QT-2026-0001).
// Counters live in counters/counters.json in the GitHub data repo
// (one of the required "Read -> Increment -> Commit -> Return" counters),
// so numbering survives restarts and never repeats.

const githubStorage = require("./githubStorage");

const PREFIXES = {
  quotation: "QT",
  checklist: "CL",
  invoice: "INV",
};

/**
 * Reserves and returns the next document number for the given kind
 * ("quotation" | "checklist" | "invoice").
 */
async function nextDocumentNumber(kind) {
  if (!PREFIXES[kind]) {
    throw new Error(`Unknown document kind: ${kind}`);
  }

  const year = new Date().getFullYear();
  const seq = await githubStorage.reserveNextNumber(kind, year);
  return `${PREFIXES[kind]}-${year}-${String(seq).padStart(4, "0")}`;
}

module.exports = { nextDocumentNumber };
