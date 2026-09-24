import { Router } from "express";
import { query, queryOne } from "../db.js";
import { camel, pick } from "../camel.js";
import { requireAuth } from "../auth.js";
import { toPublicUrl } from "../paths.js";
import { keysFromAuth, ownsRecord, requireDbUser, resolveUserKeys, userMatchSql } from "../identity.js";

const VEHICLE_SELECT = `
  SELECT
    v.Id, v.OwnerId, u.ClerkUserId AS OwnerClerkUserId,
    u.Name AS OwnerName, u.Surname AS OwnerSurname,
    u.ProfileImage AS OwnerProfileImage,
    v.ListingTypeId, lt.Name AS ListingTypeName,
    v.CategoryId, c.Name AS CategoryName,
    v.BrandId, b.Name AS BrandName,
    v.ModelId, m.Name AS ModelName,
    v.BodyTypeId, bt.Name AS BodyTypeName,
    v.FuelTypeId, ft.Name AS FuelTypeName,
    v.TransmissionId, t.Name AS TransmissionName,
    v.DriveTypeId, dt.Name AS DriveTypeName,
    v.ConditionId, cond.Name AS ConditionName,
    v.ColorId, col.Name AS ColorName,
    v.CityId, city.Name AS CityName,
    v.Price, v.Year, v.Mileage, v.Engine, v.EngineCC, v.PowerHP, v.PowerKW,
    v.Cylinders, v.Doors, v.Seats, v.VIN, v.CreatedDate,
    CASE WHEN EXISTS (
      SELECT 1 FROM Advertisements a
      WHERE a.VehicleId = v.Id
        AND a.Status = 2
        AND a.EndDate > SYSUTCDATETIME()
    ) THEN 1 ELSE 0 END AS IsPromoted
  FROM Vehicles v
  LEFT JOIN ApplicationUsers u ON (
    CONVERT(nvarchar(128), u.Id) = CONVERT(nvarchar(128), v.OwnerId)
    OR CONVERT(nvarchar(128), u.ClerkUserId) = CONVERT(nvarchar(128), v.OwnerId)
  )
  LEFT JOIN ListingTypes lt ON lt.Id = v.ListingTypeId
  LEFT JOIN VehicleCategories c ON c.Id = v.CategoryId
  LEFT JOIN Brands b ON b.Id = v.BrandId
  LEFT JOIN VehicleModels m ON m.Id = v.ModelId
  LEFT JOIN BodyTypes bt ON bt.Id = v.BodyTypeId
  LEFT JOIN FuelTypes ft ON ft.Id = v.FuelTypeId
  LEFT JOIN Transmissions t ON t.Id = v.TransmissionId
  LEFT JOIN DriveTypes dt ON dt.Id = v.DriveTypeId
  LEFT JOIN Conditions cond ON cond.Id = v.ConditionId
  LEFT JOIN Colors col ON col.Id = v.ColorId
  LEFT JOIN Cities city ON city.Id = v.CityId
`;

async function withImages(vehicles) {
  const list = camel(vehicles);
  if (!list.length) return list;
  const ids = list.map((v) => v.id);
  const params = {};
  ids.forEach((id, i) => {
    params[`id${i}`] = id;
  });
  const images = await query(
    `SELECT VehicleId, ImageUrl FROM VehicleImages
     WHERE VehicleId IN (${ids.map((_, i) => `@id${i}`).join(",")})
     ORDER BY SortOrder`,
    params
  );
  const byVehicle = {};
  for (const img of images) {
    if (!byVehicle[img.VehicleId]) byVehicle[img.VehicleId] = [];
    byVehicle[img.VehicleId].push(toPublicUrl(img.ImageUrl));
  }
  return list.map((v) => ({
    ...v,
    images: byVehicle[v.id] || [],
    ownerProfileImage: toPublicUrl(v.ownerProfileImage) || null,
  }));
}

