import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { query, queryOne } from "../db.js";
import { camel } from "../camel.js";
import { publicFilePath, vehicleUploadsDir } from "../paths.js";
import { requireAuth } from "../auth.js";
import { ownsRecord } from "../identity.js";

const uploadDir = vehicleUploadsDir;
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = [".jpg", ".jpeg", ".png", ".webp"].includes(
      path.extname(file.originalname).toLowerCase()
    );
    cb(ok ? null : new Error("Lejohen vetëm JPG, JPEG, PNG dhe WEBP."), ok);
  },
});

export function vehicleImagesRouter() {
  const router = Router();

  async function assertCanEditVehicle(req, vehicleId) {
    const vehicle = await queryOne(`SELECT OwnerId FROM Vehicles WHERE Id = @id`, {
      id: Number(vehicleId),
    });
    if (!vehicle) return { status: 404, message: "Vehicle not found." };
    if (!ownsRecord(vehicle.OwnerId, req.user) && req.user.roleName !== "Admin") {
      return { status: 403, message: "Forbidden" };
    }
    return { vehicle };
  }

  router.get("/vehicle/:vehicleId", async (req, res) => {
    const rows = await query(
      `SELECT * FROM VehicleImages WHERE VehicleId = @vehicleId ORDER BY SortOrder`,
      { vehicleId: Number(req.params.vehicleId) }
    );
    res.json(camel(rows));
  });

  router.get("/:id", async (req, res) => {
    const row = await queryOne(`SELECT * FROM VehicleImages WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    if (!row) return res.status(404).json({ message: "Not found." });
    res.json(camel(row));
  });

  router.post(
    "/vehicle/:vehicleId/upload",
    requireAuth,
    upload.single("file"),
    async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Duhet të zgjidhni një foto." });
    const vehicleId = Number(req.params.vehicleId);
    const access = await assertCanEditVehicle(req, vehicleId);
    if (access.status) return res.status(access.status).json({ message: access.message });
    const countRow = await queryOne(
      `SELECT COUNT(*) AS n FROM VehicleImages WHERE VehicleId = @vehicleId`,
      { vehicleId }
    );
    if (Number(countRow?.n ?? countRow?.N ?? 0) >= 10) {
      return res.status(400).json({ message: "Maksimumi është 10 foto për veturë." });
    }
    const maxRow = await queryOne(
      `SELECT MAX(SortOrder) AS maxOrder FROM VehicleImages WHERE VehicleId = @vehicleId`,
      { vehicleId }
    );
    const isFirst = !maxRow?.maxOrder;
    const sortOrder = isFirst ? 1 : maxRow.maxOrder + 1;
    const imageUrl = `/uploads/vehicles/${req.file.filename}`;
    const result = await query(
      `INSERT INTO VehicleImages (VehicleId, ImageUrl, IsPrimary, SortOrder)
       OUTPUT INSERTED.*
       VALUES (@vehicleId, @imageUrl, @isPrimary, @sortOrder)`,
      { vehicleId, imageUrl, isPrimary: isFirst ? 1 : 0, sortOrder }
    );
    const row = camel(result[0]);
    res.json({
      message: "Fotoja u uploadua me sukses.",
      imageId: row.id,
      ...row,
    });
    }
  );

  router.put("/:id/primary", requireAuth, async (req, res) => {
    const image = await queryOne(`SELECT * FROM VehicleImages WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    if (!image) return res.status(404).json({ message: "Not found." });
    const access = await assertCanEditVehicle(req, image.VehicleId);
    if (access.status) return res.status(access.status).json({ message: access.message });
    await query(`UPDATE VehicleImages SET IsPrimary = 0 WHERE VehicleId = @vehicleId`, {
      vehicleId: image.VehicleId,
    });
    await query(`UPDATE VehicleImages SET IsPrimary = 1 WHERE Id = @id`, {
      id: image.Id,
    });
    res.json({ message: "Primary image updated." });
  });

  router.delete("/:id", requireAuth, async (req, res) => {
    const image = await queryOne(`SELECT * FROM VehicleImages WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    if (!image) return res.status(404).json({ message: "Not found." });
    const access = await assertCanEditVehicle(req, image.VehicleId);
    if (access.status) return res.status(access.status).json({ message: access.message });
    const filePath = publicFilePath(image.ImageUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await query(`DELETE FROM VehicleImages WHERE Id = @id`, { id: image.Id });
    if (image.IsPrimary) {
      const next = await queryOne(
        `SELECT TOP 1 * FROM VehicleImages WHERE VehicleId = @vehicleId ORDER BY SortOrder`,
        { vehicleId: image.VehicleId }
      );
      if (next) {
        await query(`UPDATE VehicleImages SET IsPrimary = 1 WHERE Id = @id`, {
          id: next.Id,
        });
      }
    }
    res.status(204).end();
  });

  return router;
}
