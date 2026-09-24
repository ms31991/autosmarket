import { Router } from "express";
import { query, queryOne } from "../db.js";
import { camel, pick, slugify } from "../camel.js";
import { requireAdmin } from "../auth.js";

export function lookupRouter(table, columns, options = {}) {
  const router = Router();

  router.get("/", async (_req, res) => {
    const rows = await query(`SELECT * FROM ${table}`);
    res.json(camel(rows));
  });

  router.get("/:id", async (req, res) => {
    const row = await queryOne(
      `SELECT * FROM ${table} WHERE Id = @id`,
      { id: Number(req.params.id) }
    );
    if (!row) return res.status(404).json({ message: "Not found." });
    res.json(camel(row));
  });

  router.post("/", requireAdmin, async (req, res) => {
    const values = {};
    for (const col of columns) {
      let value = pick(req.body, col);
      if (col === "Slug" && !value && pick(req.body, "Name")) {
        value = slugify(pick(req.body, "Name"));
      }
      if (col === "IsActive" && value === undefined) value = true;
      values[col] = value;
    }
    const names = Object.keys(values);
    const result = await query(
      `INSERT INTO ${table} (${names.join(", ")})
       OUTPUT INSERTED.*
       VALUES (${names.map((n) => `@${n}`).join(", ")})`,
      values
    );
    res.status(201).json(camel(result[0]));
  });

  router.put("/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const bodyId = pick(req.body, "Id");
    if (bodyId != null && Number(bodyId) !== id) {
      return res.status(400).json({ message: "Id mismatch." });
    }
    const sets = [];
    const params = { id };
    for (const col of columns) {
      if (pick(req.body, col) === undefined && col !== "Slug") continue;
      let value = pick(req.body, col);
      if (col === "Slug" && !value && pick(req.body, "Name")) {
        value = slugify(pick(req.body, "Name"));
      }
      sets.push(`${col} = @${col}`);
      params[col] = value;
    }
    if (!sets.length) return res.status(400).json({ message: "Nothing to update." });
    const result = await query(
      `UPDATE ${table} SET ${sets.join(", ")} OUTPUT INSERTED.* WHERE Id = @id`,
      params
    );
    if (!result[0]) return res.status(404).json({ message: "Not found." });
    res.json(camel(result[0]));
  });

  router.delete("/:id", requireAdmin, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid id." });
      }
      const existing = await queryOne(
        `SELECT Id FROM ${table} WHERE Id = @id`,
        { id }
      );
      if (!existing) {
        return res.status(404).json({ message: "Not found." });
      }
      if (typeof options.beforeDelete === "function") {
        await options.beforeDelete(id);
      }
      await query(`DELETE FROM ${table} WHERE Id = @id`, { id });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

