// src/lib/settingsStore.js
//
// Everything related to reading and writing the single settings
// object, now stored at settings/settings.json in the GitHub data
// repo instead of workspace-data/settings/settings.json.
//
// settings.json holds:
//   - company info
//   - the UPI ID used for "Scan & Pay" on generated PDFs
//   - the list of service names offered
//   - the checklist template (categories + default items)
//   - the list of project statuses
//
// NOTE: document numbering counters now live in counters/counters.json
// (see documentNumbering.js / githubStorage.js), not in settings.
//
// NOTE: Logo, stamp, and the Scan & Pay QR code are NOT stored here.
// They are fixed application assets at public/assets/logo.png,
// public/assets/stamp.png, and public/assets/qr.png (see
// src/lib/brandAssets.js) - those are part of the application itself,
// not workspace data, so they still ship as regular files in the
// repo/deployment. To change them, replace the file and redeploy.
//
// NOTE: There is no bank details anywhere in this app (v2.1). Bank
// details were removed entirely and replaced by a single UPI ID +
// QR code "Scan & Pay" block on every generated PDF.

const githubStorage = require("./githubStorage");

function defaultSettings() {
  return {
    company: {
      name: "GreyNod Digital",
      email: "greynoddigital@gmail.com",
      phone: "+91 98465 14798",
      address: "Kozhikode, Kerala, India",
      website: "https://greynoddigital.github.io/",
    },
    // UPI ID shown (along with the qr.png asset) in the "Scan & Pay"
    // block on every generated PDF. Editable from Settings ->
    // Application; this default is only used on a fresh install.
    upiId: "vxnuprasad-3@okicici",
    // Service names only. Prices are entered manually per project.
    services: [
      "E-commerce Website",
      "Shopify Store",
      "Portfolio Website",
      "Technical Support",
      "Meta Ads",
      "SEO Optimization",
      "Payment Gateway Integration",
    ],
    projectStatuses: ["Lead", "In Progress", "Completed", "On Hold", "Cancelled"],
    // Checklist template: category name -> list of default item labels.
    // Users can add/remove items per project on top of these defaults.
    // ("Branding" here means client branding assets like logo/colors -
    // unrelated to the app's own fixed logo/stamp files.)
    checklistTemplate: {
      "Business Information": ["Business name confirmed", "Business address confirmed", "Contact number confirmed"],
      "Branding": ["Logo received", "Brand colors confirmed", "Fonts confirmed"],
      "Business Documents": ["GST certificate", "PAN card", "Business registration"],
      "Domain": ["Domain purchased", "Domain access confirmed"],
      "Hosting": ["Hosting purchased", "Hosting access confirmed"],
      "Products": ["Product list received", "Product images received", "Product pricing confirmed"],
      "Payment Gateway": ["Payment gateway account created", "Payment gateway keys received"],
      "Shipping": ["Shipping zones defined", "Shipping rates confirmed"],
      "Social Media": ["Instagram access", "Facebook access"],
      "Content": ["About us content received", "Contact page content received"],
    },
    // Default Terms & Conditions text shown (and editable) when
    // creating a new quotation.
    defaultQuotationTerms: [
      "50% advance payment is required before starting the project.",
      "Remaining payment must be completed before final delivery.",
      "Any work outside this quotation will be charged separately.",
      "Project delivery begins only after receiving the advance payment and all required project materials.",
      "Third-party charges are excluded unless specifically mentioned.",
      "This quotation is valid for 7 days from the date of issue.",
    ].join("\n"),
    // Sequential document numbering now lives in counters/counters.json,
    // but the key is kept here (always empty) for backward-compatible
    // shape in case any older client code still looks at it.
    documentCounters: {
      quotation: {},
      checklist: {},
      invoice: {},
    },
  };
}

// Older settings.json files may still have a "branding" key (v2.0,
// with logoPath/stampPath/signaturePath) and/or a "bankDetails" key
// (pre-v2.1). Neither is part of the current schema - bank details
// were removed entirely in v2.1 and replaced by a single top-level
// "upiId" field. This strips those legacy keys out the first time an
// older file is read, carrying any existing UPI ID forward so it
// isn't lost in the migration.
function migrateLegacyFields(settings) {
  if (!settings) return settings;

  let result = settings;
  let changed = false;

  if (Object.prototype.hasOwnProperty.call(result, "branding")) {
    const { branding, ...rest } = result;
    result = rest;
    changed = true;
  }

  if (Object.prototype.hasOwnProperty.call(result, "bankDetails")) {
    const { bankDetails, ...rest } = result;
    const carriedUpi = (result.upiId || (bankDetails && bankDetails.upiId) || "").trim();
    result = { ...rest, upiId: carriedUpi || defaultSettings().upiId };
    changed = true;
  }

  return changed ? result : settings;
}

// Fills in any missing top-level settings keys using the defaults,
// without touching values that are already present. This is what
// guarantees Settings (and everything that reads from it - Company
// info, the checklist template, quotation terms, etc.) never "reload
// as blank": even if a settings.json out in GitHub predates a field or
// is otherwise partial (older version, manual edit, a fresh repo
// seeded by hand), reading it always returns a complete object.
//
// `company` gets a deep merge (fill in missing sub-fields without
// discarding ones already set); every other top-level default key
// (checklistTemplate, services, projectStatuses, defaultQuotationTerms,
// documentCounters, and any future additions to defaultSettings()) is
// backfilled wholesale only when it's completely absent from the
// stored settings, so a deliberately-emptied array/object (e.g. a user
// clearing out projectStatuses) is never silently overwritten.
function hydrateSettings(settings) {
  const defaults = defaultSettings();
  const hydrated = { ...defaults, ...settings };
  hydrated.company = { ...defaults.company, ...(settings.company || {}) };
  const changed = JSON.stringify(hydrated) !== JSON.stringify(settings);
  return { hydrated, changed };
}

async function readSettings() {
  const raw = await githubStorage.loadSettings();
  if (!raw) {
    const fresh = defaultSettings();
    await githubStorage.saveSettings(fresh);
    return fresh;
  }

  const migrated = migrateLegacyFields(raw);
  const { hydrated, changed: hydratedChanged } = hydrateSettings(migrated);
  if (migrated !== raw || hydratedChanged) {
    await githubStorage.saveSettings(hydrated);
  }
  return hydrated;
}

async function writeSettings(settings) {
  await githubStorage.saveSettings(settings);
  return settings;
}

/** Merge a partial update into the existing settings and save. */
async function updateSettings(partial) {
  const current = await readSettings();
  const updated = { ...current, ...partial };
  await writeSettings(updated);
  return updated;
}

module.exports = {
  defaultSettings,
  readSettings,
  writeSettings,
  updateSettings,
};
