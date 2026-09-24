import { Router } from "express";
import { query, queryOne } from "../db.js";
import { camel, pick } from "../camel.js";
import { requireAuth } from "../auth.js";
import { emitToUser } from "../realtime.js";
import { keysFromAuth, userMatchSql } from "../identity.js";

function conversationAccessSql() {
  return `(
    ${userMatchSql("User1Id", "ownerId", "clerkUserId")}
    OR ${userMatchSql("User2Id", "ownerId", "clerkUserId")}
  )`;
}

export function chatRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get("/conversation/:otherUserId", async (req, res) => {
    const userId = req.user.id;
    const otherUserId = req.params.otherUserId;
    if (userId === otherUserId) {
      return res.status(400).send("Nuk mund të hapësh bisedë me veten.");
    }
    const vehicleId = req.query.vehicleId ? Number(req.query.vehicleId) : null;
    let conversation = await queryOne(
      `SELECT * FROM Conversations
       WHERE ((User1Id = @userId AND User2Id = @otherUserId)
           OR (User1Id = @otherUserId AND User2Id = @userId))
         AND (@vehicleId IS NULL OR VehicleId = @vehicleId)`,
      { userId, otherUserId, vehicleId }
    );
    if (!conversation) {
      const rows = await query(
        `INSERT INTO Conversations (User1Id, User2Id, VehicleId, CreatedAt)
         OUTPUT INSERTED.*
         VALUES (@userId, @otherUserId, @vehicleId, SYSUTCDATETIME())`,
        { userId, otherUserId, vehicleId }
      );
      conversation = rows[0];
    }
    res.json({ id: conversation.Id });
  });

  router.get("/conversations", async (req, res) => {
    const userId = req.user.id;
    const rows = await query(
      `SELECT
         c.Id,
         CASE WHEN c.User1Id = @userId THEN c.User2Id ELSE c.User1Id END AS OtherUserId,
         CASE WHEN c.User1Id = @userId THEN u2.Name ELSE u1.Name END AS OtherUserFirstName,
         CASE WHEN c.User1Id = @userId THEN u2.Surname ELSE u1.Surname END AS OtherUserLastName,
         CASE WHEN c.User1Id = @userId
           THEN COALESCE(
             NULLIF(LTRIM(RTRIM(ISNULL(u2.Name, '') + ' ' + ISNULL(u2.Surname, ''))), ''),
             CASE WHEN u2.UserName IS NULL OR u2.UserName LIKE 'user_%' OR u2.UserName = u2.ClerkUserId
               THEN NULL ELSE u2.UserName END
           )
           ELSE COALESCE(
             NULLIF(LTRIM(RTRIM(ISNULL(u1.Name, '') + ' ' + ISNULL(u1.Surname, ''))), ''),
             CASE WHEN u1.UserName IS NULL OR u1.UserName LIKE 'user_%' OR u1.UserName = u1.ClerkUserId
               THEN NULL ELSE u1.UserName END
           ) END AS OtherUserName,
         c.VehicleId,
         CASE WHEN v.Id IS NULL THEN NULL
              ELSE b.Name + ' ' + m.Name + ' ' + CAST(v.Year AS nvarchar) END AS VehicleTitle,
         c.LastMessageAt,
         (SELECT COUNT(*) FROM Messages msg
          WHERE msg.ConversationId = c.Id AND msg.SenderId <> @userId AND msg.IsRead = 0) AS UnreadCount
       FROM Conversations c
       LEFT JOIN ApplicationUsers u1 ON (
         CONVERT(nvarchar(128), u1.Id) = CONVERT(nvarchar(128), c.User1Id)
         OR u1.ClerkUserId = CONVERT(nvarchar(128), c.User1Id)
       )
       LEFT JOIN ApplicationUsers u2 ON (
         CONVERT(nvarchar(128), u2.Id) = CONVERT(nvarchar(128), c.User2Id)
         OR u2.ClerkUserId = CONVERT(nvarchar(128), c.User2Id)
       )
       LEFT JOIN Vehicles v ON v.Id = c.VehicleId
       LEFT JOIN Brands b ON b.Id = v.BrandId
       LEFT JOIN VehicleModels m ON m.Id = v.ModelId
       WHERE c.User1Id = @userId OR c.User2Id = @userId
       ORDER BY COALESCE(c.LastMessageAt, c.CreatedAt) DESC`,
      { userId }
    );
    res.json(camel(rows));
  });

  router.get("/:conversationId/messages", async (req, res) => {
    const conversationId = Number(req.params.conversationId);
    const keys = keysFromAuth(req.user);
    const conversation = await queryOne(
      `SELECT * FROM Conversations
       WHERE Id = @conversationId AND ${conversationAccessSql()}`,
      {
        conversationId,
        ownerId: keys.id,
        clerkUserId: keys.clerkUserId || keys.id,
      }
    );
    if (!conversation) return res.status(403).end();
    const rows = await query(
      `SELECT Id, ConversationId, SenderId, Text, SentAt, IsRead,
              CASE WHEN (
                CONVERT(nvarchar(128), SenderId) = CONVERT(nvarchar(128), @ownerId)
                OR (
                  NULLIF(@clerkUserId, '') IS NOT NULL
                  AND CONVERT(nvarchar(128), SenderId) = CONVERT(nvarchar(128), @clerkUserId)
                )
              ) THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS IsMine
       FROM Messages WHERE ConversationId = @conversationId ORDER BY SentAt`,
      {
        conversationId,
        ownerId: keys.id,
        clerkUserId: keys.clerkUserId || keys.id,
      }
    );
    res.json(camel(rows));
  });

  router.post("/send", async (req, res) => {
    const text = pick(req.body, "Text");
    const conversationId = pick(req.body, "ConversationId");
    if (!text?.trim()) {
      return res.status(400).json({ message: "Mesazhi nuk mund të jetë bosh." });
    }
    const keys = keysFromAuth(req.user);
    const conversation = await queryOne(
      `SELECT * FROM Conversations
       WHERE Id = @conversationId AND ${conversationAccessSql()}`,
      {
        conversationId,
        ownerId: keys.id,
        clerkUserId: keys.clerkUserId || keys.id,
      }
    );
    if (!conversation) return res.status(403).end();

    const me = String(keys.id);
    const clerk = String(keys.clerkUserId || keys.id);
    const user1 = String(conversation.User1Id);
    const receiverId =
      user1 === me || user1 === clerk
        ? conversation.User2Id
        : conversation.User1Id;

    const sender = await queryOne(
      `SELECT Name, Surname, UserName, ClerkUserId FROM ApplicationUsers
       WHERE CONVERT(nvarchar(128), Id) = CONVERT(nvarchar(128), @id)
          OR CONVERT(nvarchar(128), ClerkUserId) = CONVERT(nvarchar(128), @id)`,
      { id: req.user.id }
    );
    const first = String(sender?.Name || "").trim();
    const last = String(sender?.Surname || "").trim();
    const senderName = [first, last]
      .filter((part) => part && !part.startsWith("user_"))
      .join(" ")
      .trim() || "Someone";

    const inserted = await query(
      `INSERT INTO Messages (ConversationId, SenderId, Text, SentAt, IsRead)
       OUTPUT INSERTED.*
       VALUES (@conversationId, @senderId, @text, SYSUTCDATETIME(), 0)`,
      { conversationId, senderId: req.user.id, text: text.trim() }
    );
    await query(
      `UPDATE Conversations SET LastMessageAt = SYSUTCDATETIME() WHERE Id = @conversationId`,
      { conversationId }
    );

    const dto = camel(inserted[0]);

    const notif = await query(
      `INSERT INTO Notifications (UserId, Title, Message, Type, IsRead, CreatedAt)
       OUTPUT INSERTED.*
       VALUES (@userId, @title, @message, @type, 0, SYSUTCDATETIME())`,
      {
        userId: receiverId,
        title: senderName,
        message: text.trim(),
        type: `message:${conversationId}`,
      }
    );
    const n = camel(notif[0]);

    emitToUser("chat", receiverId, "ReceiveMessage", { ...dto, isMine: false });
    emitToUser("chat", req.user.id, "MessageSent", { ...dto, isMine: true });
    emitToUser("notifications", receiverId, "ReceiveNotification", {
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt,
      conversationId,
      senderId: req.user.id,
      senderName,
    });

    res.json({ ...dto, isMine: true });
  });

  router.post("/:conversationId/read", async (req, res) => {
    const conversationId = Number(req.params.conversationId);
    const result = await query(
      `UPDATE Messages SET IsRead = 1
       OUTPUT INSERTED.Id
       WHERE ConversationId = @conversationId AND SenderId <> @userId AND IsRead = 0`,
      { conversationId, userId: req.user.id }
    );
    res.json({ count: result.length });
  });

  router.delete("/:conversationId", async (req, res) => {
    const conversationId = Number(req.params.conversationId);
    const conversation = await queryOne(
      `SELECT Id FROM Conversations
       WHERE Id = @conversationId AND (User1Id = @userId OR User2Id = @userId)`,
      { conversationId, userId: req.user.id }
    );
    if (!conversation) return res.status(403).end();

    await query(
      `DELETE FROM Messages WHERE ConversationId = @conversationId`,
      { conversationId }
    );
    await query(
      `DELETE FROM Conversations WHERE Id = @conversationId`,
      { conversationId }
    );
    res.status(204).end();
  });

  return router;
}
