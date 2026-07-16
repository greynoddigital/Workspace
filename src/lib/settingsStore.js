// src/lib/settingsStore.js
//
// Everything related to reading and writing the single settings
// object, now stored at settings/settings.json in the GitHub data
// repo instead of workspace-data/settings/settings.json.
//
// settings.json holds:
//   - company info & bank details
//   - the list of service names offered
//   - the checklist template (categories + default items)
//   - the list of project statuses
//
// NOTE: document numbering counters now live in counters/counters.json
// (see documentNumbering.js / githubStorage.js), not in settings.
//
// NOTE: Logo and stamp are NOT stored here. They are fixed
// application assets at public/assets/logo.png and
// public/assets/stamp.png (see src/lib/brandAssets.js) - those are
// part of the application itself, not workspace data, so they still
// ship as regular files in the repo/deployment.

const githubStorage = require("./githubStorage");

function defaultSettings() {
  return {
    company: {
      name: "GreyNod Digital",
      email: "",
      phone: "",
      address: "",
      website: "",
    },
    bankDetails: {
      accountName: "",
      accountNumber: "",
      ifscCode: "",
      bankName: "",
      upiId: "",
    },
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

// Older settings.json files (v2.0) may still have a "branding" key
// with logoPath/stampPath/signaturePath. That's no longer part of
// the schema, so it's stripped out the first time the file is read.
function stripLegacyFields(settings) {
  if (settings && Object.prototype.hasOwnProperty.call(settings, "branding")) {
    const { branding, ...rest } = settings;
    return rest;
  }
  return settings;
}

async function readSettings() {
  const raw = await githubStorage.loadSettings();
  if (!raw) {
    const fresh = defaultSettings();
    await githubStorage.saveSettings(fresh);
    return fresh;
  }

  const cleaned = stripLegacyFields(raw);
  if (cleaned !== raw) {
    await githubStorage.saveSettings(cleaned);
  }
  return cleaned;
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
