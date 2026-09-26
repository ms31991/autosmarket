function env(name, fallback = "") {
  return String(import.meta.env[name] || fallback).trim();
}

export const SITE_NAME = "AutoMarket";
export const SITE_LOGO = "/asd.png?v=3";

export const SITE_URL = env("VITE_PUBLIC_SITE_URL", "https://autosmarket.me").replace(
  /\/$/,
  ""
);

export const SUPPORT_EMAIL = env("VITE_SUPPORT_EMAIL", "support@autosmarket.me");

export const PRIVACY_EMAIL = env("VITE_PRIVACY_EMAIL", "privacy@autosmarket.me");

export const LEGAL_NAME = env("VITE_LEGAL_NAME", "Automarket");

export const LEGAL_ADDRESS = env("VITE_LEGAL_ADDRESS");

export const ADSENSE_CLIENT = env(
  "VITE_ADSENSE_CLIENT",
  "ca-pub-3011113512288631"
);

export const ADSENSE_SLOT_SIDEBAR = env("VITE_ADSENSE_SLOT_SIDEBAR");
export const ADSENSE_SLOT_HOME = env("VITE_ADSENSE_SLOT_HOME");
export const ADSENSE_SLOT_DETAIL = env("VITE_ADSENSE_SLOT_DETAIL");

export const GA_MEASUREMENT_ID = env(
  "VITE_GA_MEASUREMENT_ID",
  "G-N7LLDHE5S2"
);

function isLocalHost() {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function adsenseReady() {
  if (!ADSENSE_CLIENT.startsWith("ca-pub-")) return false;
  if (isLocalHost()) return false;
  return true;
}

export function analyticsReady() {
  if (!GA_MEASUREMENT_ID.startsWith("G-")) return false;
  if (isLocalHost()) return false;
  return true;
}