function vehicleParams(body) {
  return {
    categoryId: pick(body, "CategoryId"),
    brandId: pick(body, "BrandId"),
    modelId: pick(body, "ModelId"),
    listingTypeId: pick(body, "ListingTypeId"),
    bodyTypeId: pick(body, "BodyTypeId"),
    fuelTypeId: pick(body, "FuelTypeId"),
    transmissionId: pick(body, "TransmissionId"),
    driveTypeId: pick(body, "DriveTypeId"),
    conditionId: pick(body, "ConditionId"),
    colorId: pick(body, "ColorId"),
    cityId: pick(body, "CityId"),
    year: pick(body, "Year"),
    mileage: pick(body, "Mileage"),
    engine: pick(body, "Engine"),
    engineCC: pick(body, "EngineCC"),
    powerHP: pick(body, "PowerHP"),
    powerKW: pick(body, "PowerKW"),
    cylinders: pick(body, "Cylinders"),
    doors: pick(body, "Doors"),
    seats: pick(body, "Seats"),
    vin: pick(body, "VIN") ?? pick(body, "Vin"),
    price: pick(body, "Price"),
  };
}

export function vehiclesRouter() {
  const router = Router();

  router.get("/", async (_req, res) => {
    const rows = await query(`${VEHICLE_SELECT} ORDER BY v.CreatedDate DESC`);
    res.json(await withImages(rows));
  });

  router.get("/my", requireAuth, async (req, res) => {
    const keys = keysFromAuth(req.user);
    const rows = await query(
      `${VEHICLE_SELECT} WHERE ${userMatchSql("v.OwnerId", "ownerId", "clerkUserId")}
       ORDER BY v.CreatedDate DESC`,
      { ownerId: keys.id, clerkUserId: keys.clerkUserId || keys.id }
    );
    res.json(await withImages(rows));
  });

  router.get("/owner/:ownerId", async (req, res) => {
    const keys = await resolveUserKeys(req.params.ownerId);
    const rows = await query(
      `${VEHICLE_SELECT} WHERE ${userMatchSql("v.OwnerId", "ownerId", "clerkUserId")}
       ORDER BY v.CreatedDate DESC`,
      { ownerId: keys.id, clerkUserId: keys.clerkUserId || keys.id }
    );
    res.json(await withImages(rows));
  });

  router.get("/search", async (req, res) => {
    const q = req.query;
    const page = Math.max(1, Number(q.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 10));
    const where = [];
    const params = {};

    function add(name, sql, value) {
      if (value === undefined || value === null || value === "") return;
      params[name] = value;
      where.push(sql);
    }

    add(
      "search",
      `(b.Name LIKE '%' + @search + '%'
        OR m.Name LIKE '%' + @search + '%'
        OR v.Engine LIKE '%' + @search + '%'
        OR c.Name LIKE '%' + @search + '%'
        OR bt.Name LIKE '%' + @search + '%'
        OR ft.Name LIKE '%' + @search + '%'
        OR city.Name LIKE '%' + @search + '%'
        OR lt.Name LIKE '%' + @search + '%')`,
      q.search
    );
    add("brandId", "v.BrandId = @brandId", q.brandId ? Number(q.brandId) : null);
    add("modelId", "v.ModelId = @modelId", q.modelId ? Number(q.modelId) : null);
    add("categoryId", "v.CategoryId = @categoryId", q.categoryId ? Number(q.categoryId) : null);
    add("cityId", "v.CityId = @cityId", q.cityId ? Number(q.cityId) : null);
    add("bodyTypeId", "v.BodyTypeId = @bodyTypeId", q.bodyTypeId ? Number(q.bodyTypeId) : null);
    add("fuelTypeId", "v.FuelTypeId = @fuelTypeId", q.fuelTypeId ? Number(q.fuelTypeId) : null);
    add("transmissionId", "v.TransmissionId = @transmissionId", q.transmissionId ? Number(q.transmissionId) : null);
    add("driveTypeId", "v.DriveTypeId = @driveTypeId", q.driveTypeId ? Number(q.driveTypeId) : null);
    add("conditionId", "v.ConditionId = @conditionId", q.conditionId ? Number(q.conditionId) : null);
    add("colorId", "v.ColorId = @colorId", q.colorId ? Number(q.colorId) : null);
    add("minPrice", "v.Price >= @minPrice", q.minPrice);
    add("maxPrice", "v.Price <= @maxPrice", q.maxPrice);
    add("minYear", "v.Year >= @minYear", q.minYear);
    add("maxYear", "v.Year <= @maxYear", q.maxYear);
    add("minMileage", "v.Mileage >= @minMileage", q.minMileage);
    add("maxMileage", "v.Mileage <= @maxMileage", q.maxMileage);

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const sortMap = {
      priceasc: "v.Price ASC",
      pricedesc: "v.Price DESC",
      oldest: "v.CreatedDate ASC",
      newest: "v.CreatedDate DESC",
      yearasc: "v.Year ASC",
      yeardesc: "v.Year DESC",
      mileageasc: "v.Mileage ASC",
      mileagedesc: "v.Mileage DESC",
    };
    const order = sortMap[(q.sortBy || "newest").toLowerCase()] || "v.CreatedDate DESC";

    const countRow = await queryOne(
      `SELECT COUNT(*) AS total FROM Vehicles v
       LEFT JOIN ListingTypes lt ON lt.Id = v.ListingTypeId
       LEFT JOIN VehicleCategories c ON c.Id = v.CategoryId
       LEFT JOIN Brands b ON b.Id = v.BrandId
       LEFT JOIN VehicleModels m ON m.Id = v.ModelId
       LEFT JOIN BodyTypes bt ON bt.Id = v.BodyTypeId
       LEFT JOIN FuelTypes ft ON ft.Id = v.FuelTypeId
       LEFT JOIN Cities city ON city.Id = v.CityId
       ${whereSql}`,
      params
    );
    const totalCount = countRow?.total || 0;
    params.offset = (page - 1) * pageSize;
    params.pageSize = pageSize;
    const rows = await query(
      `${VEHICLE_SELECT} ${whereSql}
       ORDER BY IsPromoted DESC, ${order}
       OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`,
      params
    );

    res.json({
      items: await withImages(rows),
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize) || 0,
    });
  });

  router.get("/:id", async (req, res) => {
    const row = await queryOne(`${VEHICLE_SELECT} WHERE v.Id = @id`, {
      id: Number(req.params.id),
    });
    if (!row) return res.status(404).json({ message: "Vehicle nuk u gjet." });
    const [vehicle] = await withImages([row]);
    res.json(vehicle);
  });

  router.post("/:id/report", requireAuth, async (req, res) => {
    const vehicleId = Number(req.params.id);
    const vehicle = await queryOne(`SELECT Id FROM Vehicles WHERE Id = @id`, { id: vehicleId });
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found." });
    const reason = String(pick(req.body, "Reason") || "").trim().slice(0, 80);
    const details = String(pick(req.body, "Details") || "").trim().slice(0, 1000);
    if (!reason) return res.status(400).json({ message: "Reason is required." });
    await query(
      `INSERT INTO ListingReports (VehicleId, ReporterUserId, Reason, Details, Status)
       VALUES (@vehicleId, @reporter, @reason, @details, 0)`,
      {
        vehicleId,
        reporter: req.user?.id ? String(req.user.id) : null,
        reason,
        details: details || null,
      }
    );
    res.json({ ok: true });
  });

  router.post("/", requireAuth, async (req, res) => {
    const owner = await requireDbUser(req.user);
    if (!owner?.id) {
      return res.status(401).json({ message: "User nuk u gjet. Kyçu përsëri." });
    }

    const p = vehicleParams(req.body);
    if (!p.categoryId || !p.brandId || !p.modelId || !p.listingTypeId || !p.price || !p.year) {
      return res.status(400).json({ message: "Fushat e detyrueshme mungojnë." });
    }

    const userIdColumn = await queryOne(
      `SELECT COL_LENGTH('dbo.Vehicles', 'UserId') AS len`
    );
    const hasUserId = Boolean(userIdColumn?.len);

    const result = hasUserId
      ? await query(
          `INSERT INTO Vehicles
            (OwnerId, UserId, CategoryId, BrandId, ModelId, ListingTypeId, BodyTypeId, FuelTypeId,
             TransmissionId, DriveTypeId, ConditionId, ColorId, CityId, Year, Mileage, Engine,
             EngineCC, PowerHP, PowerKW, Cylinders, Doors, Seats, VIN, Price, CreatedDate)
           OUTPUT INSERTED.Id, INSERTED.OwnerId
           VALUES
            (@ownerId, @userId, @categoryId, @brandId, @modelId, @listingTypeId, @bodyTypeId, @fuelTypeId,
             @transmissionId, @driveTypeId, @conditionId, @colorId, @cityId, @year, @mileage, @engine,
             @engineCC, @powerHP, @powerKW, @cylinders, @doors, @seats, @vin, @price, SYSUTCDATETIME())`,
          { ...p, ownerId: owner.id, userId: owner.id }
        )
      : await query(
          `INSERT INTO Vehicles
            (OwnerId, CategoryId, BrandId, ModelId, ListingTypeId, BodyTypeId, FuelTypeId,
             TransmissionId, DriveTypeId, ConditionId, ColorId, CityId, Year, Mileage, Engine,
             EngineCC, PowerHP, PowerKW, Cylinders, Doors, Seats, VIN, Price, CreatedDate)
           OUTPUT INSERTED.Id, INSERTED.OwnerId
           VALUES
            (@ownerId, @categoryId, @brandId, @modelId, @listingTypeId, @bodyTypeId, @fuelTypeId,
             @transmissionId, @driveTypeId, @conditionId, @colorId, @cityId, @year, @mileage, @engine,
             @engineCC, @powerHP, @powerKW, @cylinders, @doors, @seats, @vin, @price, SYSUTCDATETIME())`,
          { ...p, ownerId: owner.id }
        );

    res.json({
      message: "Vehicle u krijua me sukses.",
      vehicleId: result[0].Id,
      ownerId: result[0].OwnerId,
    });
  });

  router.put("/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await queryOne(`SELECT OwnerId FROM Vehicles WHERE Id = @id`, { id });
    if (!existing) return res.status(404).json({ message: "Vehicle nuk u gjet." });
    if (!ownsRecord(existing.OwnerId, req.user) && req.user.roleName !== "Admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const p = vehicleParams(req.body);
    await query(
      `UPDATE Vehicles SET
        CategoryId=@categoryId, BrandId=@brandId, ModelId=@modelId, ListingTypeId=@listingTypeId,
        BodyTypeId=@bodyTypeId, FuelTypeId=@fuelTypeId, TransmissionId=@transmissionId,
        DriveTypeId=@driveTypeId, ConditionId=@conditionId, ColorId=@colorId, CityId=@cityId,
        Year=@year, Mileage=@mileage, Engine=@engine, EngineCC=@engineCC, PowerHP=@powerHP,
        PowerKW=@powerKW, Cylinders=@cylinders, Doors=@doors, Seats=@seats, VIN=@vin, Price=@price
       WHERE Id=@id`,
      { ...p, id }
    );
    res.status(204).end();
  });

  router.delete("/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await queryOne(`SELECT OwnerId FROM Vehicles WHERE Id = @id`, { id });
    if (!existing) return res.status(404).json({ message: "Vehicle nuk u gjet." });
    if (!ownsRecord(existing.OwnerId, req.user) && req.user.roleName !== "Admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    await query(`DELETE FROM Vehicles WHERE Id = @id`, { id });
    res.status(204).end();
  });

  return router;
}
