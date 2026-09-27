import { SITE_URL } from "../config/site";

export function canonicalOrigin() {
  return SITE_URL || "https://autosmarket.me";
}

export function canonicalUrl(pathname = "/") {
  const path = String(pathname || "/").split("?")[0];
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean === "/") return canonicalOrigin();
  return `${canonicalOrigin()}${clean.replace(/\/$/, "")}`;
}

export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function brandSlugOf(vehicle) {
  return (
    slugify(vehicle?.brandSlug || vehicle?.BrandSlug) ||
    slugify(vehicle?.brandName || vehicle?.brand || vehicle?.BrandName)
  );
}

export function citySlugOf(vehicle) {
  return slugify(
    vehicle?.citySlug ||
      vehicle?.cityName ||
      vehicle?.city ||
      vehicle?.CityName
  );
}
