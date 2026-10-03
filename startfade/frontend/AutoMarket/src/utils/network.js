export const PUBLISH_FETCH_MS = 60000;

export function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function isNetworkProblem(err) {
  if (isOffline()) return true;
  const name = String(err?.name || "");
  const msg = String(err?.message || err || "").toLowerCase();
  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("err_internet") ||
    msg.includes("err_network") ||
    msg.includes("the internet connection") ||
    msg.includes("timeout")
  );
}

export async function fetchWithTimeout(url, options = {}, ms = PUBLISH_FETCH_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } catch (err) {
    if (err?.name === "AbortError") {
      const timeout = new Error("timeout");
      timeout.name = "TimeoutError";
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
