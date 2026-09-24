import { Router } from "express";
import { query, queryOne } from "../db.js";
import { camel, pick } from "../camel.js";
import { requireAuth, requireAdmin } from "../auth.js";
import { emitToUser } from "../realtime.js";
import { toPublicUrl } from "../paths.js";
import {
  isSamePerson,
  keysFromAuth,
  resolveUserKeys,
  userMatchSql,
} from "../identity.js";

const USER_SQL = userMatchSql("UserId");

export function favouritesRouter() {
  const router = Router();

  router.post("/:vehicleId", requireAuth, async (req, res) => {
    const vehicleId = Number(req.params.vehicleId);
    const me = keysFromAuth(req.user);
    const vehicle = await queryOne(
      `SELECT v.*, b.Name AS BrandName, m.Name AS ModelName
       FROM Vehicles v
       LEFT JOIN Brands b ON b.Id = v.BrandId
       LEFT JOIN VehicleModels m ON m.Id = v.ModelId
       WHERE v.Id = @vehicleId`,
      { vehicleId }
    );
    if (!vehicle) return res.status(404).json({ message: "Vehicle nuk u gjet." });

    const exists = await queryOne(
      `SELECT Id FROM Favourites WHERE ${USER_SQL} AND VehicleId = @vehicleId`,
      { userId: me.id, clerkUserId: me.clerkUserId || me.id, vehicleId }
    );
    if (exists) {
      return res.status(400).json({ message: "Vehicle është tashmë në favourites." });
    }

    const fav = await query(
      `INSERT INTO Favourites (UserId, VehicleId, CreatedAt)
       OUTPUT INSERTED.*
       VALUES (@userId, @vehicleId, SYSUTCDATETIME())`,
      { userId: me.id, vehicleId }
    );

    const ownerKeys = await resolveUserKeys(vehicle.OwnerId);
    const isOwnVehicle =
      isSamePerson(ownerKeys.id, me.id) ||
      isSamePerson(ownerKeys.clerkUserId, me.id) ||
      isSamePerson(ownerKeys.id, me.clerkUserId) ||
      isSamePerson(ownerKeys.clerkUserId, me.clerkUserId);

    if (!isOwnVehicle) {
      const profile = await queryOne(
        `SELECT Name, Surname FROM ApplicationUsers WHERE ${userMatchSql("Id")}`,
        { userId: me.id, clerkUserId: me.clerkUserId || me.id }
      );
      const name = `${profile?.Name || ""} ${profile?.Surname || ""}`.trim() || "Someone";
      const vehicleName = `${vehicle.BrandName || ""} ${vehicle.ModelName || ""}`.trim();
      const notif = await query(
        `INSERT INTO Notifications (UserId, Title, Message, Type, IsRead, CreatedAt)
         OUTPUT INSERTED.*
         VALUES (@userId, 'New Favourite', @message, 'Favourite', 0, SYSUTCDATETIME())`,
        {
          userId: ownerKeys.id,
          message: `${name} has favourited your ${vehicleName}.`,
        }
      );
      const n = camel(notif[0]);
      const payload = {
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt,
      };
      emitToUser("notifications", ownerKeys.id, "ReceiveNotification", payload);
      if (ownerKeys.clerkUserId && ownerKeys.clerkUserId !== ownerKeys.id) {
        emitToUser("notifications", ownerKeys.clerkUserId, "ReceiveNotification", payload);
      }
    }

    res.json({
      message: "U shtua te favourites.",
      favouriteId: fav[0].Id,
      vehicleId,
    });
  });

  router.get("/", requireAuth, async (req, res) => {
    const me = keysFromAuth(req.user);
    const rows = await query(
      `SELECT f.Id AS FavouriteId, f.VehicleId, f.CreatedAt,
              b.Name AS Brand, m.Name AS Model, v.Year, v.Price, city.Name AS City
       FROM Favourites f
       JOIN Vehicles v ON v.Id = f.VehicleId
       LEFT JOIN Brands b ON b.Id = v.BrandId
       LEFT JOIN VehicleModels m ON m.Id = v.ModelId
       LEFT JOIN Cities city ON city.Id = v.CityId
       WHERE ${userMatchSql("f.UserId")}
       ORDER BY f.CreatedAt DESC`,
      { userId: me.id, clerkUserId: me.clerkUserId || me.id }
    );
    const list = camel(rows);
    for (const item of list) {
      const images = await query(
        `SELECT ImageUrl FROM VehicleImages WHERE VehicleId = @id ORDER BY SortOrder`,
        { id: item.vehicleId }
      );
      item.images = images.map((i) => toPublicUrl(i.ImageUrl));
    }
    res.json(list);
  });

  router.get("/item/:id", requireAuth, async (req, res) => {
    const row = await queryOne(`SELECT * FROM Favourites WHERE Id = @id`, {
      id: Number(req.params.id),
    });
    if (!row) return res.status(404).json({ message: "Not found." });
    if (
      !isSamePerson(row.UserId, req.user.id) &&
      !isSamePerson(row.UserId, req.user.clerkUserId) &&
      req.user.roleName !== "Admin"
    ) {
      return res.status(403).end();
    }
    res.json(camel(row));
  });

  router.get("/check/:vehicleId", requireAuth, async (req, res) => {
    const vehicleId = Number(req.params.vehicleId);
    const me = keysFromAuth(req.user);
    const row = await queryOne(
      `SELECT Id FROM Favourites WHERE ${USER_SQL} AND VehicleId = @vehicleId`,
      { userId: me.id, clerkUserId: me.clerkUserId || me.id, vehicleId }
    );
    res.json({ vehicleId, isFavourite: Boolean(row) });
  });

  router.get("/count", requireAuth, async (req, res) => {
    const me = keysFromAuth(req.user);
    const row = await queryOne(
      `SELECT COUNT(*) AS count FROM Favourites WHERE ${USER_SQL}`,
      { userId: me.id, clerkUserId: me.clerkUserId || me.id }
    );
    res.json({ count: row.count });
  });

  router.delete("/all", requireAuth, async (req, res) => {
    const me = keysFromAuth(req.user);
    const rows = await query(
      `DELETE FROM Favourites OUTPUT DELETED.Id WHERE ${USER_SQL}`,
      { userId: me.id, clerkUserId: me.clerkUserId || me.id }
    );
    res.json({ message: "Favourites u fshinë.", count: rows.length });
  });

  router.delete("/:vehicleId", requireAuth, async (req, res) => {
    const me = keysFromAuth(req.user);
    await query(
      `DELETE FROM Favourites WHERE ${USER_SQL} AND VehicleId = @vehicleId`,
      {
        userId: me.id,
        clerkUserId: me.clerkUserId || me.id,
        vehicleId: Number(req.params.vehicleId),
      }
    );
    res.status(204).end();
  });

  return router;
}

