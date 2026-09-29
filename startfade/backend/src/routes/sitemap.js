import { query } from "../db.js";

function siteOrigin() {
  const raw = String(
    process.env.FRONTEND_URL || "https://autosmarket.me"
  ).replace(/\/$/, "");
  if (raw === "https://www.autosmarket.me") return "https://autosmarket.me";
  return raw;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function listingKind(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("rent") || n.includes("qira")) return "rent";
  return "sale";
}

function collectionPath(kind) {
  return kind === "rent" ? "/vehicles-for-rent" : "/vehicles-for-sale";
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
      WHERE (SELECT COUNT(*) FROM VehicleImages vi WHERE vi.VehicleId = Vehicles.Id) >= 2
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

export async function taxonomySitemap(_req, res) {
  try {
    const origin = siteOrigin();
    const brandRows = await query(`
      SELECT DISTINCT b.Name AS Name, lt.Name AS ListingType
      FROM Vehicles v
      INNER JOIN Brands b ON b.Id = v.BrandId
      LEFT JOIN ListingTypes lt ON lt.Id = v.ListingTypeId
      WHERE b.Name IS NOT NULL AND LTRIM(RTRIM(b.Name)) <> ''
    `);
    const cityRows = await query(`
      SELECT DISTINCT c.Name AS Name, lt.Name AS ListingType
      FROM Vehicles v
      INNER JOIN Cities c ON c.Id = v.CityId
      LEFT JOIN ListingTypes lt ON lt.Id = v.ListingTypeId
      WHERE c.Name IS NOT NULL AND LTRIM(RTRIM(c.Name)) <> ''
    `);
    const seen = new Set();
    const urls = [];
    for (const row of brandRows || []) {
      const slug = slugify(row.Name ?? row.name);
      if (!slug) continue;
      const path = `${collectionPath(listingKind(row.ListingType ?? row.listingType))}/brand/${slug}`;
      if (seen.has(path)) continue;
      seen.add(path);
      urls.push(
        `  <url><loc>${xmlEscape(`${origin}${path}`)}</loc><changefreq>daily</changefreq></url>`
      );
    }
    for (const row of cityRows || []) {
      const slug = slugify(row.Name ?? row.name);
      if (!slug) continue;
      const path = `${collectionPath(listingKind(row.ListingType ?? row.listingType))}/city/${slug}`;
      if (seen.has(path)) continue;
      seen.add(path);
      urls.push(
        `  <url><loc>${xmlEscape(`${origin}${path}`)}</loc><changefreq>daily</changefreq></url>`
      );
    }
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`
    );
  } catch (err) {
    console.error("taxonomy sitemap:", err);
    res.status(500).type("text/plain").send("Sitemap unavailable.");
  }
}
