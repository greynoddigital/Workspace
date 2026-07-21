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

// Renders the HSN/SAC line and the full description block under a
// quotation item's name, exactly as they're stored: line breaks,
// bullet points, blank lines and indentation are all preserved
// verbatim (via white-space: pre-wrap in the shared stylesheet -
// escapeHtml() only escapes HTML-special characters, it never
// touches whitespace). Either piece is simply omitted - with no
// leftover spacing - when the item doesn't have it, since not every
// service has an HSN/SAC or a description on file.
function serviceDetailHtml(item) {
  const hsnSac = (item.hsnSac || "").trim();
  const description = (item.description || "").trim();

  const hsnHtml = hsnSac ? `<div class="item-hsn">(HSN/SAC: ${escapeHtml(hsnSac)})</div>` : "";
  const descriptionHtml = description ? `<div class="item-description">${escapeHtml(description)}</div>` : "";

  if (!hsnHtml && !descriptionHtml) return "";
  return `<div class="item-details">${hsnHtml}${descriptionHtml}</div>`;
}

// Reference website URLs are typed freehand in Settings (e.g. someone
// may type "essalgroup.ae" without "https://"). A bare domain like
// that would render as a broken relative link, so we prefix a scheme
// for the href while still displaying the text exactly as saved.
function workReferenceLink(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return `<a href="${escapeHtml(href)}">${escapeHtml(trimmed)}</a>`;
}

// Builds the "Our Previous Work" section from the quotation's saved
// Work References snapshot (quotation.workReferences - see
// src/lib/workReferenceSnapshot.js). Entirely omitted when there's no
// snapshot or it's empty, e.g. every quotation generated before this
// feature existed, or one where no references were selected -
// nothing in the layout changes for those. Only quotationTemplate.js
// renders this; invoice and checklist PDFs are untouched.
//
// The <style> block is scoped to this section (wr- prefixed classes,
// only ever emitted here) rather than added to the shared stylesheet
// in layout.js, so it can never affect Invoice/Checklist PDFs even
// indirectly.
function workReferencesHtml(workReferences) {
  const refs = Array.isArray(workReferences) ? workReferences : [];
  if (refs.length === 0) return "";

  const items = refs
    .map(
      (ref) => `
    <div class="wr-item">
      <div class="wr-name">${escapeHtml(ref.projectName)}</div>
      ${ref.websiteUrl ? `<div class="wr-url">${workReferenceLink(ref.websiteUrl)}</div>` : ""}
      ${ref.description ? `<div class="wr-description">${escapeHtml(ref.description)}</div>` : ""}
    </div>`
    )
    .join("");

  return `
    <style>
      .wr-item { border-top: 1px solid #ccc; padding: 10px 0; }
      .wr-item:last-child { padding-bottom: 0; }
      .wr-name { font-weight: bold; font-size: 12px; }
      .wr-url { font-size: 11px; margin-top: 2px; }
      .wr-description { font-size: 10.5px; color: #333; margin-top: 3px; white-space: pre-wrap; line-height: 1.5; }
    </style>
    <h2 class="section-title">Our Previous Work</h2>
    <div class="wr-list">${items}</div>
  `;
}

function quotationHtml(project, quotation, settings) {
  const items = quotation.items || [];
  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);

  const rows = items
    .map(
      (item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <div class="item-name">${escapeHtml(item.name)}</div>
        ${serviceDetailHtml(item)}
      </td>
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

    ${workReferencesHtml(quotation.workReferences)}
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
