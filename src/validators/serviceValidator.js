// src/validators/serviceValidator.js

function validateService(fields) {
  const errors = [];

  if (!fields.name || !fields.name.trim()) {
    errors.push("Service name is required.");
  }
  if (fields.price === undefined || fields.price === null || isNaN(Number(fields.price)) || Number(fields.price) < 0) {
    errors.push("Price must be a valid, non-negative number.");
  }
  if (fields.quantity === undefined || fields.quantity === null || isNaN(Number(fields.quantity)) || Number(fields.quantity) <= 0) {
    errors.push("Quantity must be a valid number greater than 0.");
  }

  return errors;
}

module.exports = { validateService };
