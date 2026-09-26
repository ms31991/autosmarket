import { query } from "../db.js";

function siteOrigin() {
  return String(process.env.FRONTEND_URL || "https://autosmarket.me").replace(
    /\/$/,
    ""
  );
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dayStamp(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export async function vehicleSitemap(_req, res) {
  try {
    const rows = await query(`
      SELECT TOP 45000 Id, CreatedDate
      FROM Vehicles
      ORDER BY CreatedDate DESC
    `);
    const origin = siteOrigin();
    const urls = (rows || [])
      .map((row) => {
        const id = row.Id ?? row.id;
        if (id == null || id === "") return "";
        const lastmod = dayStamp(row.CreatedDate ?? row.createdDate);
        return `  <url><loc>${xmlEscape(`${origin}/vehicles/${id}`)}</loc>${
          lastmod ? `<lastmod>${lastmod}</lastmod>` : ""
        }<changefreq>daily</changefreq></url>`;
      })
      .filter(Boolean)
      .join("\n");

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
    );
  } catch (err) {
    console.error("sitemap:", err);
    res.status(500).type("text/plain").send("Sitemap unavailable.");
  }
}
