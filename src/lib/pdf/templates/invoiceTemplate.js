// src/lib/pdf/templates/invoiceTemplate.js

const { wrapDocument, escapeHtml } = require("./layout");
const { formatCurrency, formatDate, amountToWords } = require("../../formatting");
const { serviceTotal } = require("../../calculations");

function invoiceHtml(project, invoice, settings) {
  const payments = invoice.payments || []; // snapshot of included payments
  const services = project.services || [];

  const serviceRows = services
    .map(
      (s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(s.name)}</td>
      <td class="text-right">${Number(s.quantity)}</td>
      <td class="text-right">${formatCurrency(s.price)}</td>
      <td class="text-right">${formatCurrency(serviceTotal(s))}</td>
    </tr>`
    )
    .join("");

  const rows = payments
    .map(
      (p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${formatDate(p.date)}</td>
      <td>${escapeHtml(p.method)}</td>
      <td>${escapeHtml(p.reference || "-")}</td>
      <td class="text-right">${formatCurrency(p.amount)}</td>
    </tr>`
    )
    .join("");

  const thankYouBlock = invoice.includeThankYou
    ? `
    <div class="thank-you-box">
      <div class="title">THANK YOU</div>
      <div>Thank you for your business. This invoice confirms full payment has been received for this project.</div>
    </div>`
    : "";

  const bodyHtml = `
    <h2 class="section-title">Client Information</h2>
    <div class="meta-grid">
      <div><span class="label">Client:</span> ${escapeHtml(project.clientName)}</div>
      <div><span class="label">Project:</span> ${escapeHtml(project.projectName)}</div>
      <div><span class="label">Invoice Type:</span> ${escapeHtml(invoice.type)}</div>
      <div><span class="label">Email:</span> ${escapeHtml(project.email || "-")}</div>
    </div>

    <h2 class="section-title">Services</h2>
    <table>
      <thead>
        <tr><th>#</th><th>Service</th><th class="text-right">Quantity</th><th class="text-right">Unit Price</th><th class="text-right">Line Total</th></tr>
      </thead>
      <tbody>${serviceRows}</tbody>
    </table>
    <table class="totals-table" style="width: 300px; margin-left: auto;">
      <tr class="grand-total"><td>Project Total</td><td class="text-right">${formatCurrency(invoice.projectTotal)}</td></tr>
    </table>

    <h2 class="section-title">Payments Included</h2>
    <table>
      <thead><tr><th>#</th><th>Date</th><th>Method</th><th>Reference</th><th class="text-right">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <h2 class="section-title">Financial Summary</h2>
    <table class="totals-table" style="width: 300px; margin-left: auto;">
      <tr><td>Project Total</td><td class="text-right">${formatCurrency(invoice.projectTotal)}</td></tr>
      <tr><td>Paid To Date</td><td class="text-right">${formatCurrency(invoice.paidToDate)}</td></tr>
      <tr class="grand-total"><td>Balance Pending</td><td class="text-right">${formatCurrency(invoice.pendingAfter)}</td></tr>
    </table>

    <div style="margin-top: 6px; font-size: 11px; color: #444;">
      Amount received (this invoice): ${amountToWords(invoice.amount)}
    </div>

    ${thankYouBlock}
  `;

  return wrapDocument({
    title: invoice.type || "Invoice",
    settings,
    bodyHtml,
    docNumber: invoice.number,
    docDate: formatDate(invoice.date),
  });
}

module.exports = { invoiceHtml };
