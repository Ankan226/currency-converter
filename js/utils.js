function sanitizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function validateAmount(raw) {
  const cleaned = sanitizeText(raw).trim();

  if (cleaned === "") {
    return { valid: false, value: null, message: "Enter an amount." };
  }

  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return { valid: false, value: null, message: "Numbers only, e.g. 100 or 99.50." };
  }

  const value = parseFloat(cleaned);

  if (Number.isNaN(value)) {
    return { valid: false, value: null, message: "That doesn't look like a number." };
  }

  if (value <= 0) {
    return { valid: false, value: null, message: "Amount must be greater than 0." };
  }

  if (value > 1_000_000_000) {
    return { valid: false, value: null, message: "That amount is too large." };
  }

  return { valid: true, value, message: "" };
}

function formatNumber(num, decimals = 2) {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function debounce(fn, wait) {
  let timerId = null;
  return function debounced(...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), wait);
  };
}