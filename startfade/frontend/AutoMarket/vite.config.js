import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const api = "http://127.0.0.1:5068";
const proxy = {
  "/api": { target: api, changeOrigin: true },
  "/uploads": { target: api, changeOrigin: true },
  "/placeholder-car.svg": { target: api, changeOrigin: true },
  "/socket.io": { target: api, ws: true, changeOrigin: true },
};

const GUIDE_SLUGS = [
  "inspect-used-car",
  "documents-before-you-buy",
  "avoid-marketplace-scams",
  "photos-that-sell",
];

const STATIC_PATHS = [
  "/",
  "/vehicles",
  "/vehicles-for-sale",
  "/vehicles-for-rent",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
  "/refunds",
  "/guidelines",
  "/faq",
  "/how-it-works",
  "/guides",
  ...GUIDE_SLUGS.map((slug) => `/guides/${slug}`),
];

function writePublicMeta(root, env) {
  const site = String(env.VITE_PUBLIC_SITE_URL || "https://autosmarket.me").replace(
    /\/$/,
    ""
  );
  const publicDir = path.join(root, "public");
  const urls = STATIC_PATHS.map(
    (p) =>
      `  <url><loc>${site}${p}</loc><changefreq>${
        p === "/" || p.startsWith("/vehicles") ? "daily" : "monthly"
      }</changefreq></url>`
  ).join("\n");
  fs.writeFileSync(
    path.join(publicDir, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );

  const robots = `User-agent: *\nAllow: /\nDisallow: /login\nDisallow: /register\nDisallow: /admin\nDisallow: /messages\nDisallow: /settings\nDisallow: /add-vehicle\nDisallow: /edit-vehicle\nDisallow: /my-vehicles\nDisallow: /userprofile\nDisallow: /select-vehicle\nDisallow: /payment\n\nSitemap: ${site}/sitemap.xml\n`;
  fs.writeFileSync(path.join(publicDir, "robots.txt"), robots);

  const client = String(
    env.VITE_ADSENSE_CLIENT || "ca-pub-3011113512288631"
  );
  const pub = client.startsWith("ca-pub-") ? client.replace("ca-", "") : "";
  const adsTxt = pub
    ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
    : `# Add after AdSense approval:\n# google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0\n`;
  fs.writeFileSync(path.join(publicDir, "ads.txt"), adsTxt);
}

function publicMetaPlugin(env) {
  return {
    name: "autotrade-public-meta",
    buildStart() {
      writePublicMeta(process.cwd(), env);
    },
    configureServer() {
      writePublicMeta(process.cwd(), env);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), publicMetaPlugin(env)],
    server: {
      host: true,
      port: 5173,
      proxy,
    },
    preview: {
      host: true,
      port: 4173,
      proxy,
    },
  };
});
