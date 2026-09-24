function resolveApiOrigin() {
  const envUrl = String(import.meta.env.VITE_API_URL || "http://localhost:5068")
    .replace(/\/$/, "")
    .replace(/\/api$/i, "");

  if (typeof window === "undefined") return envUrl;

  const { port } = window.location;
  const viteDev = port === "5173" || port === "4173";

  if (import.meta.env.DEV && viteDev) {
    return "";
  }

  return envUrl;
}

export const API_ORIGIN = resolveApiOrigin();
export const API_BASE = `${API_ORIGIN}/api`;
