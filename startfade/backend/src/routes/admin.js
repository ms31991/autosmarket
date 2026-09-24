import { Router } from "express";
import { query, queryOne } from "../db.js";
import { camel, pick } from "../camel.js";
import { requireAdmin } from "../auth.js";
import { toPublicUrl } from "../paths.js";
import { listAllAdPackages, updateAdPackage } from "./adPackages.js";
import { getSiteSettings, updateSiteSettings } from "../siteSettings.js";

export function adminRouter() {
  const router = Router();
  router.use(requireAdmin);

  router.get("/roles", async (_req, res) => {
    const rows = await query(`SELECT roli_id, roli_emri FROM Rolis ORDER BY roli_id`);
    res.json(camel(rows));
  });

  router.get("/users", async (_req, res) => {
    const rows = await query(`
      SELECT
        CONVERT(nvarchar(128), u.Id) AS Id,
        CONVERT(nvarchar(128), u.ClerkUserId) AS ClerkUserId,
        u.Email, u.UserName, u.Name, u.Surname, u.PhoneNumber,
        u.roli_id, r.roli_emri, u.CreatedDate
      FROM ApplicationUsers u
      LEFT JOIN Rolis r ON r.roli_id = u.roli_id
      ORDER BY u.CreatedDate DESC`);
    res.json(camel(rows));
  });

  router.put("/users/:id/role", async (req, res) => {
    const id = String(req.params.id);
    const roleName = String(pick(req.body, "RoleName") || "").trim();
    const role = await queryOne(`SELECT roli_id, roli_emri FROM Rolis WHERE roli_emri = @roleName`, {
      roleName,
    });
    if (!role) return res.status(400).json({ message: "Role not found." });
    await query(`UPDATE ApplicationUsers SET roli_id = @roliId WHERE CONVERT(nvarchar(128), Id) = @id`, {
      roliId: role.roli_id,
      id,
    });
    const user = await queryOne(
      `SELECT CONVERT(nvarchar(128), u.Id) AS Id, u.Email, u.roli_id, r.roli_emri
       FROM ApplicationUsers u
       LEFT JOIN Rolis r ON r.roli_id = u.roli_id
       WHERE CONVERT(nvarchar(128), u.Id) = @id`,
      { id }
    );
    res.json(camel(user));
  });

  router.get("/vehicles", async (_req, res) => {
    const rows = await query(`
      SELECT
        v.Id, v.Price, v.Year, v.Mileage, v.CreatedDate, v.ListingTypeId,
        CONVERT(nvarchar(128), v.OwnerId) AS OwnerId,
        b.Name AS BrandName, m.Name AS ModelName, lt.Name AS ListingTypeName,
        city.Name AS CityName
      FROM Vehicles v
      LEFT JOIN Brands b ON b.Id = v.BrandId
      LEFT JOIN VehicleModels m ON m.Id = v.ModelId
      LEFT JOIN ListingTypes lt ON lt.Id = v.ListingTypeId
      LEFT JOIN Cities city ON city.Id = v.CityId
      ORDER BY v.CreatedDate DESC`);
    res.json(camel(rows));
  });

  router.get("/stats", async (_req, res) => {
    const row = await queryOne(`
      SELECT
        (SELECT COUNT(*) FROM Vehicles) AS Vehicles,
        (SELECT COUNT(*) FROM ApplicationUsers) AS Users,
        (SELECT COUNT(*) FROM Advertisements WHERE Status = 2 AND EndDate > SYSUTCDATETIME()) AS ActiveAds,
        (SELECT COUNT(*) FROM CompanyBanners WHERE Status = 2 AND StartDate <= SYSUTCDATETIME() AND EndDate > SYSUTCDATETIME()) AS ActiveBanners,
        (SELECT COUNT(*) FROM Payments WHERE Status = 2) AS PaidPayments,
        (SELECT COUNT(*) FROM Reviews) AS Reviews,
        (SELECT COUNT(*) FROM ListingReports WHERE Status = 0) AS OpenReports
    `);
    const recent = await query(`
      SELECT TOP 8
        v.Id, v.Price, v.CreatedDate, b.Name AS BrandName, m.Name AS ModelName
      FROM Vehicles v
      LEFT JOIN Brands b ON b.Id = v.BrandId
      LEFT JOIN VehicleModels m ON m.Id = v.ModelId
      ORDER BY v.CreatedDate DESC`);
    res.json({
      ...camel(row || {}),
      recentVehicles: camel(recent),
    });
  });

  router.delete("/vehicles/:id", async (req, res) => {
    const id = Number(req.params.id);
    const existing = await queryOne(`SELECT Id FROM Vehicles WHERE Id = @id`, { id });
    if (!existing) return res.status(404).json({ message: "Vehicle not found." });
    const cleanup = [
      `DELETE FROM VehicleImages WHERE VehicleId = @id`,
      `DELETE FROM Favourites WHERE VehicleId = @id`,
      `DELETE FROM Advertisements WHERE VehicleId = @id`,
      `DELETE FROM ListingReports WHERE VehicleId = @id`,
    ];
    for (const sql of cleanup) {
      try {
        await query(sql, { id });
      } catch {
        /* related table may not exist */
      }
    }
    try {
      await query(`DELETE FROM RentalDetails WHERE VehicleId = @id`, { id });
    } catch {
      /* optional */
    }
    await query(`DELETE FROM Vehicles WHERE Id = @id`, { id });
    res.status(204).end();
  });

  router.put("/vehicles/:id", async (req, res) => {
    const id = Number(req.params.id);
    const price = pick(req.body, "Price");
    const year = pick(req.body, "Year");
    const mileage = pick(req.body, "Mileage");
    const listingTypeId = pick(req.body, "ListingTypeId");
    await query(
      `UPDATE Vehicles
       SET Price = COALESCE(@price, Price),
           Year = COALESCE(@year, Year),
           Mileage = COALESCE(@mileage, Mileage),
           ListingTypeId = COALESCE(@listingTypeId, ListingTypeId)
       WHERE Id = @id`,
      {
        id,
        price: price === "" || price == null ? null : Number(price),
        year: year === "" || year == null ? null : Number(year),
        mileage: mileage === "" || mileage == null ? null : Number(mileage),
        listingTypeId:
          listingTypeId === "" || listingTypeId == null ? null : Number(listingTypeId),
      }
    );
    const row = await queryOne(`SELECT Id, Price, Year, Mileage FROM Vehicles WHERE Id = @id`, { id });
    if (!row) return res.status(404).json({ message: "Not found." });
    res.json(camel(row));
  });

  router.get("/advertisements", async (_req, res) => {
    const rows = await query(`
      SELECT
        a.Id, a.VehicleId, a.Title, a.Status, a.StartDate, a.EndDate, a.Price, a.CreatedAt,
        b.Name AS BrandName, m.Name AS ModelName
      FROM Advertisements a
      LEFT JOIN Vehicles v ON v.Id = a.VehicleId
      LEFT JOIN Brands b ON b.Id = v.BrandId
      LEFT JOIN VehicleModels m ON m.Id = v.ModelId
      ORDER BY a.CreatedAt DESC`);
    res.json(camel(rows));
  });

  router.put("/advertisements/:id", async (req, res) => {
    const id = Number(req.params.id);
    const status = pick(req.body, "Status");
    const endDate = pick(req.body, "EndDate");
    const title = pick(req.body, "Title");
    await query(
      `UPDATE Advertisements
       SET Title = COALESCE(@title, Title),
           Status = COALESCE(@status, Status),
           EndDate = COALESCE(@endDate, EndDate),
           UpdatedAt = SYSUTCDATETIME()
       WHERE Id = @id`,
      {
        id,
        title: title || null,
        status: status == null || status === "" ? null : Number(status),
        endDate: endDate || null,
      }
    );
    const row = await queryOne(`SELECT * FROM Advertisements WHERE Id = @id`, { id });
    if (!row) return res.status(404).json({ message: "Not found." });
    res.json(camel(row));
  });

  router.delete("/advertisements/:id", async (req, res) => {
    const id = Number(req.params.id);
    await query(`DELETE FROM Advertisements WHERE Id = @id`, { id });
    res.status(204).end();
  });

  router.get("/packages", async (_req, res) => {
    res.json(await listAllAdPackages());
  });

  router.put("/packages/:id", async (req, res) => {
    try {
      const row = await updateAdPackage(req.params.id, {
        price: pick(req.body, "Price"),
        isActive: pick(req.body, "IsActive"),
      });
      if (!row) return res.status(404).json({ message: "Not found." });
      res.json(row);
    } catch (err) {
      res.status(400).json({ message: err.message || "Could not update package." });
    }
  });

  router.get("/banners", async (_req, res) => {
    const rows = await query(`
      SELECT
        Id, CONVERT(nvarchar(128), UserId) AS UserId, CompanyName, ImageUrl, TargetUrl,
        Status, StartDate, EndDate, Price, DurationDays, Format, CreatedAt
      FROM CompanyBanners
      ORDER BY CreatedAt DESC`);
    res.json(
      camel(rows).map((row) => ({
        ...row,
        imageUrl: toPublicUrl(row.imageUrl),
      }))
    );
  });

  router.put("/banners/:id", async (req, res) => {
    const id = Number(req.params.id);
    const companyName = pick(req.body, "CompanyName");
    const targetUrl = pick(req.body, "TargetUrl");
    const status = pick(req.body, "Status");
    const endDate = pick(req.body, "EndDate");
    await query(
      `UPDATE CompanyBanners
       SET CompanyName = COALESCE(@companyName, CompanyName),
           TargetUrl = COALESCE(@targetUrl, TargetUrl),
           Status = COALESCE(@status, Status),
           EndDate = COALESCE(@endDate, EndDate)
       WHERE Id = @id`,
      {
        id,
        companyName: companyName || null,
        targetUrl: targetUrl || null,
        status: status == null || status === "" ? null : Number(status),
        endDate: endDate || null,
      }
    );
    const row = await queryOne(`SELECT * FROM CompanyBanners WHERE Id = @id`, { id });
    if (!row) return res.status(404).json({ message: "Not found." });
    res.json(camel(row));
  });

  router.get("/payments", async (_req, res) => {
    const rows = await query(`
      SELECT TOP 200
        Id, CONVERT(nvarchar(128), UserId) AS UserId, Amount, Currency, Status,
        TransactionId, PaidAt, CreatedAt
      FROM Payments
      ORDER BY CreatedAt DESC`);
    res.json(camel(rows));
  });

  router.get("/reviews", async (_req, res) => {
    const rows = await query(`SELECT TOP 200 * FROM Reviews ORDER BY CreatedAt DESC`);
    res.json(camel(rows));
  });

  router.get("/bookings", async (_req, res) => {
    const rows = await query(`SELECT TOP 200 * FROM RentalBookings ORDER BY CreatedAt DESC`);
    res.json(camel(rows));
  });

  router.get("/rental-details", async (_req, res) => {
    try {
      const rows = await query(`
        SELECT
          rd.Id, rd.VehicleId, rd.PricePerDay, rd.Deposit,
          b.Name AS BrandName, m.Name AS ModelName
        FROM RentalDetails rd
        LEFT JOIN Vehicles v ON v.Id = rd.VehicleId
        LEFT JOIN Brands b ON b.Id = v.BrandId
        LEFT JOIN VehicleModels m ON m.Id = v.ModelId
        ORDER BY rd.Id DESC`);
      res.json(camel(rows));
    } catch {
      const rows = await query(`SELECT * FROM RentalDetails`);
      res.json(camel(rows));
    }
  });

  router.put("/rental-details/:id", async (req, res) => {
    const id = Number(req.params.id);
    const pricePerDay = pick(req.body, "PricePerDay");
    const deposit = pick(req.body, "Deposit");
    try {
      await query(
        `UPDATE RentalDetails
         SET PricePerDay = COALESCE(@pricePerDay, PricePerDay),
             Deposit = COALESCE(@deposit, Deposit)
         WHERE Id = @id`,
        {
          id,
          pricePerDay: pricePerDay === "" || pricePerDay == null ? null : Number(pricePerDay),
          deposit: deposit === "" || deposit == null ? null : Number(deposit),
        }
      );
    } catch (err) {
      return res.status(400).json({ message: err.message || "Could not update rental details." });
    }
    res.json({ ok: true });
  });

  router.get("/site-settings", async (_req, res) => {
    res.json(await getSiteSettings());
  });

  router.put("/site-settings", async (req, res) => {
    try {
      res.json(
        await updateSiteSettings({
          legalName: pick(req.body, "LegalName"),
          legalAddress: pick(req.body, "LegalAddress"),
          supportEmail: pick(req.body, "SupportEmail"),
          privacyEmail: pick(req.body, "PrivacyEmail"),
        })
      );
    } catch (err) {
      res.status(400).json({ message: err.message || "Could not save settings." });
    }
  });

  router.get("/listing-reports", async (_req, res) => {
    const rows = await query(`
      SELECT TOP 200
        Id, VehicleId, CONVERT(nvarchar(128), ReporterUserId) AS ReporterUserId,
        Reason, Details, Status, CreatedAt
      FROM ListingReports
      ORDER BY CreatedAt DESC`);
    res.json(camel(rows));
  });

  router.put("/listing-reports/:id", async (req, res) => {
    const id = Number(req.params.id);
    const status = pick(req.body, "Status");
    await query(`UPDATE ListingReports SET Status = @status WHERE Id = @id`, {
      id,
      status: status == null || status === "" ? 1 : Number(status),
    });
    res.json({ ok: true });
  });

  router.get("/notifications", async (_req, res) => {
    const rows = await query(`
      SELECT TOP 200
        n.Id, CONVERT(nvarchar(128), n.UserId) AS UserId, n.Title, n.Message, n.Type, n.IsRead, n.CreatedAt,
        u.Email
      FROM Notifications n
      LEFT JOIN ApplicationUsers u ON CONVERT(nvarchar(128), u.Id) = CONVERT(nvarchar(128), n.UserId)
      ORDER BY n.CreatedAt DESC`);
    res.json(camel(rows));
  });

  router.post("/notifications", async (req, res) => {
    const userId = pick(req.body, "UserId");
    const title = pick(req.body, "Title");
    const message = pick(req.body, "Message");
    if (!userId || !title) {
      return res.status(400).json({ message: "User and title are required." });
    }
    await query(
      `INSERT INTO Notifications (UserId, Title, Message, Type, IsRead, CreatedAt)
       VALUES (@userId, @title, @message, @type, 0, SYSUTCDATETIME())`,
      {
        userId,
        title,
        message: message || "",
        type: pick(req.body, "Type") || "admin",
      }
    );
    res.json({ ok: true });
  });

  router.delete("/notifications/:id", async (req, res) => {
    await query(`DELETE FROM Notifications WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    res.status(204).end();
  });

  return router;
}
