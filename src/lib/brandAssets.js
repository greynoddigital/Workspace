// src/lib/brandAssets.js
//
// GreyNod's logo, stamp, and "Scan & Pay" QR code are fixed
// application assets, not user-configurable settings. They always
// live at these three paths:
//   public/assets/logo.png
//   public/assets/stamp.png
//   public/assets/qr.png
//
// PDF templates need these embedded directly as base64 data URIs
// (not as <img src="/assets/logo.png">) because Puppeteer renders
// the document HTML in isolation, with no server behind it to
// resolve relative URLs against.
//
// There is deliberately no "signature" here - signatures were
// removed from the app entirely in v2.0.1. There is deliberately no
// QR upload in Settings either - to change the QR code, replace
// public/assets/qr.png and redeploy, same as logo/stamp.

const fs = require("fs");
const path = require("path");

const ASSETS_DIR = path.join(__dirname, "..", "..", "public", "assets");
const LOGO_FILE = path.join(ASSETS_DIR, "logo.png");
const STAMP_FILE = path.join(ASSETS_DIR, "stamp.png");
const QR_FILE = path.join(ASSETS_DIR, "qr.png");

function fileToDataUri(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const bytes = fs.readFileSync(filePath);
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

function getLogoDataUri() {
  return fileToDataUri(LOGO_FILE);
}

function getStampDataUri() {
  return fileToDataUri(STAMP_FILE);
}

function getQrDataUri() {
  return fileToDataUri(QR_FILE);
}

module.exports = { getLogoDataUri, getStampDataUri, getQrDataUri };