function normalizePlace(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

const CITY_ALIASES = {
  prishtine: "prishtina",
  pristina: "prishtina",
  pristine: "prishtina",
  tirane: "tirana",
};

function canonPlace(value) {
  const n = normalizePlace(value);
  return CITY_ALIASES[n] || n;
}

function countryKey(value) {
  const n = normalizePlace(value);
  if (n.includes("kosovo") || n.includes("kosova")) return "kosovo";
  if (n.includes("albania") || n.includes("shqip")) return "albania";
  if (n.includes("macedonia") || n.includes("maqedoni")) return "northmacedonia";
  if (n.includes("german")) return "germany";
  if (n.includes("switzerland") || n.includes("schweiz")) return "switzerland";
  if (n.includes("austria") || n.includes("osterreich")) return "austria";
  return n;
}

function scoreCityMatch(city, placeName, countryName) {
  const place = canonPlace(placeName);
  const country = countryKey(countryName);
  const name = canonPlace(city.Name);
  const cityCountry = countryKey(city.CountryName);
  let score = 0;
  if (!place || !name) return 0;
  if (name === place) score = 100;
  else if (name.includes(place) || place.includes(name)) score = 70;
  if (score && country && cityCountry && cityCountry === country) score += 20;
  return score;
}

function matchCityRow(cities, placeName, countryName) {
  if (!cities?.length || !placeName) return null;
  const scored = cities
    .map((city) => ({ city, score: scoreCityMatch(city, placeName, countryName) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.city || null;
}

const COUNTRY_FALLBACK_CITIES = {
  kosovo: ["prishtina", "pristina", "pristine"],
  albania: ["tirana", "tirane"],
  northmacedonia: ["skopje"],
  macedonia: ["skopje"],
  germany: ["berlin"],
  switzerland: ["zurich", "zurich"],
  austria: ["vienna", "wien"],
};

function matchCountryFallback(cities, countryName) {
  const country = countryKey(countryName);
  const names = COUNTRY_FALLBACK_CITIES[country];
  if (!names?.length) return null;
  for (const name of names) {
    const matched = matchCityRow(cities, name, countryName);
    if (matched) return matched;
  }
  return (
    cities.find((city) => countryKey(city.CountryName) === country) || null
  );
}

export function citiesRouter() {
  const router = Router();

  router.get("/", async (_req, res) => {
    const rows = await query(`
      SELECT c.Id, c.Name, c.CountryId, co.Name AS CountryName
      FROM Cities c
      LEFT JOIN Country co ON co.Id = c.CountryId
      ORDER BY c.Name`);
    res.json(camel(rows));
  });

  router.get("/locate", async (req, res) => {
    try {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return res.status(400).json({ message: "lat and lon required." });
      }

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": "AutoMarketListings/1.0",
          },
        }
      );
      if (!response.ok) {
        return res.status(502).json({ message: "Location lookup failed." });
      }

      const data = await response.json();
      const address = data.address || {};
      const candidates = [
        address.city,
        address.town,
        address.village,
        address.municipality,
        address.city_district,
        address.county,
        address.state,
      ].filter(Boolean);

      const cities = await query(`
        SELECT c.Id, c.Name, c.CountryId, co.Name AS CountryName
        FROM Cities c
        LEFT JOIN Country co ON co.Id = c.CountryId
      `);

      let matched = null;
      for (const name of candidates) {
        matched = matchCityRow(cities, name, address.country);
        if (matched) break;
      }
      if (!matched) {
        matched = matchCountryFallback(cities, address.country);
      }

      res.json({
        city: matched ? camel(matched) : null,
        placeName: candidates[0] || null,
        country: address.country || null,
      });
    } catch (err) {
      res.status(502).json({ message: err.message || "Location lookup failed." });
    }
  });

  router.get("/:id", async (req, res) => {
    const row = await queryOne(
      `SELECT c.Id, c.Name, c.CountryId, co.Name AS CountryName
       FROM Cities c
       LEFT JOIN Country co ON co.Id = c.CountryId
       WHERE c.Id = @id`,
      { id: Number(req.params.id) }
    );
    if (!row) return res.status(404).json({ message: "Not found." });
    res.json(camel(row));
  });

  router.post("/", requireAdmin, async (req, res) => {
    const countryId = pick(req.body, "CountryId");
    const country = await queryOne(`SELECT Id FROM Country WHERE Id = @id`, {
      id: countryId,
    });
    if (!country) return res.status(400).send("CountryId does not exist.");
    const result = await query(
      `INSERT INTO Cities (Name, CountryId) OUTPUT INSERTED.*
       VALUES (@name, @countryId)`,
      { name: pick(req.body, "Name"), countryId }
    );
    res.status(201).json(camel(result[0]));
  });

  router.put("/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const result = await query(
      `UPDATE Cities SET Name = @name, CountryId = @countryId
       OUTPUT INSERTED.* WHERE Id = @id`,
      {
        id,
        name: pick(req.body, "Name"),
        countryId: pick(req.body, "CountryId"),
      }
    );
    if (!result[0]) return res.status(404).json({ message: "Not found." });
    res.json(camel(result[0]));
  });

  router.delete("/:id", requireAdmin, async (req, res) => {
    await query(`DELETE FROM Cities WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    res.status(204).end();
  });

  return router;
}

export function vehicleModelsRouter() {
  const router = Router();

  const select = `
    SELECT m.Id, m.Name, m.Slug, m.BrandId, b.Name AS BrandName
    FROM VehicleModels m
    LEFT JOIN Brands b ON b.Id = m.BrandId`;

  router.get("/", async (_req, res) => {
    const rows = await query(`${select} ORDER BY m.Name`);
    res.json(camel(rows));
  });

  router.get("/:id", async (req, res) => {
    const row = await queryOne(`${select} WHERE m.Id = @id`, {
      id: Number(req.params.id),
    });
    if (!row) return res.status(404).json({ message: "Vehicle model not found." });
    res.json(camel(row));
  });

  router.post("/", requireAdmin, async (req, res) => {
    const name = pick(req.body, "Name");
    const brandId = pick(req.body, "BrandId");
    const slug = pick(req.body, "Slug") || slugify(name);
    const brand = await queryOne(`SELECT Id FROM Brands WHERE Id = @id`, {
      id: brandId,
    });
    if (!brand) return res.status(400).json({ message: "BrandId does not exist." });
    const result = await query(
      `INSERT INTO VehicleModels (Name, Slug, BrandId)
       OUTPUT INSERTED.* VALUES (@name, @slug, @brandId)`,
      { name, slug, brandId }
    );
    res.status(201).json(camel(result[0]));
  });

  router.put("/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const name = pick(req.body, "Name");
    const brandId = pick(req.body, "BrandId");
    const slug = pick(req.body, "Slug") || slugify(name);
    const result = await query(
      `UPDATE VehicleModels SET Name = @name, Slug = @slug, BrandId = @brandId
       OUTPUT INSERTED.* WHERE Id = @id`,
      { id, name, slug, brandId }
    );
    if (!result[0]) return res.status(404).json({ message: "Not found." });
    res.json(camel(result[0]));
  });

  router.delete("/:id", requireAdmin, async (req, res) => {
    await query(`DELETE FROM VehicleModels WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    res.status(204).end();
  });

  return router;
}

