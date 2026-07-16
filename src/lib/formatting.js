// src/lib/formatting.js
//
// Small, pure formatting helpers shared between the API responses
// and the PDF document templates.

/** Format a number as Indian Rupees: 50000 -> "₹ 50,000.00" */
function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return (
    "₹ " +
    value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Format a date for display: "2026-07-15" -> "15 Jul 2026" */
function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function wordsUnder100(n) {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}

function wordsUnder1000(n) {
  if (n < 100) return wordsUnder100(n);
  return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + wordsUnder100(n % 100) : "");
}

/** Convert a rupee amount to Indian-style words, e.g. 125000 -> "One Lakh Twenty Five Thousand Rupees Only" */
function amountToWords(amount) {
  const rupees = Math.floor(Number(amount) || 0);
  if (rupees === 0) return "Zero Rupees Only";

  const parts = [];
  let remaining = rupees;

  if (remaining >= 10000000) {
    parts.push(wordsUnder1000(Math.floor(remaining / 10000000)) + " Crore");
    remaining %= 10000000;
  }
  if (remaining >= 100000) {
    parts.push(wordsUnder100(Math.floor(remaining / 100000)) + " Lakh");
    remaining %= 100000;
  }
  if (remaining >= 1000) {
    parts.push(wordsUnder1000(Math.floor(remaining / 1000)) + " Thousand");
    remaining %= 1000;
  }
  if (remaining > 0) {
    parts.push(wordsUnder1000(remaining));
  }

  return parts.join(" ") + " Rupees Only";
}

module.exports = { formatCurrency, formatDate, amountToWords };
