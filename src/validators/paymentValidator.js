// src/validators/paymentValidator.js

function validatePayment(fields) {
  const errors = [];

  if (!fields.date) {
    errors.push("Payment date is required.");
  }
  if (fields.amount === undefined || fields.amount === null || isNaN(Number(fields.amount)) || Number(fields.amount) <= 0) {
    errors.push("Amount must be a valid number greater than 0.");
  }
  if (!fields.method || !fields.method.trim()) {
    errors.push("Payment method is required.");
  }

  return errors;
}

module.exports = { validatePayment };
