import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const backendRoot = path.join(__dirname, "..");
export const publicDir = path.join(backendRoot, "public");
export const vehicleUploadsDir = path.join(publicDir, "uploads", "vehicles");
export const profileUploadsDir = path.join(publicDir, "uploads", "profiles");
export const bannerUploadsDir = path.join(publicDir, "uploads", "banners");

export function ensureUploadDirs() {
  fs.mkdirSync(vehicleUploadsDir, { recursive: true });
  fs.mkdirSync(profileUploadsDir, { recursive: true });
  fs.mkdirSync(bannerUploadsDir, { recursive: true });
}

export function toPublicUrl(imageUrl) {
  if (!imageUrl) return imageUrl;
  let p = String(imageUrl).trim().replace(/\\/g, "/");
  p = p.replace(/^~\//, "/");
  if (/^https?:\/\//i.test(p)) {
    try {
      const u = new URL(p);
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1") {
        p = u.pathname;
      } else {
        return p;
      }
    } catch {
      return p;
    }
  }
  if (!p.startsWith("/")) p = `/${p}`;
  return p;
}

export function publicFilePath(imageUrl) {
  const rel = toPublicUrl(imageUrl).replace(/^\//, "");
  return path.join(publicDir, rel);
}
