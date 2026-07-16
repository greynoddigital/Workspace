// src/lib/uid.js
//
// Generates short unique IDs for things stored inside arrays
// (services, payments, files, checklist items, etc). Uses Node's
// built-in crypto - no extra dependency needed.

const crypto = require("crypto");

function uid() {
  return crypto.randomUUID();
}

module.exports = { uid };
