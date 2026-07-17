// src/lib/pdf/templates/quotationTemplate.js

const { wrapDocument, escapeHtml } = require("./layout");
const { formatCurrency, formatDate } = require("../../formatting");

// quotation.terms has historically been a single newline-separated
// string (the textarea in the Quotation modal saves it that way), but
// it may also come in as an array of line strings (e.g. an older/newer
// client, or a document snapshot edited by hand), or be missing
// entirely (undefined/null) if no terms were set. Normalize every one
// of those shapes into a plain array of trimmed, non-empty lines so
// the PDF renders correctly no matter how the record was stored.
function normalizeTermsLines(terms) {
  if (Array.isArray(terms)) {
    return terms.map((line) => String(line ?? "").trim()).filter(Boolean);
  }
  if (typeof terms === "string") {
    return terms
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

function quotationHtml(project, quotation, settings) {
  const items = quotation.items || [];
  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);

  const rows = items
    .map(
      (item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(item.name)}</td>
      <td class="text-right">${item.quantity}</td>
      <td class="text-right">${formatCurrency(item.price)}</td>
      <td class="text-right">${formatCurrency(Number(item.price) * Number(item.quantity))}</td>
    </tr>`
    )
    .join("");

  const termsLines = normalizeTermsLines(quotation.terms);

  const termsSection =
    termsLines.length > 0
      ? `
    <h2 class="section-title">Terms &amp; Conditions</h2>
    <ol style="font-size: 11px; color: #333; padding-left: 18px; margin: 0;">
      ${termsLines.map((line) => `<li style="margin-bottom: 4px;">${escapeHtml(line)}</li>`).join("")}
    </ol>
  `
      : "";

  const bodyHtml = `
    <div class="meta-grid">
      <div><span class="label">Client:</span> ${escapeHtml(quotation.clientName || project.clientName)}</div>
      <div><span class="label">Project:</span> ${escapeHtml(quotation.projectName || project.projectName)}</div>
      <div><span class="label">Email:</span> ${escapeHtml(project.email || "-")}</div>
      <div><span class="label">Phone:</span> ${escapeHtml(project.phone || "-")}</div>
    </div>

    <h2 class="section-title">Services Quoted</h2>
    <table>
      <thead>
        <tr><th>#</th><th>Service</th><th class="text-right">Qty</th><th class="text-right">Price</th><th class="text-right">Total</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <table class="totals-table" style="width: 260px; margin-left: auto;">
      <tr class="grand-total"><td>Total</td><td class="text-right">${formatCurrency(subtotal)}</td></tr>
    </table>

    ${termsSection}
  `;

  return wrapDocument({
    title: "Quotation",
    settings,
    bodyHtml,
    docNumber: quotation.number,
    docDate: formatDate(quotation.date),
    footerNote: "Thank you for choosing GreyNod Digital.",
  });
}

module.exports = { quotationHtml };