export async function ensureListingTypeColumnNullable() {
  const col = await queryOne(`
    SELECT IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Vehicles' AND COLUMN_NAME = 'ListingTypeId'
  `);
  if (!col || String(col.IS_NULLABLE).toUpperCase() === "YES") return;

  const fks = await query(`
    SELECT name
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID('Vehicles')
      AND referenced_object_id = OBJECT_ID('ListingTypes')
  `);
  for (const fk of fks) {
    await query(`ALTER TABLE Vehicles DROP CONSTRAINT [${fk.name}]`);
  }
  await query(`ALTER TABLE Vehicles ALTER COLUMN ListingTypeId INT NULL`);
  await query(`
    ALTER TABLE Vehicles WITH CHECK
    ADD CONSTRAINT FK_Vehicles_ListingTypes_ListingTypeId
    FOREIGN KEY (ListingTypeId) REFERENCES ListingTypes (Id)
  `);
}

export async function ensureListingTypesSaleAndRent() {
  await ensureListingTypeColumnNullable();

  async function upsertType(name, slug) {
    const existing = await queryOne(
      `SELECT Id FROM ListingTypes WHERE LOWER(LTRIM(RTRIM(Name))) = LOWER(@name)`,
      { name }
    );
    if (existing?.Id) return Number(existing.Id);
    const inserted = await query(
      `INSERT INTO ListingTypes (Name, Slug, IsActive)
       OUTPUT INSERTED.Id
       VALUES (@name, @slug, 1)`,
      { name, slug }
    );
    return Number(inserted[0].Id);
  }

  const saleId = await upsertType("Sale", "sale");
  await upsertType("Rent", "rent");

  const extras = await query(`
    SELECT Id, Name FROM ListingTypes
    WHERE LOWER(LTRIM(RTRIM(Name))) IN (N'sell', N'for sale', N'shitje')
       OR LOWER(ISNULL(Slug, N'')) IN (N'sell', N'shitje')
  `);

  for (const row of extras) {
    const extraId = Number(row.Id);
    if (extraId === saleId) continue;
    await query(
      `UPDATE Vehicles SET ListingTypeId = @saleId WHERE ListingTypeId = @extraId`,
      { saleId, extraId }
    );
    await query(`DELETE FROM ListingTypes WHERE Id = @extraId`, { extraId });
  }

  await query(
    `UPDATE Vehicles SET ListingTypeId = @saleId
     WHERE ListingTypeId IS NULL`,
    { saleId }
  );
}

export function listingTypesRouter() {
  return lookupRouter("ListingTypes", ["Name", "Slug", "IsActive"], {
    async beforeDelete(id) {
      await ensureListingTypeColumnNullable();
      await query(
        `UPDATE Vehicles SET ListingTypeId = NULL WHERE ListingTypeId = @id`,
        { id }
      );
    },
  });
}
