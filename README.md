# GreyNod Workspace v2.1

A simple, personal business workspace for GreyNod Digital. Manage client
projects, track payments, generate PDFs (quotations, checklists, invoices),
store project notes, and keep Google Drive links in one place.

No login. No traditional database. No unnecessary complexity.

## Tech Stack

- **Frontend:** Plain HTML5 + CSS3 + [Alpine.js](https://alpinejs.dev/) (loaded via CDN)
- **Backend:** Node.js + Express
- **Storage:** A private GitHub repository, used as the database via the
  [`@octokit/rest`](https://github.com/octokit/rest.js) SDK (see
  "Storage Backend" below)
- **PDFs:** Puppeteer (renders HTML to PDF)

No React, no Next.js, no Tailwind, no SQL database, no Docker.

## Storage Backend: GitHub as the Database

As of v2.1, the app no longer writes to the local filesystem for any
application data. Every project, setting, document, and generated PDF
is read from and committed to a private GitHub repository (e.g.
`Workspace-Data`) through the GitHub Contents API. `src/lib/githubStorage.js`
is the only file in the app that talks to GitHub; every other module
(`projectStore`, `settingsStore`, `documentNumbering`, `search`, ...) kept
the exact same function names and shapes it always had - they're just
`async` now, since network calls can't be synchronous.

**Required environment variables** (see `.env.example`):

| Variable       | Description                                                        |
| -------------- | -------------------------------------------------------------------- |
| `GITHUB_TOKEN` | A GitHub token (classic or fine-grained) with read/write access to the data repo |
| `GITHUB_OWNER` | The GitHub account or organization that owns the data repo         |
| `GITHUB_REPO`  | The name of the private data repo, e.g. `Workspace-Data`           |
| `NODE_ENV`     | `development` locally, `production` on Render                      |

The app fails fast with a clear error at startup if any of the first
three are missing - it never silently falls back to disk.

**Data repo layout** (created automatically as you use the app):

```
Workspace-Data/
  projects/
    GN-2026-0001/
      project.json        core fields (name, client, status, dates...)
      services.json        services array
      payments.json         payments array
      files.json              Google Drive file links array
      documents.json            quotations/checklists/invoices index
      notes.md                   free-form notes
      quotation-0001.json         snapshot of a single generated quotation
      quotation-0001.pdf            the PDF that was generated for it
      invoice-0001.json / .pdf        same idea for invoices
      checklist-0001.json / .pdf       same idea for checklists
  settings/
    settings.json           company info, services, checklist template...
  counters/
    counters.json            sequential counters: project IDs + each
                              document type, per year - read, incremented,
                              and committed atomically on every reservation
```

Project search (`GET /api/search`) works the same as before: it reads
every `project.json` (merged with its services/payments/files) from the
repo and filters in memory - fine for a single-user, small-scale tool.

## Getting Started (Development)

```bash
cp .env.example .env   # fill in GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO
npm install
npm start
```

The app will be running at **http://localhost:3000**.

`npm install` downloads Puppeteer's bundled Chromium automatically (this
can take a minute the first time) and installs `@octokit/rest`. `npm
start` runs `node server.js` directly - no build step, no containers.
The very first request that reads settings will create a default
`settings/settings.json` in your data repo if one doesn't exist yet.

## Project Structure

```
server.js                  Entry point - starts the Express server
src/
  routes/                  One file per resource (projects, services,
                            payments, files, notes, documents, settings...)
  lib/                      Business logic: storage, calculations,
                            formatting, ID/document numbering, PDF generation
  validators/               Simple field validation functions
public/
  index.html                Dashboard page
  projects.html              Projects list page
  project.html                Project detail page (tabs: Overview, Services,
                              Payments, Files, Notes, Documents)
  settings.html                Settings page
  css/style.css                 All styling (minimal, monospace, black & white)
  js/                             One Alpine.js component per page
```

Application data (projects, settings, documents) no longer lives in this
repo at all - see "Storage Backend: GitHub as the Database" above for
where it lives instead.

## Deploying to Render

1. Push this project (the application code, not your data) to a Git
   repository.
2. Create a new **Web Service** on Render pointing at that repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. **Set environment variables** in the Render dashboard: `GITHUB_TOKEN`,
   `GITHUB_OWNER`, `GITHUB_REPO`, and `NODE_ENV=production`.
6. **No persistent disk needed.** Since v2.1, application data lives in
   your `Workspace-Data` GitHub repo, not on Render's local filesystem.
   Render's filesystem being ephemeral no longer matters - every deploy
   or restart reads straight from GitHub again.
7. Puppeteer's Chromium binary is provided by `@sparticuz/chromium` +
   `puppeteer-core` in production (see `src/lib/pdf/pdfGenerator.js`),
   which works on Render's restricted Linux environment out of the box.
   No extra buildpacks needed.

## Notes on Design Choices

- **No GST / tax logic anywhere** — prices are entered as final amounts.
- **No file uploads** — only Google Drive links are stored; you upload
  files to Drive yourself and paste the link in.
- **Logo and stamp are fixed files, not settings** — the app always
  uses `public/assets/logo.png` and `public/assets/stamp.png` on every
  generated PDF. Replace those two files with your real logo/stamp
  (same filenames) whenever you like; there's nothing to configure in
  the UI. **There is no signature anywhere in this app.**
- **Invoice type (Advance / Final / Full Payment) is automatic** — it's
  computed from the project's payment history each time you generate
  an invoice. When the project balance reaches zero, a Thank You
  section is automatically included in that invoice.
- **Checklist PDFs only show what was checked** — unchecked items and
  fully-empty categories are omitted so the PDF is the shortest
  possible list of what the client still needs to send.
- **Document numbers** (`QT-2026-0001`, `CL-2026-0001`, `INV-2026-0001`)
  are sequential per year, tracked in `settings.json`.
