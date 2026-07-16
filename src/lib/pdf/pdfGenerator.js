// src/lib/pdf/pdfGenerator.js
//
// The only file in the app that talks to Puppeteer. Takes a
// complete HTML string and returns a PDF file as a Buffer.
// Document templates (quotation/checklist/invoice) build the HTML;
// this file just turns HTML into PDF bytes.

// Render (and most other PaaS/container hosts) don't ship the Chrome
// binary that the full "puppeteer" package downloads locally, so we
// can't just `require("puppeteer")` and launch it the same way in
// both places. Instead we detect the environment and pick the right
// launch strategy:
//
//   - Local development: use the full "puppeteer" package, which
//     already downloaded a matching Chromium build to disk.
//   - Render / other production hosts: use "puppeteer-core" (no
//     bundled browser) together with "@sparticuz/chromium", which
//     provides a Chromium binary that works in restricted/serverless
//     Linux environments. An explicit PUPPETEER_EXECUTABLE_PATH env
//     var, if set, always wins in case a host-provided Chrome/Chromium
//     install needs to be used instead.
const isProduction =
  process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);

let browserPromise = null;

async function launchBrowser() {
  if (isProduction) {
    // Production (e.g. Render): no bundled Chromium available, so use
    // puppeteer-core + @sparticuz/chromium's serverless-friendly binary.
    const puppeteer = require("puppeteer-core");
    const chromium = require("@sparticuz/chromium");

    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath());

    return puppeteer.launch({
      headless: chromium.headless,
      args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: chromium.defaultViewport,
      executablePath,
    });
  }

  // Local development: use the full puppeteer package and its
  // locally installed Chromium.
  const puppeteer = require("puppeteer");
  return puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

// Reuse a single browser instance across requests instead of
// launching a new one every time - much faster for a workspace
// that generates documents frequently.
function getBrowser() {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((err) => {
      // Don't cache a rejected launch - let the next request retry.
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

async function htmlToPdfBuffer(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });
    return pdfBuffer;
  } finally {
    await page.close();
  }
}

module.exports = { htmlToPdfBuffer };
