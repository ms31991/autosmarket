export function normalizePlace(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

export function filterBrandSuggestions(brands, models, query) {
  const needle = normalizePlace(query);
  if (!needle) return [];
  const brandHits = brands
    .filter((brand) => normalizePlace(brand.name).includes(needle))
    .slice(0, 8)
    .map((brand) => ({
      key: `b-${brand.id}`,
      kind: "brand",
      label: brand.name,
      brand,
    }));
  const modelHits = models
    .filter((model) => normalizePlace(model.name).includes(needle))
    .slice(0, 8)
    .map((model) => {
      const brand = brands.find(
        (item) => Number(item.id) === Number(model.brandId)
      );
      return {
        key: `m-${model.id}`,
        kind: "model",
        label: brand ? `${model.name} · ${brand.name}` : model.name,
        brand,
        model,
      };
    });
  const seen = new Set();
  const merged = [];
  for (const item of [...brandHits, ...modelHits]) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    merged.push(item);
  }
  return merged.slice(0, 12);
}

export function filterModelSuggestions(models, query, brandId) {
  const needle = normalizePlace(query);
  let list = models;
  if (brandId) {
    list = models.filter((model) => Number(model.brandId) === Number(brandId));
  }
  if (!needle) return list.slice(0, 12);
  return list
    .filter((model) => normalizePlace(model.name).includes(needle))
    .slice(0, 12);
}

export function lookupLabel(t, item) {
  const map = {
    car: "lookup_car",
    cars: "lookup_car",
    veture: "lookup_car",
    vetura: "lookup_car",
    automobil: "lookup_car",
    motorcycle: "lookup_motorcycle",
    motorbike: "lookup_motorcycle",
    moto: "lookup_motorcycle",
    motociklete: "lookup_motorcycle",
    van: "lookup_van",
    minivan: "lookup_van",
    furgon: "lookup_van",
    transporter: "lookup_van",
    truck: "lookup_truck",
    lorry: "lookup_truck",
    kamion: "lookup_truck",
    lkw: "lookup_truck",
    bus: "lookup_bus",
    autobus: "lookup_bus",
    other: "lookup_other",
    tjeter: "lookup_other",
    sonstiges: "lookup_other",
    manual: "lookup_manual",
    manuel: "lookup_manual",
    schaltgetriebe: "lookup_manual",
    automatic: "lookup_automatic",
    automatik: "lookup_automatic",
    automatikgetriebe: "lookup_automatic",
    cvt: "lookup_cvt",
    dct: "lookup_dct",
    dsg: "lookup_dct",
    dualclutch: "lookup_dct",
    fwd: "lookup_fwd",
    front: "lookup_fwd",
    frontwheel: "lookup_fwd",
    frontwheeldrive: "lookup_fwd",
    vorderrad: "lookup_fwd",
    terheqjepra: "lookup_fwd",
    rwd: "lookup_rwd",
    rear: "lookup_rwd",
    rearwheel: "lookup_rwd",
    rearwheeldrive: "lookup_rwd",
    hinterrad: "lookup_rwd",
    terheqjeprapa: "lookup_rwd",
    awd: "lookup_awd",
    allwheel: "lookup_awd",
    allrad: "lookup_awd",
    "4wd": "lookup_4wd",
    "4x4": "lookup_4wd",
    fourwheel: "lookup_4wd",
  };
  const candidates = [item?.slug, item?.name, item];
  for (const raw of candidates) {
    const n = normalizePlace(raw);
    if (!n) continue;
    const key = map[n];
    if (!key) continue;
    const label = t(key);
    if (label && label !== key) return label;
  }
  return String(item?.name || item || "");
}

export function bodyTypeHintFromModel(modelName) {
  const model = normalizePlace(modelName);
  if (/(suv|crossover|x[1-7]|q[2378]|gl[abcse]|touareg|tiguan|sportage|tucson|rav4|kuga|qashqai|duster|kodiaq)/.test(model)) {
    return "suv";
  }
  if (/(hatch|golf|polo|fiesta|clio|civic|ibiza|fabia|corsa|i20|swift)/.test(model)) {
    return "hatchback";
  }
  if (/(coupe|911|mustang|tt|z4)/.test(model)) return "coupe";
  if (/(cabrio|convertible)/.test(model)) return "cabriolet";
  if (/(touran|sharan|van|transporter|vito|sprinter)/.test(model)) return "van";
  if (/(passat|accord|camry|octavia|superb|a4|a6|3series|5series|eclass|cclass|mondeo)/.test(model)) {
    return "sedan";
  }
  return "";
}
