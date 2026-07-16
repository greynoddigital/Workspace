# PROJECT_STATUS.md — GreyNod Workspace

## v2.0.1 — Bug Fixes & PDF Improvements (latest)

Scope: no redesign, no architecture change — same HTML/CSS/Alpine.js +
Express + JSON stack. Only the requested improvements below.

**1. Branding settings removed.** Logo, stamp, and signature are no
longer configurable settings. The app now always uses two fixed files:
`public/assets/logo.png` and `public/assets/stamp.png`. There is no
signature anywhere in the app anymore — the concept was removed
entirely, not just hidden. (Placeholder logo/stamp images were
generated for this delivery since none existed in the original
project — see "Note on Placeholder Assets" below.)

**2. Settings page.** The old editable "Branding" tab (three text
inputs for file paths) was replaced with a read-only "Brand Assets"
info panel that simply previews the two fixed image files and tells
you where to replace them on disk. Nothing to configure.

**3. Quotation Terms & Conditions.** The quotation modal now has an
editable Terms & Conditions textarea, pre-filled with the six default
terms you specified. Whatever the user edits it to is exactly what
gets saved on the quotation record and rendered in the PDF (numbered
list, one term per line).

**4. PDF design.** All three document types (Quotation, Checklist,
Invoice) now embed the logo in the header and the stamp in the
footer — no signature. The Quotation PDF footer also now reads "Thank
you for choosing GreyNod Digital." above the usual website/email/phone
line.

**5. Checklist PDF — shortest possible list.** This was the main
behavioral fix. The checklist PDF now shows **only** items that were
checked when the checklist was created. Unchecked items are omitted
entirely (not shown as unchecked reference lines). Any category with
zero checked items is skipped completely — its heading does not
appear. Categories that do have checked items are still shown in the
canonical spec order (Business Information → Branding → Business
Documents → Domain → Hosting → Products → Payment Gateway → Shipping →
Social Media → Content → Custom Items), regardless of what order
they happen to be stored in on that particular checklist record. Every
shown item renders with an empty box (☐) — checked-ness in the app
means "this item is relevant to this project," not "already done";
the client ticks the box by hand.

