import { API_ORIGIN } from "../config/api";

export const PLACEHOLDER_IMAGE = `${API_ORIGIN}/placeholder-car.svg`;

export function mediaUrl(value) {
  if (!value) return PLACEHOLDER_IMAGE;

  let raw = value;
  if (typeof value !== "string") {
    raw = value.imageUrl || value.ImageUrl || "";
  }
  if (!raw) return PLACEHOLDER_IMAGE;

  let p = String(raw).trim().replace(/\\/g, "/");
  p = p.replace(/^~\//, "/");

  if (/^https?:\/\//i.test(p)) {
    try {
      const u = new URL(p);
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
        return `${API_ORIGIN}${u.pathname}${u.search}`;
      }
      return p;
    } catch {
      return p;
    }
  }

  if (!p.startsWith("/")) p = `/${p}`;
  return `${API_ORIGIN}${p}`;
}
