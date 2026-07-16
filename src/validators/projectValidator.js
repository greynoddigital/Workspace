// src/validators/projectValidator.js
//
// Checks project fields before they are saved. Returns an array of
// human-readable error strings; an empty array means "valid".

function validateProject(fields) {
  const errors = [];

  if (!fields.projectName || !fields.projectName.trim()) {
    errors.push("Project name is required.");
  }
  if (!fields.clientName || !fields.clientName.trim()) {
    errors.push("Client name is required.");
  }
  if (fields.email && fields.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors.push("Email address is not valid.");
  }

  return errors;
}

module.exports = { validateProject };
