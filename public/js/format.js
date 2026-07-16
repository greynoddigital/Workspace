// public/js/format.js
//
// Small display-formatting helpers used inside Alpine templates.
// Mirrors src/lib/formatting.js on the backend, but this copy runs
// in the browser (kept deliberately simple - no shared module system
// between frontend and backend in a plain HTML/Alpine app).

function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return "₹ " + value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
