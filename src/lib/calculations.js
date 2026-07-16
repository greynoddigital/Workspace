// src/lib/calculations.js
//
// Pure functions for computing totals. No GST, no side effects,
// no file access - just numbers in, numbers out. Kept separate so
// the same logic can be used by the API, the PDF templates, and
// (if needed later) tests.

/** Total value of a single service line: price * quantity. */
function serviceTotal(service) {
  const price = Number(service.price) || 0;
  const quantity = Number(service.quantity) || 0;
  return price * quantity;
}

/** Sum of all service line totals for a project. */
function projectValue(project) {
  const services = project.services || [];
  return services.reduce((sum, s) => sum + serviceTotal(s), 0);
}

/** Sum of all payments received for a project. */
function totalPaid(project) {
  const payments = project.payments || [];
  return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

/** Amount still owed on a project. */
function totalPending(project) {
  return Math.max(0, projectValue(project) - totalPaid(project));
}

/** Convenience: { total, paid, pending } for a single project. */
function projectTotals(project) {
  const total = projectValue(project);
  const paid = totalPaid(project);
  return { total, paid, pending: Math.max(0, total - paid) };
}

module.exports = {
  serviceTotal,
  projectValue,
  totalPaid,
  totalPending,
  projectTotals,
};