export function notificationsRouter() {
  const router = Router();

  router.get("/", requireAuth, async (req, res) => {
    const me = keysFromAuth(req.user);
    const rows = await query(
      `SELECT Id, Title, Message, Type, IsRead, CreatedAt
       FROM Notifications WHERE ${USER_SQL} ORDER BY CreatedAt DESC`,
      { userId: me.id, clerkUserId: me.clerkUserId || me.id }
    );
    res.json(camel(rows));
  });

  router.get("/unread-count", requireAuth, async (req, res) => {
    const me = keysFromAuth(req.user);
    const row = await queryOne(
      `SELECT COUNT(*) AS unreadCount FROM Notifications WHERE ${USER_SQL} AND IsRead = 0`,
      { userId: me.id, clerkUserId: me.clerkUserId || me.id }
    );
    res.json({ unreadCount: row.unreadCount });
  });

  router.get("/:id", requireAuth, async (req, res) => {
    const me = keysFromAuth(req.user);
    const row = await queryOne(
      `SELECT Id, Title, Message, Type, IsRead, CreatedAt
       FROM Notifications WHERE Id = @id AND ${USER_SQL}`,
      { id: Number(req.params.id), userId: me.id, clerkUserId: me.clerkUserId || me.id }
    );
    if (!row) return res.status(404).json({ message: "Not found." });
    res.json(camel(row));
  });

  router.put("/read-all", requireAuth, async (req, res) => {
    const me = keysFromAuth(req.user);
    const rows = await query(
      `UPDATE Notifications SET IsRead = 1 OUTPUT INSERTED.Id
       WHERE ${USER_SQL} AND IsRead = 0`,
      { userId: me.id, clerkUserId: me.clerkUserId || me.id }
    );
    res.json({ message: "All marked as read.", count: rows.length });
  });

  router.put("/:id/read", requireAuth, async (req, res) => {
    const me = keysFromAuth(req.user);
    await query(
      `UPDATE Notifications SET IsRead = 1 WHERE Id = @id AND ${USER_SQL}`,
      { id: Number(req.params.id), userId: me.id, clerkUserId: me.clerkUserId || me.id }
    );
    res.json({ message: "Marked as read.", notificationId: Number(req.params.id) });
  });

  router.delete("/all", requireAuth, async (req, res) => {
    const me = keysFromAuth(req.user);
    const rows = await query(
      `DELETE FROM Notifications OUTPUT DELETED.Id WHERE ${USER_SQL}`,
      { userId: me.id, clerkUserId: me.clerkUserId || me.id }
    );
    res.json({ message: "Notifications deleted.", count: rows.length });
  });

  router.delete("/:id", requireAuth, async (req, res) => {
    const me = keysFromAuth(req.user);
    await query(`DELETE FROM Notifications WHERE Id = @id AND ${USER_SQL}`, {
      id: Number(req.params.id),
      userId: me.id,
      clerkUserId: me.clerkUserId || me.id,
    });
    res.status(204).end();
  });

  router.post("/", requireAdmin, async (req, res) => {
    const result = await query(
      `INSERT INTO Notifications (UserId, Title, Message, Type, IsRead, CreatedAt)
       OUTPUT INSERTED.Id
       VALUES (@userId, @title, @message, @type, 0, SYSUTCDATETIME())`,
      {
        userId: pick(req.body, "UserId"),
        title: pick(req.body, "Title"),
        message: pick(req.body, "Message"),
        type: pick(req.body, "Type") || null,
      }
    );
    res.json({ message: "Notification created.", notificationId: result[0].Id });
  });

  return router;
}