**6. Cleanup.** Removed the `branding` key from the settings schema
(with an automatic one-time migration that strips it from any
existing `settings.json` the first time it's read), removed the three
empty `public/assets/logos|signatures|stamps` folders, and removed
every signature-related code path (there were only two: the settings
UI fields and the PDF footer signature block — both gone).

### Verified

| Item | Status |
|---|---|
| Settings page loads, Brand Assets panel shows fixed logo/stamp | ✅ |
| `settings.json` no longer contains a `branding` key (incl. migration of old files) | ✅ |
| Quotation generation with default terms | ✅ |
| Quotation generation with user-edited terms (verified custom text flows into the saved record) | ✅ |
| Checklist generation: mixed checked/unchecked items across 5 categories | ✅ |
| Checklist PDF: only checked items appear | ✅ Verified directly against rendered HTML |
| Checklist PDF: fully-unchecked category (Domain) is hidden entirely | ✅ Verified |
| Checklist PDF: category order matches spec exactly among the categories present | ✅ Verified |
| Checklist PDF: unchecked custom item hidden, checked one shown | ✅ Verified |
| Invoice generation (Full Payment Invoice) | ✅ |
| Logo appears in Quotation / Checklist / Invoice PDFs | ✅ Verified (base64 data URI present in rendered HTML) |
| Stamp appears in Quotation / Checklist / Invoice PDFs | ✅ Verified |
| No signature anywhere (grepped entire `src/` and `public/`) | ✅ Verified |
| All 4 pages return 200, static assets served | ✅ |
| No syntax errors across all backend/frontend JS files | ✅ |

### Note on Placeholder Assets

The original project handed off in v2.0 never contained real logo or
stamp image files (the asset folders existed but were empty), so
placeholder `logo.png` and `stamp.png` files were generated for this
delivery so the app doesn't break with missing images. **Replace
`public/assets/logo.png` and `public/assets/stamp.png` with your real
logo and stamp before using this for real client documents** — same
filenames, any reasonable size, transparent PNG recommended.

---

## v2.0 — Complete Simplification & Rebuild

## Summary

The application was rebuilt from scratch on top of the plain
HTML/Alpine.js + Node/Express + JSON-file stack you specified, following
the approved migration plan. The previous Next.js/React/Prisma/PostgreSQL
codebase could not be reused at the code level (incompatible framework
and storage model), so business logic and domain rules were ported by
hand — formatting, document numbering, invoice-type detection, checklist
categories, and the API route shape — while auth, the credential vault,
timeline/activity log, GST logic, multi-user support, and all React/
Prisma/Tailwind code were dropped entirely, per your spec.

## What Was Built

**Backend** (`src/`)
- `lib/` — storage primitives (`jsonStore.js`, `paths.js`), project
  store, settings store, ID/document numbering, calculations,
  formatting, search, invoice-type logic
- `lib/pdf/` — Puppeteer wrapper + three HTML document templates
  (Quotation, Checklist, Invoice with automatic Thank You section)
- `routes/` — one file per resource: dashboard, projects, services,
  payments, files, notes, documents, quotations, checklists, invoices,
  settings, search
- `validators/` — plain validation functions (no external libraries)

**Frontend** (`public/`)
- `index.html` — Dashboard (stats + recent projects)
- `projects.html` — Project list, search, create modal
- `project.html` — Project detail with 6 tabs: Overview, Services,
  Payments, Files, Notes, Documents (Quotation/Checklist/Invoice
  generation and management)
- `settings.html` — Company, Branding, Services, Checklist Template,
  Bank Details, Application (project statuses)
- Styled to match the provided mockup: white background, black text,
  monospace font, thin dashed/solid borders, no color/shadows/
  gradients/animation

## Build Verification

Verified directly against the running server in this environment:

| Item | Status |
|---|---|
| Server starts (`npm install && npm start`) | ✅ Verified |
| All 4 HTML pages load (200 OK) | ✅ Verified |
| Dashboard stats endpoint | ✅ Verified |
| Create / Read / Update / Delete project | ✅ Verified |
| Add / remove service, totals calculate correctly | ✅ Verified |
| Add / remove payment, paid/pending recalculate | ✅ Verified |
| Add / remove Drive file link | ✅ Verified |
| Save / load notes.md | ✅ Verified |
| Search by name/client/phone/email/status | ✅ Verified |
| Settings read/update (company, branding, services, checklist
  template, bank details, statuses) | ✅ Verified |
| Quotation generation (auto-filled + editable items) | ✅ Verified |
| Checklist generation (categories + custom items) | ✅ Verified |
| Invoice generation: **Advance Invoice** on partial payment | ✅ Verified |
| Invoice generation: **Final Invoice** + Thank You section once
  balance reaches zero | ✅ Verified |
| Invoice generation: **Full Payment Invoice** when the very first
  invoice clears the full balance | ✅ Verified (logic tested directly) |
| PDF template HTML output (all 3 document types render correct
  content, numbers, and structure) | ✅ Verified (HTML generation
  tested directly) |
| Actual Chrome→PDF rendering via Puppeteer | ⚠️ Not runnable in this
  sandbox (outbound network here is restricted to a small allowlist
  that excludes Chromium's download host) — see note below |

## One Known Limitation to Be Aware Of

Puppeteer downloads its own bundled Chromium during `npm install`. This
development sandbox blocks that download, so the actual HTML→PDF
rendering step (as opposed to the HTML generation, which was fully
tested) could not be executed here. This is **not expected to be an
issue on your machine or on Render** — both have normal internet
access. If you hit any PDF generation error after deploying, it is most
likely a missing system dependency for headless Chrome on the host
(rare on Render, common on some minimal Docker bases) — see
Puppeteer's troubleshooting docs if that happens.

## Deployment Reminder

See `README.md` for the Render persistent-disk note — since this app
stores all data as JSON files with no database, you need a persistent
disk mounted at `workspace-data/` on Render, or data will be lost on
redeploy.

## Final Deliverable

- Updated, simplified source code (Node/Express + Alpine.js, no
  database)
- Cleaned folder structure matching your spec exactly
- All unused/removed code (auth, vault, timeline, GST, multi-user,
  Prisma/React/Tailwind) fully deleted, not just disabled
- This status document
- Final ZIP of the project, ready for `npm install && npm start`
