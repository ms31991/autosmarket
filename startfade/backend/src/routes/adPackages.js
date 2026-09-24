import { Router } from "express";
import { query, queryOne } from "../db.js";
import { camel, pick } from "../camel.js";

const DEFAULTS = [
  { kind: "listing", name: "Weekly", days: 7, price: 2.99, description: "Homepage listing for 7 days." },
  { kind: "listing", name: "Monthly", days: 30, price: 5.99, description: "Homepage listing for 30 days." },
  { kind: "listing", name: "Yearly", days: 365, price: 49.99, description: "Homepage listing for 365 days." },
  { kind: "banner", name: "Weekly", days: 7, price: 9.99, description: "Company banner for 7 days." },
  { kind: "banner", name: "Monthly", days: 30, price: 24.99, description: "Company banner for 30 days." },
  { kind: "banner", name: "Yearly", days: 365, price: 149.99, description: "Company banner for 365 days." },
];

export async function ensureAdPackagesTable() {
  await query(`
    IF OBJECT_ID(N'dbo.AdPackages', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.AdPackages (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Kind NVARCHAR(20) NOT NULL,
        Name NVARCHAR(40) NOT NULL,
        DurationDays INT NOT NULL,
        Price DECIMAL(10,2) NOT NULL,
        Description NVARCHAR(300) NULL,
        IsActive BIT NOT NULL CONSTRAINT DF_AdPackages_IsActive DEFAULT 1
      );
    END
  `);
  const count = await queryOne(`SELECT COUNT(*) AS total FROM AdPackages`);
  if (!Number(count?.total)) {
    for (const item of DEFAULTS) {
      await query(
        `INSERT INTO AdPackages (Kind, Name, DurationDays, Price, Description, IsActive)
         VALUES (@kind, @name, @days, @price, @description, 1)`,
        {
          kind: item.kind,
          name: item.name,
          days: item.days,
          price: item.price,
          description: item.description,
        }
      );
    }
  }
}

function mapPackage(row) {
  const data = camel(row);
  return {
    id: data.id,
    kind: data.kind,
    name: data.name,
    days: Number(data.durationDays),
    price: Number(data.price),
    description: data.description || "",
    isActive: data.isActive !== false && data.isActive !== 0,
  };
}

export async function listAdPackages(kind) {
  const rows = kind
    ? await query(
        `SELECT * FROM AdPackages WHERE Kind = @kind AND IsActive = 1 ORDER BY DurationDays`,
        { kind }
      )
    : await query(
        `SELECT * FROM AdPackages WHERE IsActive = 1 ORDER BY Kind, DurationDays`
      );
  return rows.map(mapPackage);
}

export async function listAllAdPackages() {
  const rows = await query(`SELECT * FROM AdPackages ORDER BY Kind, DurationDays`);
  return rows.map(mapPackage);
}

export async function updateAdPackage(id, { price, isActive }) {
  const nextPrice = Number(price);
  if (!Number.isFinite(nextPrice) || nextPrice <= 0) {
    throw new Error("Enter a valid price.");
  }
  await query(
    `UPDATE AdPackages
     SET Price = @price,
         IsActive = COALESCE(@isActive, IsActive)
     WHERE Id = @id`,
    {
      id: Number(id),
      price: nextPrice,
      isActive:
        isActive === undefined || isActive === null
          ? null
          : isActive === false || isActive === 0 || isActive === "0"
            ? 0
            : 1,
    }
  );
  const row = await queryOne(`SELECT * FROM AdPackages WHERE Id = @id`, { id: Number(id) });
  return row ? mapPackage(row) : null;
}

export async function findAdPackage(kind, days, name) {
  const duration = Number(days);
  if (Number.isFinite(duration) && duration > 0) {
    const byDays = await queryOne(
      `SELECT TOP 1 * FROM AdPackages
       WHERE Kind = @kind AND DurationDays = @days AND IsActive = 1
       ORDER BY Id`,
      { kind, days: duration }
    );
    if (byDays) return mapPackage(byDays);
  }
  const label = String(name || "").toLowerCase();
  if (label) {
    const rows = await listAdPackages(kind);
    const match = rows.find((item) => label.includes(item.name.toLowerCase()));
    if (match) return match;
  }
  return null;
}

export function adPackagesRouter() {
  const router = Router();
  router.get("/", async (req, res) => {
    const kind = String(req.query.kind || "").trim();
    res.json(await listAdPackages(kind || undefined));
  });
  return router;
}
