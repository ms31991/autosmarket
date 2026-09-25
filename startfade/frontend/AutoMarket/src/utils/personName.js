export function isPlaceholderName(value) {
  const text = String(value || "").trim();
  if (!text) return true;
  if (/^user_[a-zA-Z0-9]+$/i.test(text)) return true;
  if (text.toLowerCase() === "user") return true;
  if (text.toLowerCase().includes("@users.autosmarket.me")) return true;
  return false;
}

export function personDisplayName({
  name,
  surname,
  userName,
  fallback,
} = {}) {
  const first = isPlaceholderName(name) ? "" : String(name || "").trim();
  const last = isPlaceholderName(surname) ? "" : String(surname || "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  const handle = String(userName || "").trim();
  if (handle && !isPlaceholderName(handle) && !handle.includes("@")) {
    return handle;
  }
  return fallback || "User";
}
