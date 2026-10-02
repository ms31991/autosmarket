import { query, queryOne } from "./db.js";

const CATALOG = [
  ["Volkswagen", ["Golf", "Polo", "Passat", "Tiguan", "Touareg", "Touran", "Sharan", "Caddy", "Arteon", "T-Roc", "T-Cross", "ID.3", "ID.4", "ID.Buzz", "Jetta", "Scirocco", "Beetle", "Up"]],
  ["Audi", ["A1", "A3", "A4", "A5", "A6", "A7", "A8", "Q2", "Q3", "Q5", "Q7", "Q8", "TT", "R8", "e-tron", "Q4 e-tron"]],
  ["BMW", ["1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "6 Series", "7 Series", "8 Series", "X1", "X2", "X3", "X4", "X5", "X6", "X7", "Z4", "i3", "i4", "iX", "M3", "M4", "M5"]],
  ["Mercedes-Benz", ["A-Class", "B-Class", "C-Class", "E-Class", "S-Class", "CLA", "CLS", "GLA", "GLB", "GLC", "GLE", "GLS", "G-Class", "V-Class", "Sprinter", "AMG GT", "EQA", "EQB", "EQC", "EQE", "EQS"]],
  ["Opel", ["Corsa", "Astra", "Insignia", "Mokka", "Crossland", "Grandland", "Combo", "Zafira", "Vectra", "Meriva"]],
  ["Ford", ["Fiesta", "Focus", "Mondeo", "Puma", "Kuga", "Mustang", "Ranger", "Transit", "S-Max", "Galaxy", "EcoSport", "Explorer"]],
  ["Renault", ["Clio", "Megane", "Captur", "Kadjar", "Austral", "Scenic", "Talisman", "Laguna", "Twingo", "Arkana", "Duster", "Master", "Trafic"]],
  ["Peugeot", ["208", "308", "508", "2008", "3008", "5008", "Partner", "Rifter", "Boxer", "407", "206"]],
  ["Citroën", ["C3", "C4", "C5", "C5 Aircross", "C3 Aircross", "Berlingo", "Jumper", "C1", "C4 Picasso"]],
  ["Fiat", ["500", "Panda", "Punto", "Tipo", "500X", "500L", "Doblo", "Ducato", "Bravo"]],
  ["Alfa Romeo", ["Giulia", "Stelvio", "Giulietta", "MiTo", "159", "147", "Tonale"]],
  ["Toyota", ["Yaris", "Corolla", "Camry", "Auris", "RAV4", "C-HR", "Highlander", "Land Cruiser", "Hilux", "Prius", "Aygo", "Avensis", "Supra"]],
  ["Honda", ["Civic", "Accord", "CR-V", "HR-V", "Jazz", "Pilot", "e"]],
  ["Hyundai", ["i10", "i20", "i30", "i40", "Tucson", "Santa Fe", "Kona", "Ioniq", "Ioniq 5", "Bayon", "Elantra"]],
  ["Kia", ["Picanto", "Rio", "Ceed", "Ceed SW", "Sportage", "Sorento", "Niro", "Stonic", "EV6", "XCeed", "Carnival"]],
  ["Škoda", ["Fabia", "Octavia", "Superb", "Kamiq", "Karoq", "Kodiaq", "Rapid", "Scala", "Enyaq", "Yeti"]],
  ["SEAT", ["Ibiza", "Leon", "Ateca", "Arona", "Tarraco", "Alhambra", "Toledo", "Cupra Formentor"]],
  ["Cupra", ["Formentor", "Leon", "Ateca", "Born"]],
  ["Dacia", ["Sandero", "Duster", "Logan", "Jogger", "Spring", "Lodgy", "Dokker"]],
  ["Volvo", ["V40", "V60", "V90", "S60", "S90", "XC40", "XC60", "XC90", "C40"]],
  ["Mazda", ["2", "3", "6", "CX-3", "CX-30", "CX-5", "CX-60", "MX-5"]],
  ["Nissan", ["Micra", "Note", "Qashqai", "Juke", "X-Trail", "Navara", "Leaf", "370Z", "Patrol"]],
  ["Mitsubishi", ["Lancer", "ASX", "Outlander", "Pajero", "L200", "Colt", "Eclipse Cross"]],
  ["Suzuki", ["Swift", "Vitara", "SX4", "Jimny", "Ignis", "S-Cross", "Alto"]],
  ["Jeep", ["Renegade", "Compass", "Cherokee", "Grand Cherokee", "Wrangler", "Avenger"]],
  ["Land Rover", ["Defender", "Discovery", "Discovery Sport", "Range Rover", "Range Rover Sport", "Range Rover Evoque", "Range Rover Velar", "Freelander"]],
  ["Porsche", ["911", "Cayenne", "Macan", "Panamera", "Taycan", "Boxster", "Cayman"]],
  ["Tesla", ["Model 3", "Model Y", "Model S", "Model X"]],
  ["MINI", ["Cooper", "Countryman", "Clubman", "Paceman", "Cabrio"]],
  ["Jaguar", ["XE", "XF", "XJ", "F-Pace", "E-Pace", "I-Pace", "F-Type"]],
  ["Lexus", ["IS", "ES", "GS", "LS", "NX", "RX", "UX", "CT"]],
  ["Subaru", ["Impreza", "Forester", "Outback", "XV", "Legacy", "WRX"]],
  ["Chevrolet", ["Aveo", "Cruze", "Captiva", "Spark", "Camaro", "Tahoe"]],
  ["Chrysler", ["300C", "Voyager", "Pacifica"]],
  ["Dodge", ["Charger", "Challenger", "Durango", "Ram"]],
  ["Lada", ["Niva", "Granta", "Vesta", "Kalina", "Priora", "2107"]],
  ["Zastava", ["Yugo", "101", "Florida"]],
  ["Maybach", ["S-Class", "GLS", "57", "62"]],
  ["Smart", ["Fortwo", "Forfour", "#1"]],
  ["Iveco", ["Daily", "Eurocargo"]],
  ["MAN", ["TGE", "TGX"]],
  ["BYD", ["Atto 3", "Dolphin", "Seal", "Seal U", "Tang", "Han", "Song Plus"]],
  ["Chery", ["Tiggo 4", "Tiggo 7", "Tiggo 8", "Arrizo 5", "QQ"]],
  ["Haval", ["Jolion", "H6", "H9", "Dargo"]],
  ["MG", ["ZS", "HS", "MG4", "MG5", "Marvel R"]],
];

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "item";
}

async function uniqueSlug(table, base) {
  const root = slugify(base);
  let slug = root;
  let n = 2;
  while (await queryOne(`SELECT Id FROM ${table} WHERE Slug = @slug`, { slug })) {
    slug = `${root}-${n}`;
    n += 1;
  }
  return slug;
}

export async function ensureBrandModelSeed() {
  const hasActive = Boolean(
    (await queryOne(`SELECT COL_LENGTH('dbo.Brands', 'IsActive') AS len`))?.len
  );
  let added = 0;
  for (const [brandName, models] of CATALOG) {
    let brand = await queryOne(
      `SELECT TOP 1 Id FROM Brands WHERE LOWER(LTRIM(RTRIM(Name))) = LOWER(@name)`,
      { name: brandName }
    );
    let brandId = brand?.Id ?? brand?.id;
    if (!brandId) {
      const slug = await uniqueSlug("Brands", brandName);
      const rows = hasActive
        ? await query(
            `INSERT INTO Brands (Name, Slug, IsActive) OUTPUT INSERTED.Id VALUES (@name, @slug, 1)`,
            { name: brandName, slug }
          )
        : await query(
            `INSERT INTO Brands (Name, Slug) OUTPUT INSERTED.Id VALUES (@name, @slug)`,
            { name: brandName, slug }
          );
      brandId = rows[0]?.Id ?? rows[0]?.id;
      added += 1;
    }
    if (!brandId) continue;
    for (const modelName of models) {
      const existing = await queryOne(
        `SELECT TOP 1 Id FROM VehicleModels
         WHERE BrandId = @brandId AND LOWER(LTRIM(RTRIM(Name))) = LOWER(@name)`,
        { brandId, name: modelName }
      );
      if (existing?.Id ?? existing?.id) continue;
      const slug = await uniqueSlug("VehicleModels", `${brandName} ${modelName}`);
      try {
        await query(
          `INSERT INTO VehicleModels (Name, Slug, BrandId) VALUES (@name, @slug, @brandId)`,
          { name: modelName, slug, brandId }
        );
        added += 1;
      } catch {
        /* unique race */
      }
    }
  }
  if (added) console.log(`Brand/model seed: added ${added} rows.`);
}
