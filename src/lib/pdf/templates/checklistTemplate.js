// src/lib/pdf/templates/checklistTemplate.js
//
// The checklist PDF is meant to be the shortest possible list of
// things the client still needs to send - so it shows ONLY items
// that were checked (selected) while building the checklist, and
// skips any category that ends up with nothing selected in it.
// Every shown item renders as an empty box (☐), because the client
// ticks it by hand on the printed/shared document - "checked" here
// just means "this item is relevant", not "already done".

const { wrapDocument, escapeHtml } = require("./layout");
const { formatDate } = require("../../formatting");

// Canonical category order, regardless of what order they happen to
// be stored in on a given checklist record.
const CATEGORY_ORDER = [
  "Business Information",
  "Branding",
  "Business Documents",
  "Domain",
  "Hosting",
  "Products",
  "Payment Gateway",
  "Shipping",
  "Social Media",
  "Content",
];

function orderedCategoryNames(categories) {
  const known = CATEGORY_ORDER.filter((name) => Object.prototype.hasOwnProperty.call(categories, name));
  const extra = Object.keys(categories).filter((name) => !CATEGORY_ORDER.includes(name));
  return [...known, ...extra];
}

function renderItemRows(items) {
  return items
    .map(
      (item) => `
      <tr>
        <td style="width: 22px; text-align: center;">☐</td>
        <td>${escapeHtml(item.label)}</td>
      </tr>`
    )
    .join("");
}

function checklistHtml(project, checklist, settings) {
  const categories = checklist.categories || {};

  const sections = orderedCategoryNames(categories)
    .map((categoryName) => {
      const selected = (categories[categoryName] || []).filter((item) => item.checked);
      if (selected.length === 0) return ""; // hide empty categories entirely
      return `
        <h2 class="section-title">${escapeHtml(categoryName)}</h2>
        <table><tbody>${renderItemRows(selected)}</tbody></table>
      `;
    })
    .join("");

  const selectedCustomItems = (checklist.customItems || []).filter((item) => item.checked && item.label && item.label.trim());
  const customSection =
    selectedCustomItems.length > 0
      ? `
        <h2 class="section-title">Custom Items</h2>
        <table><tbody>${renderItemRows(selectedCustomItems)}</tbody></table>
      `
      : "";

  const bodyHtml = `
    <div class="meta-grid">
      <div><span class="label">Client:</span> ${escapeHtml(project.clientName)}</div>
      <div><span class="label">Project:</span> ${escapeHtml(project.projectName)}</div>
    </div>
    ${sections}
    ${customSection}
  `;

  return wrapDocument({
    title: "Checklist",
    settings,
    bodyHtml,
    docNumber: checklist.number,
    docDate: formatDate(checklist.date),
  });
}

module.exports = { checklistHtml };
