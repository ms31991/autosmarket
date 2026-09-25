import { Router } from "express";
import { query, queryOne } from "../db.js";
import { camel, pick } from "../camel.js";
import { requireAuth, requireAdmin } from "../auth.js";
import { keysFromAuth, resolveUserKeys, userMatchSql, ownsRecord } from "../identity.js";
import { toPublicUrl } from "../paths.js";
import { withPublicOwnerNames } from "../personName.js";

const PURCHASE_STATUS = { 1: "Pending", 2: "Paid", 3: "Failed", 4: "Cancelled" };

function mapPurchase(row) {
  const p = camel(row);
  p.status = PURCHASE_STATUS[row.Status] || String(row.Status);
  return p;
}

export function reviewsRouter() {
  const router = Router();

  router.get("/seller/:sellerId/summary", async (req, res) => {
    const sellerId = req.params.sellerId;
    const seller = await queryOne(`SELECT Id FROM ApplicationUsers WHERE Id = @id`, {
      id: sellerId,
    });
    if (!seller) return res.status(404).json({ message: "Seller nuk u gjet." });
    const rows = await query(
      `SELECT Rating FROM Reviews WHERE SellerId = @sellerId`,
      { sellerId }
    );
    const ratings = rows.map((r) => r.Rating);
    const summary = {
      sellerId,
      totalReviews: ratings.length,
      averageRating: ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0,
      rating5: ratings.filter((r) => r === 5).length,
      rating4: ratings.filter((r) => r === 4).length,
      rating3: ratings.filter((r) => r === 3).length,
      rating2: ratings.filter((r) => r === 2).length,
      rating1: ratings.filter((r) => r === 1).length,
    };
    res.json(summary);
  });

  router.get("/seller/:sellerId", async (req, res) => {
    const rows = await query(
      `SELECT r.Id, r.ReviewerId, u.Name AS ReviewerName, u.Surname AS ReviewerSurname,
              u.ProfileImage AS ReviewerProfileImage, r.SellerId, r.Rating, r.Comment,
              r.CreatedAt, r.UpdatedAt
       FROM Reviews r
       LEFT JOIN ApplicationUsers u ON u.Id = r.ReviewerId
       WHERE r.SellerId = @sellerId
       ORDER BY r.CreatedAt DESC`,
      { sellerId: req.params.sellerId }
    );
    res.json(camel(rows));
  });

  router.get("/my-written", requireAuth, async (req, res) => {
    const rows = await query(
      `SELECT * FROM Reviews WHERE ReviewerId = @id ORDER BY CreatedAt DESC`,
      { id: req.user.id }
    );
    res.json(camel(rows));
  });

  router.get("/:id", async (req, res) => {
    const row = await queryOne(`SELECT * FROM Reviews WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    if (!row) return res.status(404).json({ message: "Review nuk u gjet." });
    res.json(camel(row));
  });

  router.post("/", requireAuth, async (req, res) => {
    const sellerId = pick(req.body, "SellerId");
    const rating = Number(pick(req.body, "Rating"));
    if (req.user.id === sellerId) {
      return res.status(400).json({ message: "Nuk mund t'i bëni review vetes." });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating duhet të jetë nga 1 deri në 5." });
    }
    const exists = await queryOne(
      `SELECT Id FROM Reviews WHERE ReviewerId = @reviewerId AND SellerId = @sellerId`,
      { reviewerId: req.user.id, sellerId }
    );
    if (exists) {
      return res.status(400).json({ message: "Ju tashmë i keni bërë review këtij seller-i." });
    }
    const result = await query(
      `INSERT INTO Reviews (ReviewerId, SellerId, Rating, Comment, CreatedAt)
       OUTPUT INSERTED.Id
       VALUES (@reviewerId, @sellerId, @rating, @comment, SYSUTCDATETIME())`,
      {
        reviewerId: req.user.id,
        sellerId,
        rating,
        comment: pick(req.body, "Comment") || null,
      }
    );
    res.status(201).json({ message: "Review u krijua me sukses.", reviewId: result[0].Id });
  });

  router.put("/:id", requireAuth, async (req, res) => {
    const review = await queryOne(`SELECT * FROM Reviews WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    if (!review) return res.status(404).json({ message: "Review nuk u gjet." });
    if (review.ReviewerId !== req.user.id && req.user.roleName !== "Admin") {
      return res.status(403).end();
    }
    await query(
      `UPDATE Reviews SET Rating = @rating, Comment = @comment, UpdatedAt = SYSUTCDATETIME()
       WHERE Id = @id`,
      {
        id: review.Id,
        rating: pick(req.body, "Rating"),
        comment: pick(req.body, "Comment") || null,
      }
    );
    res.json({ message: "Review u përditësua me sukses." });
  });

  router.delete("/:id", requireAuth, async (req, res) => {
    const review = await queryOne(`SELECT * FROM Reviews WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    if (!review) return res.status(404).json({ message: "Review nuk u gjet." });
    if (review.ReviewerId !== req.user.id && req.user.roleName !== "Admin") {
      return res.status(403).end();
    }
    await query(`DELETE FROM Reviews WHERE Id = @id`, { id: review.Id });
    res.status(204).end();
  });

  return router;
}

export function rentalBookingsRouter() {
  const router = Router();

  router.get("/all", requireAdmin, async (_req, res) => {
    const rows = await query(`SELECT * FROM RentalBookings ORDER BY CreatedAt DESC`);
    res.json(camel(rows));
  });

  router.get("/", requireAuth, async (req, res) => {
    const rows = await query(
      `SELECT * FROM RentalBookings WHERE CustomerId = @id ORDER BY CreatedAt DESC`,
      { id: req.user.id }
    );
    res.json(camel(rows));
  });

  router.get("/:id", requireAuth, async (req, res) => {
    const row = await queryOne(`SELECT * FROM RentalBookings WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    if (!row) return res.status(404).json({ message: "Not found." });
    if (row.CustomerId !== req.user.id && req.user.roleName !== "Admin") {
      return res.status(403).end();
    }
    res.json(camel(row));
  });

  router.post("/", requireAuth, async (req, res) => {
    const rentalDetailsId = pick(req.body, "RentalDetailsId");
    const startDate = pick(req.body, "StartDate");
    const endDate = pick(req.body, "EndDate");
    const details = await queryOne(
      `SELECT * FROM RentalDetails WHERE Id = @id`,
      { id: rentalDetailsId }
    );
    if (!details) return res.status(404).json({ message: "Rental details not found." });
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const pricePerDay = details.PricePerDay;
    const result = await query(
      `INSERT INTO RentalBookings
        (RentalDetailsId, CustomerId, StartDate, EndDate, PricePerDay, TotalDays, TotalPrice, Deposit, Status, CreatedAt)
       OUTPUT INSERTED.*
       VALUES (@rentalDetailsId, @customerId, @startDate, @endDate, @pricePerDay, @totalDays, @totalPrice, @deposit, 1, SYSUTCDATETIME())`,
      {
        rentalDetailsId,
        customerId: req.user.id,
        startDate,
        endDate,
        pricePerDay,
        totalDays,
        totalPrice: pricePerDay * totalDays,
        deposit: pick(req.body, "Deposit") ?? details.Deposit,
      }
    );
    res.status(201).json(camel(result[0]));
  });

  router.put("/:id/cancel", requireAuth, async (req, res) => {
    const booking = await queryOne(`SELECT * FROM RentalBookings WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    if (!booking) return res.status(404).json({ message: "Not found." });
    if (booking.CustomerId !== req.user.id) return res.status(403).end();
    if (booking.Status === 4 || booking.Status === 5) {
      return res.status(400).json({ message: "Cannot cancel." });
    }
    await query(`UPDATE RentalBookings SET Status = 5 WHERE Id = @id`, {
      id: booking.Id,
    });
    res.json({ message: "Cancelled." });
  });

  router.put("/:id/status", requireAdmin, async (req, res) => {
    const status = typeof req.body === "number" ? req.body : pick(req.body, "Status") ?? req.body.status;
    await query(`UPDATE RentalBookings SET Status = @status WHERE Id = @id`, {
      id: Number(req.params.id),
      status,
    });
    res.json({ message: "Status updated." });
  });

  router.delete("/:id", requireAuth, async (req, res) => {
    const booking = await queryOne(`SELECT * FROM RentalBookings WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    if (!booking) return res.status(404).json({ message: "Not found." });
    if (String(booking.CustomerId) !== String(req.user.id) && req.user.roleName !== "Admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    await query(`DELETE FROM RentalBookings WHERE Id = @id`, {
      id: booking.Id,
    });
    res.status(204).end();
  });

  return router;
}

async function findOwnedVehicle(userOrId, vehicleId) {
  const keys =
    typeof userOrId === "object" && userOrId
      ? keysFromAuth(userOrId)
      : await resolveUserKeys(userOrId);
  return queryOne(
    `SELECT * FROM Vehicles
     WHERE Id = @id AND ${userMatchSql("OwnerId", "ownerId", "clerkUserId")}`,
    {
      id: vehicleId,
      ownerId: keys.id,
      clerkUserId: keys.clerkUserId || keys.id,
    }
  );
}

async function createAdvertisementFromPackage(userId, { vehicleId, packageId, title, description, imageUrl, targetUrl }) {
  const vehicle = await findOwnedVehicle(userId, vehicleId);
  if (!vehicle) return { error: "Vehicle not found or not owned." };
  const pack = await queryOne(
    `SELECT * FROM AdvertisementPackages WHERE Id = @id AND IsActive = 1`,
    { id: packageId }
  );
  if (!pack) return { error: "Package not found." };
  const result = await query(
    `INSERT INTO Advertisements
      (AdvertiserId, VehicleId, AdvertisementPackageId, Title, Description, ImageUrl, TargetUrl,
       Status, Position, StartDate, EndDate, Price, CreatedAt)
     OUTPUT INSERTED.*
     VALUES
      (@advertiserId, @vehicleId, @packageId, @title, @description, @imageUrl, @targetUrl,
       2, @position, SYSUTCDATETIME(), DATEADD(day, @days, SYSUTCDATETIME()), @price, SYSUTCDATETIME())`,
    {
      advertiserId: userId,
      vehicleId,
      packageId,
      title: title || "Advertisement",
      description: description || null,
      imageUrl: imageUrl || null,
      targetUrl: targetUrl || `/vehicles/${vehicleId}`,
      position: pack.Position,
      days: pack.DurationDays,
      price: pack.Price,
    }
  );
  return { row: result[0] };
}

export function parseOfferDays(name, days) {
  const n = Number(days);
  if (Number.isFinite(n) && n > 0) return Math.round(n);
  const label = String(name || "").toLowerCase();
  if (label.includes("year")) return 365;
  if (label.includes("month")) return 30;
  if (label.includes("week")) return 7;
  return 7;
}

export async function fulfillPaidPromotion({
  userId,
  vehicleId,
  days,
  amount,
  offerName,
  packageId,
  extend = true,
}) {
  const vid = Number(vehicleId);
  const duration = parseOfferDays(offerName, days);
  if (!userId || !vid) return { error: "Missing promotion data." };

  const existing = await queryOne(
    `SELECT TOP 1 * FROM Advertisements
     WHERE VehicleId = @vehicleId AND Status = 2 AND EndDate > SYSUTCDATETIME()
     ORDER BY EndDate DESC`,
    { vehicleId: vid }
  );
  if (existing) {
    if (!extend) return { row: existing };
    await query(
      `UPDATE Advertisements
       SET EndDate = DATEADD(day, @days, EndDate), UpdatedAt = SYSUTCDATETIME()
       WHERE Id = @id`,
      { days: duration, id: existing.Id }
    );
    return {
      row: await queryOne(`SELECT * FROM Advertisements WHERE Id = @id`, {
        id: existing.Id,
      }),
    };
  }

  let pack = null;
  if (packageId) {
    pack = await queryOne(`SELECT * FROM AdvertisementPackages WHERE Id = @id`, {
      id: Number(packageId),
    });
  }
  if (!pack) {
    pack = await queryOne(
      `SELECT TOP 1 * FROM AdvertisementPackages
       WHERE DurationDays = @days
       ORDER BY Id`,
      { days: duration }
    );
  }
  if (!pack) {
    pack = await queryOne(`SELECT TOP 1 * FROM AdvertisementPackages ORDER BY Id`);
  }

  const image = await queryOne(
    `SELECT TOP 1 ImageUrl FROM VehicleImages
     WHERE VehicleId = @id
     ORDER BY SortOrder, Id`,
    { id: vid }
  );
  const title = String(offerName || "Advertisement").slice(0, 200);
  const imageUrl = image?.ImageUrl || null;
  const targetUrl = `/vehicles/${vid}`;
  const price = amount != null && amount !== "" ? Number(amount) : pack?.Price || 0;

  if (pack) {
    return createAdvertisementFromPackage(userId, {
      vehicleId: vid,
      packageId: pack.Id,
      title,
      imageUrl,
      targetUrl,
    });
  }

  try {
    const result = await query(
      `INSERT INTO Advertisements
        (AdvertiserId, VehicleId, Title, Description, ImageUrl, TargetUrl,
         Status, Position, StartDate, EndDate, Price, CreatedAt)
       OUTPUT INSERTED.*
       VALUES
        (@advertiserId, @vehicleId, @title, @description, @imageUrl, @targetUrl,
         2, 1, SYSUTCDATETIME(), DATEADD(day, @days, SYSUTCDATETIME()), @price, SYSUTCDATETIME())`,
      {
        advertiserId: userId,
        vehicleId: vid,
        title,
        description: null,
        imageUrl,
        targetUrl,
        days: duration,
        price,
      }
    );
    return { row: result[0] };
  } catch (err) {
    console.error("Advertisement insert without package failed:", err);
    return { error: err.message || "Could not create advertisement." };
  }
}

export { createAdvertisementFromPackage };

export function advertisementsRouter() {
  const router = Router();

  router.get("/", requireAdmin, async (_req, res) => {
    res.json(camel(await query(`SELECT * FROM Advertisements ORDER BY CreatedAt DESC`)));
  });

  router.get("/active", async (_req, res) => {
    const rows = await query(`
      SELECT
        a.Id, a.VehicleId, a.Title, a.Description, a.ImageUrl, a.TargetUrl,
        a.StartDate, a.EndDate, a.Price, a.Position,
        v.Year, v.Mileage, v.Price AS VehiclePrice, v.PowerHP,
        CONVERT(nvarchar(128), v.OwnerId) AS OwnerId,
        CONVERT(nvarchar(128), a.AdvertiserId) AS AdvertiserId,
        u.Name AS OwnerName,
        u.Surname AS OwnerSurname,
        u.UserName AS OwnerUserName,
        adv.Name AS AdvertiserName,
        adv.Surname AS AdvertiserSurname,
        COALESCE(u.ProfileImage, adv.ProfileImage) AS OwnerProfileImage,
        b.Name AS BrandName,
        m.Name AS ModelName,
        ft.Name AS FuelTypeName,
        city.Name AS CityName,
        (
          SELECT TOP 1 ImageUrl
          FROM VehicleImages vi
          WHERE vi.VehicleId = v.Id
          ORDER BY vi.SortOrder, vi.Id
        ) AS VehicleImageUrl
      FROM Advertisements a
      INNER JOIN Vehicles v ON v.Id = a.VehicleId
      LEFT JOIN ApplicationUsers u ON (
        CONVERT(nvarchar(128), u.Id) = CONVERT(nvarchar(128), v.OwnerId)
        OR CONVERT(nvarchar(128), u.ClerkUserId) = CONVERT(nvarchar(128), v.OwnerId)
      )
      LEFT JOIN ApplicationUsers adv ON (
        CONVERT(nvarchar(128), adv.Id) = CONVERT(nvarchar(128), a.AdvertiserId)
        OR CONVERT(nvarchar(128), adv.ClerkUserId) = CONVERT(nvarchar(128), a.AdvertiserId)
      )
      LEFT JOIN Brands b ON b.Id = v.BrandId
      LEFT JOIN VehicleModels m ON m.Id = v.ModelId
      LEFT JOIN FuelTypes ft ON ft.Id = v.FuelTypeId
      LEFT JOIN Cities city ON city.Id = v.CityId
      WHERE a.Status = 2
        AND a.EndDate > SYSUTCDATETIME()
      ORDER BY a.StartDate DESC`);
    res.json(
      camel(rows).map((row) =>
        withPublicOwnerNames({
          ...row,
          imageUrl: toPublicUrl(row.imageUrl),
          vehicleImageUrl: toPublicUrl(row.vehicleImageUrl),
          ownerId: row.ownerId || row.advertiserId,
          ownerName: row.ownerName || row.advertiserName,
          ownerSurname: row.ownerSurname || row.advertiserSurname,
          ownerProfileImage: toPublicUrl(row.ownerProfileImage),
        })
      )
    );
    );
  });

  router.get("/my", requireAuth, async (req, res) => {
    const keys = keysFromAuth(req.user);
    const rows = await query(
      `
      SELECT
        a.Id, a.VehicleId, a.Title, a.ImageUrl, a.Status, a.StartDate, a.EndDate, a.Price, a.CreatedAt,
        v.Year, v.Price AS VehiclePrice, v.Mileage,
        b.Name AS BrandName,
        m.Name AS ModelName,
        (
          SELECT TOP 1 ImageUrl
          FROM VehicleImages vi
          WHERE vi.VehicleId = v.Id
          ORDER BY vi.SortOrder, vi.Id
        ) AS VehicleImageUrl
      FROM Advertisements a
      LEFT JOIN Vehicles v ON v.Id = a.VehicleId
      LEFT JOIN Brands b ON b.Id = v.BrandId
      LEFT JOIN VehicleModels m ON m.Id = v.ModelId
      WHERE CONVERT(nvarchar(128), a.AdvertiserId) = @id
         OR CONVERT(nvarchar(128), a.AdvertiserId) = @clerkUserId
      ORDER BY a.CreatedAt DESC`,
      {
        id: keys.id,
        clerkUserId: keys.clerkUserId || keys.id,
      }
    );
    res.json(
      camel(rows).map((row) => ({
        ...row,
        vehicleImageUrl: toPublicUrl(row.vehicleImageUrl),
        imageUrl: toPublicUrl(row.imageUrl),
      }))
    );
  });

  router.get("/advertiser/:advertiserId", requireAuth, async (req, res) => {
    res.json(
      camel(
        await query(`SELECT * FROM Advertisements WHERE AdvertiserId = @id`, {
          id: req.params.advertiserId,
        })
      )
    );
  });

  router.get("/:id", requireAuth, async (req, res) => {
    const row = await queryOne(`SELECT * FROM Advertisements WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    if (!row) return res.status(404).json({ message: "Not found." });
    if (!ownsRecord(row.AdvertiserId, req.user) && req.user.roleName !== "Admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.json(camel(row));
  });

  router.post("/", requireAuth, async (req, res) => {
    const created = await createAdvertisementFromPackage(req.user.id, {
      vehicleId: pick(req.body, "VehicleId"),
      packageId: pick(req.body, "AdvertisementPackageId"),
      title: pick(req.body, "Title"),
      description: pick(req.body, "Description"),
      imageUrl: pick(req.body, "ImageUrl"),
      targetUrl: pick(req.body, "TargetUrl"),
    });
    if (created.error) return res.status(400).json({ message: created.error });
    res.json(camel(created.row));
  });

  router.post("/from-purchase/:purchaseId", requireAuth, async (req, res) => {
    const purchase = await queryOne(
      `SELECT * FROM PurchaseAdvertisements WHERE Id = @id AND UserId = @userId`,
      { id: Number(req.params.purchaseId), userId: req.user.id }
    );
    if (!purchase || purchase.Status !== 2) {
      return res.status(400).json({ message: "Purchase is not paid." });
    }
    const created = await createAdvertisementFromPackage(req.user.id, {
      vehicleId: purchase.VehicleId,
      packageId: purchase.AdvertisementPackageId,
      title: "Advertisement",
    });
    if (created.error) return res.status(400).json({ message: created.error });
    res.json(camel(created.row));
  });

  router.put("/:id", requireAuth, async (req, res) => {
    const existing = await queryOne(`SELECT AdvertiserId FROM Advertisements WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    if (!existing) return res.status(404).json({ message: "Not found." });
    if (!ownsRecord(existing.AdvertiserId, req.user) && req.user.roleName !== "Admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    await query(
      `UPDATE Advertisements
       SET Title=@title, Description=@description, ImageUrl=@imageUrl, TargetUrl=@targetUrl, UpdatedAt=SYSUTCDATETIME()
       WHERE Id=@id`,
      {
        id: Number(req.params.id),
        title: pick(req.body, "Title"),
        description: pick(req.body, "Description"),
        imageUrl: pick(req.body, "ImageUrl"),
        targetUrl: pick(req.body, "TargetUrl"),
      }
    );
    res.status(204).end();
  });

  router.delete("/:id", requireAuth, async (req, res) => {
    const existing = await queryOne(`SELECT AdvertiserId FROM Advertisements WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    if (!existing) return res.status(404).json({ message: "Not found." });
    if (!ownsRecord(existing.AdvertiserId, req.user) && req.user.roleName !== "Admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    await query(`DELETE FROM Advertisements WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    res.status(204).end();
  });

  return router;
}

export function packagesRouter() {
  const router = Router();
  router.get("/", async (_req, res) => {
    res.json(camel(await query(`SELECT * FROM AdvertisementPackages`)));
  });
  router.get("/:id", async (req, res) => {
    const row = await queryOne(`SELECT * FROM AdvertisementPackages WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    if (!row) return res.status(404).json({ message: "Not found." });
    res.json(camel(row));
  });
  router.post("/", requireAdmin, async (req, res) => {
    const result = await query(
      `INSERT INTO AdvertisementPackages
        (Name, Description, Price, Currency, DurationDays, Position, IsActive, CreatedAt)
       OUTPUT INSERTED.*
       VALUES (@name, @description, @price, @currency, @durationDays, @position, @isActive, SYSUTCDATETIME())`,
      {
        name: pick(req.body, "Name"),
        description: pick(req.body, "Description"),
        price: pick(req.body, "Price"),
        currency: pick(req.body, "Currency") || "EUR",
        durationDays: pick(req.body, "DurationDays"),
        position: pick(req.body, "Position"),
        isActive: pick(req.body, "IsActive") ?? true,
      }
    );
    res.json(camel(result[0]));
  });
  router.put("/:id", requireAdmin, async (req, res) => {
    await query(
      `UPDATE AdvertisementPackages SET
        Name=@name, Description=@description, Price=@price, Currency=@currency,
        DurationDays=@durationDays, Position=@position, IsActive=@isActive, UpdatedAt=SYSUTCDATETIME()
       WHERE Id=@id`,
      {
        id: Number(req.params.id),
        name: pick(req.body, "Name"),
        description: pick(req.body, "Description"),
        price: pick(req.body, "Price"),
        currency: pick(req.body, "Currency") || "EUR",
        durationDays: pick(req.body, "DurationDays"),
        position: pick(req.body, "Position"),
        isActive: pick(req.body, "IsActive") ?? true,
      }
    );
    res.status(204).end();
  });
  router.delete("/:id", requireAdmin, async (req, res) => {
    await query(`DELETE FROM AdvertisementPackages WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    res.status(204).end();
  });
  return router;
}

export function purchaseRouter() {
  const router = Router();
  router.post("/", requireAuth, async (req, res) => {
    const vehicleId = pick(req.body, "VehicleId");
    const packageId = pick(req.body, "AdvertisementPackageId");
    const vehicle = await findOwnedVehicle(req.user, vehicleId);
    if (!vehicle) return res.status(400).json({ message: "Vehicle not found or not owned." });
    const pack = await queryOne(`SELECT * FROM AdvertisementPackages WHERE Id = @id`, {
      id: packageId,
    });
    if (!pack) return res.status(404).json({ message: "Package not found." });
    const result = await query(
      `INSERT INTO PurchaseAdvertisements
        (UserId, VehicleId, AdvertisementPackageId, Amount, Currency, Status, CreatedAt)
       OUTPUT INSERTED.*
       VALUES (@userId, @vehicleId, @packageId, @amount, @currency, 1, SYSUTCDATETIME())`,
      {
        userId: req.user.id,
        vehicleId,
        packageId,
        amount: pack.Price,
        currency: pack.Currency,
      }
    );
    res.json(mapPurchase(result[0]));
  });

  router.get("/my", requireAuth, async (req, res) => {
    const rows = await query(
      `SELECT * FROM PurchaseAdvertisements WHERE UserId = @id ORDER BY CreatedAt DESC`,
      { id: req.user.id }
    );
    res.json(rows.map(mapPurchase));
  });

  router.get("/:id", requireAuth, async (req, res) => {
    const row = await queryOne(
      `SELECT * FROM PurchaseAdvertisements WHERE Id = @id AND UserId = @userId`,
      { id: Number(req.params.id), userId: req.user.id }
    );
    if (!row) return res.status(404).json({ message: "Not found." });
    res.json(mapPurchase(row));
  });

  return router;
}
