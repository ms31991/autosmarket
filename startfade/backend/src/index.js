import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { getPool } from "./db.js";
import {
  ensureRoles,
  provisionUser,
  verifyClerkToken,
} from "./auth.js";
import { attachSockets } from "./realtime.js";
import { ensureFriendshipsTable } from "./friends.js";
import { friendsRouter } from "./routes/friends.js";
import {
  lookupRouter,
  citiesRouter,
  vehicleModelsRouter,
  listingTypesRouter,
  ensureListingTypeColumnNullable,
  ensureListingTypesSaleAndRent,
} from "./routes/lookups.js";
import { catalogRouter } from "./routes/catalog.js";
import { vehiclesRouter } from "./routes/vehicles.js";
import { vehicleImagesRouter } from "./routes/vehicleImages.js";
import { usersRouter } from "./routes/users.js";
import { chatRouter } from "./routes/chat.js";
import { favouritesRouter, notificationsRouter } from "./routes/social.js";
import {
  reviewsRouter,
  rentalBookingsRouter,
  purchaseRouter,
  advertisementsRouter,
} from "./routes/commerce.js";
import { paymentsRouter } from "./routes/payments.js";
import {
  companyBannersRouter,
  ensureCompanyBannersTable,
} from "./routes/companyBanners.js";
import { adPackagesRouter, ensureAdPackagesTable } from "./routes/adPackages.js";
import { adminRouter } from "./routes/admin.js";
import { vehicleSitemap } from "./routes/sitemap.js";
import { ensureUploadDirs, publicDir } from "./paths.js";
import { ensureListingReportsTable } from "./listingReports.js";
import { ensureSiteSettingsTable, getSiteSettings } from "./siteSettings.js";

function isAllowedOrigin(origin) {
  if (!origin) return true;
  const configured = String(
    process.env.FRONTEND_URL || "http://localhost:5173"
  ).replace(/\/$/, "");
  if (origin === configured) return true;
  const extras = String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (extras.includes(origin)) return true;
  try {
    const { hostname, port, protocol } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    if (
      protocol === "https:" &&
      (hostname === "autosmarket.me" ||
        hostname === "www.autosmarket.me" ||
        hostname.endsWith(".vercel.app"))
    ) {
      return true;
    }
    const lan =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.endsWith(".local") ||
      /^(10|127)\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname);
    const okPort =
      port === "" || port === "5173" || port === "4173" || port === "5068";
    return lan && okPort;
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) callback(null, true);
    else callback(null, false);
  },
  credentials: true,
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

attachSockets(io, async (token) => {
  const payload = await verifyClerkToken(token);
  return provisionUser(payload);
});

app.use(cors(corsOptions));

app.use(
  "/api/Payments/webhook",
  express.raw({ type: "application/json" })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
ensureUploadDirs();
app.use("/uploads", express.static(path.join(publicDir, "uploads")));
app.use(express.static(publicDir));
app.get(/^\/uploads\/.+/, (_req, res) => {
  res.sendFile(path.join(publicDir, "placeholder-car.svg"));
});

app.get("/health", (_req, res) => res.json({ ok: true, engine: "node" }));
app.get("/api/sitemap.xml", vehicleSitemap);
app.get("/sitemap.xml", vehicleSitemap);
app.get("/api/SiteSettings", async (_req, res) => {
  try {
    res.json(await getSiteSettings());
  } catch (err) {
    res.status(500).json({ message: err.message || "Site settings unavailable." });
  }
});
app.use("/api/Admin", adminRouter());
app.use("/api/AdPackages", adPackagesRouter());

app.use("/api/Brands", lookupRouter("Brands", ["Name", "Slug"]));
app.use("/api/BodyTypes", lookupRouter("BodyTypes", ["Name"]));
app.use("/api/FuelTypes", lookupRouter("FuelTypes", ["Name"]));
app.use("/api/Transmissions", lookupRouter("Transmissions", ["Name"]));
app.use("/api/DriveTypes", lookupRouter("DriveTypes", ["Name"]));
app.use("/api/Conditions", lookupRouter("Conditions", ["Name"]));
app.use("/api/Colors", lookupRouter("Colors", ["Name", "HexCode"]));
app.use("/api/Features", lookupRouter("Features", ["Name"]));
app.use("/api/Country", lookupRouter("Country", ["Name", "Code"]));
app.use("/api/VehicleCategories", lookupRouter("VehicleCategories", ["Name", "Slug", "IsActive"]));
app.use("/api/Cities", citiesRouter());
app.use("/api/VehicleModels", vehicleModelsRouter());
app.use("/api/ListingTypes", listingTypesRouter());
app.use("/api/Catalog", catalogRouter());
app.use("/api/Vehicles", vehiclesRouter());
app.use("/api/VehicleImage", vehicleImagesRouter());
app.use("/api/Users", usersRouter());
app.use("/api/Friends", friendsRouter());
app.use("/api/Chat", chatRouter());
app.use("/api/Favourites", favouritesRouter());
app.use("/api/Notifications", notificationsRouter());
app.use("/api/Reviews", reviewsRouter());
app.use("/api/RentalBookings", rentalBookingsRouter());
app.use("/api/PurchaseAdvertisement", purchaseRouter());
app.use("/api/Advertisements", advertisementsRouter());
app.use("/api/CompanyBanners", companyBannersRouter());
app.use("/api/Payments", paymentsRouter());

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: err.message || "Server error" });
});

const port = Number(process.env.PORT) || 5068;

async function start() {
  await getPool();
  await ensureRoles();
  await ensureFriendshipsTable();
  await ensureCompanyBannersTable();
  await ensureAdPackagesTable();
  await ensureListingTypeColumnNullable();
  await ensureListingTypesSaleAndRent();
  await ensureListingReportsTable();
  await ensureSiteSettingsTable();
  server.listen(port, "0.0.0.0", () => {
    console.log(`AutoMarket Node API running on http://localhost:${port}`);
    console.log(`LAN: http://<PC-IP>:${port}  (same WiFi as the phone)`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
