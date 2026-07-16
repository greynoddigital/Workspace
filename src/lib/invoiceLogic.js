// src/lib/invoiceLogic.js
//
// Decides what *type* of invoice to generate (Advance / Final /
// Full Payment) based on the project's payment history so far.
// This is the one place that encodes that rule, so it can't drift
// between the API route and anywhere else that might need it.

const { projectValue, totalPaid } = require("./calculations");

/**
 * @param {object} project - the project this invoice belongs to
 * @param {number} priorInvoiceCount - how many invoices already exist for this project
 * @returns {{ type: string, includeThankYou: boolean, pendingAfter: number }}
 */
function determineInvoiceType(project, priorInvoiceCount) {
  const total = projectValue(project);
  const paid = totalPaid(project);
  const pendingAfter = Math.max(0, total - paid);
  const isFullyPaid = pendingAfter <= 0;

  let type;
  if (priorInvoiceCount === 0 && isFullyPaid) {
    type = "Full Payment Invoice";
  } else if (isFullyPaid) {
    type = "Final Invoice";
  } else {
    type = "Advance Invoice";
  }

  return { type, includeThankYou: isFullyPaid, pendingAfter };
}

module.exports = { determineInvoiceType };
