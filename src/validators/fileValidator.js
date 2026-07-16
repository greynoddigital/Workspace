// src/validators/fileValidator.js

function validateFile(fields) {
  const errors = [];

  if (!fields.fileName || !fields.fileName.trim()) {
    errors.push("File name is required.");
  }
  if (!fields.driveLink || !fields.driveLink.trim()) {
    errors.push("Google Drive link is required.");
  }

  return errors;
}

module.exports = { validateFile };
