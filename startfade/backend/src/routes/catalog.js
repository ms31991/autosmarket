import { Router } from "express";
import { query } from "../db.js";
import { camel } from "../camel.js";

const CATALOG_BASE =
  process.env.FLEET_CATALOG_URL || "https://fleetcatalog.disturbingbyte.pt";

const cache = new Map();
const CACHE_MS = 10 * 60 * 1000;

const ALIASES = {
  fuelType: {
    Petrol: ["petrol", "gasoline", "benzin", "unleaded"],
    Diesel: ["diesel"],
    Electric: ["electric", "ev", "elektro"],
    PlugInHybrid: ["pluginhybrid", "plug-in hybrid", "plugin hybrid", "phev"],
    Hybrid: ["hybrid", "hev"],
    Lpg: ["lpg", "gpl", "gas"],
    Hydrogen: ["hydrogen"],
    Other: ["other"],
  },
  gearboxType: {
    Manual: ["manual"],
    Automatic: ["automatic", "auto"],
    Cvt: ["cvt"],
    Dct: ["dct", "dsg", "dualclutch", "dual clutch"],
    Other: ["other"],
  },
  driveType: {
    Fwd: ["fwd", "front", "frontwheel"],
    Rwd: ["rwd", "rear", "rearwheel"],
    Awd: ["awd", "4wd", "4x4", "allwheel", "fourwheel"],
  },
  bodyType: {
    Sedan: ["sedan", "saloon"],
    Hatchback: ["hatchback", "hatch"],
    Combi: ["combi", "estate", "wagon", "touring", "avant"],
    Suv: ["suv", "crossover"],
    Van: ["van"],
    Minivan: ["minivan", "mpv"],
    Coupe: ["coupe", "coupe"],
    Cabriolet: ["cabriolet", "convertible", "cabrio"],
    Pickup: ["pickup", "pick-up"],
    Other: ["other"],
  },
};

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function getCached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function setCached(key, value) {
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function catalogGet(path) {
  const url = `${CATALOG_BASE}${path}`;
  const cached = getCached(url);
  if (cached) return cached;

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (response.status === 429) {
    const error = new Error("Katalogu është i zënë. Provo përsëri pas një minute.");
    error.status = 429;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(`Katalogu dështoi (${response.status}).`);
    error.status = response.status === 404 ? 404 : 502;
    throw error;
  }

  const data = await response.json();
  return setCached(url, data);
}

function matchLookup(rows, catalogValue, aliasMap) {
  if (!catalogValue || !rows?.length) return null;
  const aliases = aliasMap[catalogValue] || [catalogValue];
  const targets = new Set(
    [catalogValue, ...aliases].map(normalize).filter(Boolean)
  );

  for (const row of rows) {
    const name = normalize(row.Name);
    if (!name) continue;
    for (const target of targets) {
      if (name === target || name.includes(target) || target.includes(name)) {
        return row.Id;
      }
    }
  }
  return null;
}

async function loadLookups() {
  const cached = getCached("lookups");
  if (cached) return cached;
  const [bodyTypes, fuelTypes, transmissions, driveTypes] = await Promise.all([
    query("SELECT Id, Name FROM BodyTypes"),
    query("SELECT Id, Name FROM FuelTypes"),
    query("SELECT Id, Name FROM Transmissions"),
    query("SELECT Id, Name FROM DriveTypes"),
  ]);
  return setCached("lookups", {
    bodyTypes,
    fuelTypes,
    transmissions,
    driveTypes,
  });
}

function mapFields(variant, lookups) {
  const fuel = variant.fuelType;
  const gearbox = variant.gearboxType;
  const drive = variant.driveType;
  const body = variant.bodyType;
  const cc = variant.engineDisplacementCc;
  const engineParts = [
    cc ? `${(Number(cc) / 1000).toFixed(1)}` : null,
    fuel && fuel !== "Other" ? fuel : null,
  ].filter(Boolean);

  const yearFrom = variant.yearFrom || null;
  const yearTo = variant.yearTo || null;
  const year =
    yearFrom && yearTo && yearFrom === yearTo
      ? yearFrom
      : yearFrom || yearTo || null;

  return {
    bodyTypeId: matchLookup(lookups.bodyTypes, body, ALIASES.bodyType),
    fuelTypeId: matchLookup(lookups.fuelTypes, fuel, ALIASES.fuelType),
    transmissionId: matchLookup(
      lookups.transmissions,
      gearbox,
      ALIASES.gearboxType
    ),
    driveTypeId: matchLookup(lookups.driveTypes, drive, ALIASES.driveType),
    engine: engineParts.length ? engineParts.join(" ") : variant.name || null,
    engineCC: cc ?? null,
    cylinders: variant.engineCylinders ?? null,
    powerHP: variant.powerBhp ?? null,
    powerKW: variant.powerKw ?? null,
    seats: variant.numberOfSeats ?? null,
    doors: variant.numberOfDoors ?? null,
    year,
  };
}

function classKey(value) {
  const text = String(value || "");
  const named = text.match(
    /\b([A-Za-z]{1,3})[-\s]?(class|klasse|serie|series)\b/i
  );
  if (named) return named[1].toLowerCase();

  const compact = normalize(text).replace(/klasse/g, "class");
  const compactNamed = compact.match(/^([a-z]{1,3})(class|serie|series)/);
  if (compactNamed) return compactNamed[1];

  if (
    /^(gla|glb|glc|gle|gls|cla|cls|clk|slk|slc|eq[abcse]|amggt)$/.test(compact)
  ) {
    return compact;
  }
  return "";
}

function scoreModel(modelName, query) {
  const model = normalize(modelName);
  const q = normalize(query);
  if (!model || !q) return 0;
  if (model === q) return 100;

  const modelClass = model.replace(/klasse/g, "class");
  const queryClass = q.replace(/klasse/g, "class");
  if (modelClass === queryClass) return 95;
  if (modelClass.includes(queryClass) || queryClass.includes(modelClass)) {
    return 85;
  }
  if (model.includes(q) || q.includes(model)) return 80;

  const queryKey = classKey(query);
  const modelKey = classKey(modelName);
  if (queryKey && modelKey && queryKey === modelKey) return 75;

  const engineCode = String(query).match(/^([A-Za-z]{1,3})\s*(\d{2,3})/);
  if (engineCode) {
    const prefix = engineCode[1].toLowerCase();
    if (modelKey === prefix || model.startsWith(prefix)) return 65;
  }

  const digits = String(query).match(/^\d+/);
  if (digits) {
    const series = digits[0][0];
    if (model.startsWith(series) && /series|klasse|class|serie/.test(model)) {
      return 70;
    }
    if (model.startsWith(normalize(digits[0]))) return 50;
  }
  return 0;
}

function pickModels(models, query) {
  const scored = models
    .map((item) => ({ item, score: scoreModel(item.name, query) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length) {
    const best = scored[0].score;
    return scored.filter((row) => row.score >= best - 20).slice(0, 3);
  }
  return [];
}

function makeSearchTerms(brandName) {
  const raw = String(brandName || "").trim();
  const terms = new Set();
  if (raw) terms.add(raw);

  const withoutMaker = raw.replace(/[- ]?(benz|motors|motor|auto)$/i, "").trim();
  if (withoutMaker) terms.add(withoutMaker);

  const first = raw.split(/[\s/-]+/).filter(Boolean)[0];
  if (first && first.length >= 3) terms.add(first);

  return [...terms];
}

function scoreMake(itemName, brandName) {
  const make = normalize(itemName);
  const q = normalize(brandName);
  if (!make || !q) return 0;
  if (make === q) return 100;
  if (make.includes(q) || q.includes(make)) return 80;
  return 0;
}

async function findMake(brandName) {
  const seen = new Map();
  for (const term of makeSearchTerms(brandName)) {
    const data = await catalogGet(
      `/v1/makes?search=${encodeURIComponent(term)}&pageSize=20`
    );
    for (const item of data.items || []) {
      if (!seen.has(item.id)) seen.set(item.id, item);
    }
  }

  const items = [...seen.values()];
  const wantAmg = /amg/.test(normalize(brandName));
  const scored = items
    .map((item) => {
      let score = scoreMake(item.name, brandName);
      const name = normalize(item.name);
      if (!wantAmg && name.includes("amg")) score -= 50;
      return { item, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.item || null;
}

async function findModels(makeId) {
  const items = [];
  let page = 1;
  let total = Infinity;
  while (items.length < total && page <= 8) {
    const data = await catalogGet(
      `/v1/makes/${makeId}/models?page=${page}&pageSize=100`
    );
    total = data.total ?? (data.items || []).length;
    items.push(...(data.items || []));
    if (!data.items?.length) break;
    page += 1;
  }
  return items;
}

async function findVariants(modelId, search) {
  const params = new URLSearchParams({ page: "1", pageSize: "100" });
  if (search) params.set("search", search);
  const data = await catalogGet(`/v1/models/${modelId}/variants?${params}`);
  return data.items || [];
}

function summarizeVariant(variant, modelName) {
  const years =
    variant.yearFrom || variant.yearTo
      ? `${variant.yearFrom || "?"}–${variant.yearTo || "now"}`
      : "";
  const bits = [
    modelName && modelName !== variant.name ? modelName : null,
    variant.name,
    years,
    variant.fuelType,
    variant.gearboxType,
    variant.powerBhp ? `${variant.powerBhp} HP` : null,
  ].filter(Boolean);

  return {
    id: variant.id,
    name: variant.name,
    modelName: modelName || null,
    yearFrom: variant.yearFrom ?? null,
    yearTo: variant.yearTo ?? null,
    bodyType: variant.bodyType ?? null,
    fuelType: variant.fuelType ?? null,
    gearboxType: variant.gearboxType ?? null,
    driveType: variant.driveType ?? null,
    powerBhp: variant.powerBhp ?? null,
    label: bits.join(" · "),
  };
}

export function catalogRouter() {
  const router = Router();

  router.get("/variants", async (req, res) => {
    try {
      const brand = String(req.query.brand || "").trim();
      const model = String(req.query.model || "").trim();
      if (!brand || !model) {
        return res.status(400).json({
          message: "brand dhe model janë të detyrueshëm.",
        });
      }

      const make = await findMake(brand);
      if (!make) {
        return res.json({ make: null, variants: [] });
      }

      const models = await findModels(make.id);
      const matched = pickModels(models, model);
      const useSearch =
        matched.length === 0 ||
        matched.every((row) => normalize(row.item.name) !== normalize(model));

      const variants = [];
      for (const row of matched) {
        const searchTerm = useSearch ? model : "";
        let list = await findVariants(row.item.id, searchTerm);
        if (!list.length && searchTerm) {
          const stripped = searchTerm.replace(/[a-z]+$/i, "").trim();
          if (stripped && stripped !== searchTerm) {
            list = await findVariants(row.item.id, stripped);
          }
        }
        if (!list.length) {
          list = await findVariants(row.item.id, "");
        }
        for (const variant of list) {
          variants.push(summarizeVariant(variant, row.item.name));
        }
      }

      const unique = [];
      const seen = new Set();
      for (const variant of variants) {
        if (seen.has(variant.id)) continue;
        seen.add(variant.id);
        unique.push(variant);
      }

      res.json({
        make: { id: make.id, name: make.name },
        variants: unique.slice(0, 80),
      });
    } catch (err) {
      res.status(err.status || 502).json({
        message: err.message || "Katalogu nuk u lexua.",
      });
    }
  });

  router.get("/variants/:id", async (req, res) => {
    try {
      const id = String(req.params.id || "").trim();
      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        return res.status(400).json({ message: "Variant id i pavlefshëm." });
      }

      const variant = await catalogGet(`/v1/variants/${id}`);
      const lookups = await loadLookups();
      res.json({
        variant: camel(variant),
        fields: mapFields(variant, lookups),
      });
    } catch (err) {
      res.status(err.status || 502).json({
        message: err.message || "Specifikat e variantit nuk u morën.",
      });
    }
  });

  return router;
}
