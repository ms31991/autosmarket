function resolveApiOrigin() {
  const envUrl = String(import.meta.env.VITE_API_URL || "http://localhost:5068")
    .replace(/\/$/, "")
    .replace(/\/api$/i, "");

  if (typeof window === "undefined") return envUrl;

  const host = window.location.hostname;
  const localHost =
    host === "localhost" || host === "127.0.0.1" || host === "::1";

  if (import.meta.env.DEV && localHost) {
    return "";
  }

  return envUrl;
}

export const API_ORIGIN = resolveApiOrigin();
export const API_BASE = `${API_ORIGIN}/api`;
