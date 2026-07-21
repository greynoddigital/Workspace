// src/validators/documentNumberValidator.js
//
// Validates a manually-edited document number (Quotation / Invoice /
// Checklist "Number" field) before it is saved. This only guards the
// user-facing field - it has nothing to do with the internal
// auto-numbering counters in documentNumbering.js / githubStorage.js,
// which keep advancing independently of whatever value ends up here.

const MAX_LENGTH = 40;

/**
 * Returns an array of human-readable error strings; an empty array
 * means "valid". Only called when req.body.number is present, so a
 * PUT that doesn't touch the number field never runs this.
 */
function validateDocumentNumber(number) {
  const errors = [];

  if (typeof number !== "string" || !number.trim()) {
    errors.push("Document number cannot be empty.");
    return errors;
  }

  if (number.trim().length > MAX_LENGTH) {
    errors.push(`Document number cannot be longer than ${MAX_LENGTH} characters.`);
  }

  return errors;
}

module.exports = { validateDocumentNumber };
