// src/validators/workReferenceValidator.js
//
// Checks the Work References list (Settings -> Work References)
// before it's saved. Returns an array of human-readable error
// strings; an empty array means "valid".

function validateWorkReferences(list) {
  const errors = [];

  if (!Array.isArray(list)) {
    errors.push("Work references must be a list.");
    return errors;
  }

  list.forEach((ref, idx) => {
    const label = `Work reference ${idx + 1}`;
    if (!ref || typeof ref !== "object") {
      errors.push(`${label} is invalid.`);
      return;
    }
    if (!ref.projectName || !String(ref.projectName).trim()) {
      errors.push(`${label}: Project Name is required.`);
    }
    if (!ref.websiteUrl || !String(ref.websiteUrl).trim()) {
      errors.push(`${label}: Website URL is required.`);
    }
  });

  return errors;
}

module.exports = { validateWorkReferences };
