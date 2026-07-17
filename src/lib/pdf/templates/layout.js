// src/lib/pdf/templates/layout.js
//
// Wraps a document's body HTML with a shared <head> (styles), a
// header (company name, address, contact info + logo), and a footer
// (contact info + stamp, optionally followed by a "Scan & Pay"
// block). Every PDF template (quotation, checklist, invoice) uses
// this function so all documents look consistent and always carry
// the same company footer. The company footer (logo/stamp, website,
// email, phone) always renders; the Scan & Pay block is opt-in per
// call via showScanAndPay (default true) since not every document
// type should ask the client to pay - e.g. checklistTemplate.js
// passes showScanAndPay: false because a checklist is a
// completion/verification document, not a bill.
//
// There is no signature and no bank details anywhere in this app
// (v2.1). Logo, stamp, and the Scan & Pay QR code are fixed
// application assets - see src/lib/brandAssets.js. The UPI ID shown
// alongside the QR code comes from Settings (settings.upiId) and is
// always read fresh, so changing it in Settings updates every PDF
// generated afterwards.

const { getLogoDataUri, getStampDataUri, getQrDataUri } = require("../../brandAssets");

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

const SHARED_STYLES = `
  * { box-sizing: border-box; }
  body {
    font-family: "Courier New", monospace;
    color: #111;
    font-size: 12px;
    line-height: 1.5;
    margin: 0;
    padding: 0;
  }
  .doc-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid #222;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .doc-header .brand-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .doc-header .logo-img {
    max-height: 46px;
    max-width: 160px;
  }
  .doc-header .company-name {
    font-size: 18px;
    font-weight: bold;
    letter-spacing: 1px;
  }
  .doc-header .company-meta {
    font-size: 11px;
    color: #444;
    margin-top: 4px;
  }
  .doc-header .doc-title {
    text-align: right;
  }
  .doc-header .doc-title h1 {
    font-size: 16px;
    margin: 0 0 4px 0;
    letter-spacing: 1px;
  }
  .doc-header .doc-title div {
    font-size: 11px;
    color: #444;
  }
  h2.section-title {
    font-size: 13px;
    border-bottom: 1px solid #ccc;
    padding-bottom: 4px;
    margin: 20px 0 10px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
  }
  table th, table td {
    border: 1px solid #ccc;
    padding: 6px 8px;
    text-align: left;
    font-size: 11.5px;
  }
  table th {
    background: #f5f5f5;
    font-weight: bold;
  }
  .text-right { text-align: right; }
  .item-name { font-weight: bold; }
  .item-details {
    margin-top: 4px;
  }
  .item-hsn {
    font-size: 10.5px;
    color: #555;
    margin-bottom: 3px;
  }
  .item-description {
    font-size: 10.5px;
    color: #333;
    white-space: pre-wrap;
    line-height: 1.5;
  }
  .totals-table td { border: none; padding: 3px 8px; }
  .totals-table .grand-total td {
    border-top: 1px solid #222;
    font-weight: bold;
    font-size: 13px;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 20px;
    margin-bottom: 16px;
    font-size: 11.5px;
  }
  .meta-grid .label { color: #555; }
  .doc-footer {
    margin-top: 30px;
    padding-top: 12px;
    border-top: 1px solid #ccc;
  }
  .doc-footer .thank-you-note {
    font-size: 12px;
    font-weight: bold;
    margin-bottom: 10px;
  }
  .doc-footer .footer-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .doc-footer .contact-info {
    font-size: 10.5px;
    color: #555;
    line-height: 1.6;
  }
  .stamp-img {
    max-height: 90px;
    max-width: 90px;
  }
  .thank-you-box {
    margin-top: 20px;
    padding: 14px;
    border: 1px solid #222;
    text-align: center;
  }
  .thank-you-box .title {
    font-size: 14px;
    font-weight: bold;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }
  a { color: inherit; text-decoration: underline; }
  .scan-and-pay {
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px dashed #999;
    text-align: center;
  }
  .scan-and-pay .title {
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .scan-and-pay .qr-img {
    display: block;
    margin: 0 auto 8px auto;
    width: 110px;
    height: 110px;
  }
  .scan-and-pay .upi-label {
    font-size: 10px;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .scan-and-pay .upi-id {
    font-size: 12px;
    font-weight: bold;
  }
`;

function emailLink(email) {
  if (!email) return "";
  const safe = escapeHtml(email);
  return `<a href="mailto:${safe}">${safe}</a>`;
}

function websiteLink(website) {
  if (!website) return "";
  const safe = escapeHtml(website);
  return `<a href="${safe}">${safe}</a>`;
}

function wrapDocument({ title, settings, bodyHtml, docNumber, docDate, footerNote, showScanAndPay = true }) {
  const company = settings.company || {};
  const upiId = settings.upiId || "";
  const logo = getLogoDataUri();
  const stamp = getStampDataUri();
  const qr = getQrDataUri();

  const scanAndPay =
    showScanAndPay && (qr || upiId)
      ? `
  <div class="scan-and-pay">
    <div class="title">Scan &amp; Pay</div>
    ${qr ? `<img class="qr-img" src="${qr}" />` : ""}
    ${
      upiId
        ? `<div class="upi-label">UPI ID</div><div class="upi-id">${escapeHtml(upiId)}</div>`
        : ""
    }
  </div>`
      : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${SHARED_STYLES}</style>
</head>
<body>
  <div class="doc-header">
    <div class="brand-row">
      ${logo ? `<img class="logo-img" src="${logo}" />` : ""}
      <div>
        <div class="company-name">${escapeHtml(company.name || "GreyNod Digital")}</div>
        <div class="company-meta">
          ${escapeHtml(company.address || "")}<br/>
          ${emailLink(company.email)}${company.email && company.phone ? " · " : ""}${escapeHtml(company.phone || "")}
        </div>
      </div>
    </div>
    <div class="doc-title">
      <h1>${escapeHtml(title)}</h1>
      <div>No: ${escapeHtml(docNumber || "-")}</div>
      <div>Date: ${escapeHtml(docDate || "-")}</div>
    </div>
  </div>

  ${bodyHtml}

  <div class="doc-footer">
    ${footerNote ? `<div class="thank-you-note">${escapeHtml(footerNote)}</div>` : ""}
    <div class="footer-row">
      <div class="contact-info">
        ${company.website ? websiteLink(company.website) + "<br/>" : ""}
        ${emailLink(company.email)}${company.email && company.phone ? " · " : ""}${escapeHtml(company.phone || "")}
      </div>
      ${stamp ? `<img class="stamp-img" src="${stamp}" />` : ""}
    </div>
    ${scanAndPay}
  </div>
</body>
</html>`;
}

module.exports = { wrapDocument, escapeHtml };
