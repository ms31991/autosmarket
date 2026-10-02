import { normalizePlace } from "./listingTypeahead";

const BY_NAME = {
  black: "#111111",
  zi: "#111111",
  schwarz: "#111111",
  red: "#dc2626",
  kuqe: "#dc2626",
  kuq: "#dc2626",
  rot: "#dc2626",
  yellow: "#eab308",
  verdhe: "#eab308",
  verdha: "#eab308",
  gelb: "#eab308",
  white: "#f5f5f5",
  bardh: "#f5f5f5",
  bardhe: "#f5f5f5",
  weiss: "#f5f5f5",
  silver: "#c0c4cc",
  argjend: "#c0c4cc",
  argjendi: "#c0c4cc",
  silber: "#c0c4cc",
  grey: "#8b919a",
  gray: "#8b919a",
  gri: "#8b919a",
  grau: "#8b919a",
  blue: "#2563eb",
  blu: "#2563eb",
  blau: "#2563eb",
  green: "#16a34a",
  gjelber: "#16a34a",
  jeshile: "#16a34a",
  gruen: "#16a34a",
  grun: "#16a34a",
  orange: "#ea580c",
  portokalli: "#ea580c",
  brown: "#7c4a2d",
  kafe: "#7c4a2d",
  braun: "#7c4a2d",
  beige: "#d6c4a8",
  bezh: "#d6c4a8",
  gold: "#c9a227",
  ari: "#c9a227",
  purple: "#7c3aed",
  lila: "#7c3aed",
  violett: "#7c3aed",
};

function asHex(value) {
  const raw = String(value || "").trim();
  if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw;
  if (/^[0-9a-f]{3,8}$/i.test(raw)) return `#${raw}`;
  return "";
}

export function colorToCss(color) {
  const hex = asHex(color?.hexCode || color?.hex);
  if (hex) return hex;
  return BY_NAME[normalizePlace(color?.name || color || "")] || "";
}

export function isLightColor(css) {
  const hex = asHex(css);
  if (!hex) return false;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 170;
}
