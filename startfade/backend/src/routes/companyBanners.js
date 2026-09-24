import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { query, queryOne } from "../db.js";
import { camel, pick } from "../camel.js";
import { requireAuth } from "../auth.js";
import { bannerUploadsDir, toPublicUrl } from "../paths.js";
import { findAdPackage, listAdPackages } from "./adPackages.js";

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(bannerUploadsDir, { recursive: true });
      cb(null, bannerUploadsDir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = [".jpg", ".jpeg", ".png", ".webp"].includes(
      path.extname(file.originalname).toLowerCase()
    );
    cb(ok ? null : new Error("Only JPG, JPEG, PNG and WEBP are allowed."), ok);
  },
});

export async function ensureCompanyBannersTable() {
  await query(`
    IF OBJECT_ID(N'dbo.CompanyBanners', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.CompanyBanners (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        UserId NVARCHAR(128) NOT NULL,
        CompanyName NVARCHAR(120) NOT NULL,
        ImageUrl NVARCHAR(500) NOT NULL,
        TargetUrl NVARCHAR(500) NOT NULL,
        Status INT NOT NULL,
        StartDate DATETIME2 NOT NULL,
        EndDate DATETIME2 NOT NULL,
        Price DECIMAL(10,2) NOT NULL,
        DurationDays INT NOT NULL,
        StripeSessionId NVARCHAR(200) NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CompanyBanners_CreatedAt DEFAULT SYSUTCDATETIME()
      );
      CREATE INDEX IX_CompanyBanners_Active ON dbo.CompanyBanners (Status, StartDate, EndDate);
    END
  `);
  await query(`
    IF COL_LENGTH('dbo.CompanyBanners', 'Format') IS NULL
    BEGIN
      ALTER TABLE dbo.CompanyBanners
        ADD Format NVARCHAR(20) NOT NULL CONSTRAINT DF_CompanyBanners_Format DEFAULT N'wide';
    END
  `);
}

async function matchOffer(name, days, amount) {
  const offer = await findAdPackage("banner", days, name);
  if (!offer) return null;
  const paid = Number(amount);
  if (Number.isFinite(paid) && paid > 0) {
    return { ...offer, price: paid };
  }
  return offer;
}

function normalizeHttpUrl(value) {
  let url = String(value || "").trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString().slice(0, 500);
  } catch {
    return "";
  }
}

function normalizeFormat(value) {
  return String(value || "").toLowerCase() === "large" ? "large" : "wide";
}

function mapBanner(row) {
  if (!row) return null;
  const data = camel(row);
  return {
    ...data,
    imageUrl: toPublicUrl(data.imageUrl),
    format: normalizeFormat(data.format),
  };
}

export async function fulfillPaidCompanyBanner({
  userId,
  companyName,
  imageUrl,
  targetUrl,
  days,
  amount,
  offerName,
  sessionId,
  format,
}) {
  const offer = await matchOffer(offerName, days, amount);
  if (!userId) return { error: "Missing user." };
  if (!offer) return { error: "Invalid company banner offer." };

  const name = String(companyName || "Company").trim().slice(0, 120) || "Company";
  const image = toPublicUrl(imageUrl);
  const link = normalizeHttpUrl(targetUrl);
  if (!image || !image.startsWith("/uploads/banners/")) {
    return { error: "Banner image is required." };
  }
  if (!link) return { error: "A valid website URL is required." };

  if (sessionId) {
    const existing = await queryOne(
      `SELECT TOP 1 * FROM CompanyBanners WHERE StripeSessionId = @sessionId`,
      { sessionId }
    );
    if (existing) return { row: existing };
  }

  const startDate = new Date();

  const result = await query(
    `INSERT INTO CompanyBanners
      (UserId, CompanyName, ImageUrl, TargetUrl, Status, StartDate, EndDate,
       Price, DurationDays, StripeSessionId, Format, CreatedAt)
     OUTPUT INSERTED.*
     VALUES
      (@userId, @companyName, @imageUrl, @targetUrl, 2,
       @startDate, DATEADD(day, @days, @startDate),
       @price, @days, @sessionId, @format, SYSUTCDATETIME())`,
    {
      userId: String(userId),
      companyName: name,
      imageUrl: image,
      targetUrl: link,
      startDate,
      days: offer.days,
      price: offer.price,
      sessionId: sessionId || null,
      format: normalizeFormat(format),
    }
  );

  return { row: result[0] };
}

export function companyBannersRouter() {
  const router = Router();

  router.get("/active", async (_req, res) => {
    const rows = await query(
      `SELECT *
       FROM CompanyBanners
       WHERE Status = 2
         AND StartDate <= SYSUTCDATETIME()
         AND EndDate > SYSUTCDATETIME()
       ORDER BY StartDate DESC, Id DESC`
    );
    res.json(rows.map(mapBanner).filter(Boolean));
  });

  router.get("/offers", async (_req, res) => {
    res.json(await listAdPackages("banner"));
  });

  router.use(requireAuth);

  router.post("/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Choose a banner image." });
    }
    const imageUrl = `/uploads/banners/${req.file.filename}`;
    res.json({ imageUrl, url: toPublicUrl(imageUrl) });
  });

  return router;
}
