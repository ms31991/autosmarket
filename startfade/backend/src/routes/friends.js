import { Router } from "express";
import { query, queryOne } from "../db.js";
import { requireAuth } from "../auth.js";
import {
  broadcastFriendshipChange,
  displayName,
  findUserByAnyId,
  friendCount,
  friendshipBetween,
  identityIdsFor,
  listAcceptedFriends,
  notifyUser,
  removeFriendRequestNotifications,
  settleFriendRequestNotifications,
  statusForUser,
} from "../friends.js";

export function friendsRouter() {
  const router = Router();
  router.use(requireAuth);

  const sendFriendList = async (req, res) => {
    try {
      const friends = await listAcceptedFriends(req.user);
      res.json(friends);
    } catch (error) {
      console.error("GET /Friends list failed:", error);
      res.status(500).json({ message: "Could not load friends." });
    }
  };

  router.get("/", sendFriendList);
  router.get("/mine", sendFriendList);
  router.get("/list", sendFriendList);

  router.get("/status/:userId", async (req, res) => {
    const otherId = req.params.userId;
    const myIds = await identityIdsFor(req.user.id, {
      clerkUserId: req.user.clerkUserId,
    });
    const otherIds = await identityIdsFor(otherId);
    const isSelf = otherIds.some((id) =>
      myIds.map((item) => item.toLowerCase()).includes(id.toLowerCase())
    );
    if (isSelf) {
      return res.json({
        status: "self",
        friendshipId: null,
        friendCount: await friendCount(otherId),
      });
    }
    const row = await friendshipBetween(req.user.id, otherId);
    res.json({
      ...(await statusForUser(row, req.user)),
      friendCount: await friendCount(otherId),
    });
  });

  router.get("/count/:userId", async (req, res) => {
    res.json({ count: await friendCount(req.params.userId) });
  });

  router.post("/request/:userId", async (req, res) => {
    const other = await findUserByAnyId(req.params.userId);
    if (!other) return res.status(404).json({ message: "User not found." });

    const myIds = await identityIdsFor(req.user.id, {
      clerkUserId: req.user.clerkUserId,
    });
    const otherIds = await identityIdsFor(other.Id, {
      clerkUserId: other.ClerkUserId,
    });
    const isSelf = otherIds.some((id) =>
      myIds.map((item) => item.toLowerCase()).includes(String(id).toLowerCase())
    );
    if (isSelf) {
      return res.status(400).json({ message: "You cannot add yourself." });
    }

    const existing = await friendshipBetween(req.user.id, other.Id);
    const existingStatus = existing
      ? await statusForUser(existing, req.user)
      : { status: "none" };

    if (existingStatus.status === "friends") {
      return res.status(400).json({ message: "You are already friends." });
    }
    if (existingStatus.status === "pending_sent") {
      return res.status(400).json({ message: "Friend request already sent." });
    }
    if (existingStatus.status === "pending_received") {
      return res.json(existingStatus);
    }

    if (existing) {
      await removeFriendRequestNotifications(existing.Id);
      await query(`DELETE FROM Friendships WHERE Id = @id`, { id: existing.Id });
    }

    const inserted = await query(
      `INSERT INTO Friendships (RequesterId, AddresseeId, Status, CreatedAt)
       OUTPUT INSERTED.*
       VALUES (@requesterId, @addresseeId, 'pending', SYSUTCDATETIME())`,
      { requesterId: req.user.id, addresseeId: other.Id }
    );
    const row = inserted[0];
    const me = await findUserByAnyId(req.user.id);
    const name = displayName(me);
    await notifyUser({
      userId: other.Id,
      title: "Friend request",
      message: `${name} has sent a friend request.`,
      type: `FriendRequest:${row.Id}:${req.user.id}`,
    });
    await broadcastFriendshipChange({
      userA: req.user.id,
      userB: other.Id,
      status: "pending",
      friendshipId: row.Id,
    });

    res.json(await statusForUser(row, req.user));
  });

  router.post("/:id/accept", async (req, res) => {
    const id = Number(req.params.id);
    const myIds = await identityIdsFor(req.user.id, {
      clerkUserId: req.user.clerkUserId,
    });
    const params = { id };
    const placeholders = myIds.map((userId, index) => {
      params[`mid${index}`] = userId;
      return `@mid${index}`;
    });
    const row = await queryOne(
      `SELECT * FROM Friendships
       WHERE Id = @id
         AND LOWER(LTRIM(RTRIM(Status))) = N'pending'
         AND CONVERT(nvarchar(128), AddresseeId) IN (${placeholders.join(",")})`,
      params
    );
    if (!row) return res.status(404).json({ message: "Request not found." });

    await query(
      `UPDATE Friendships SET Status = N'accepted' WHERE Id = @id`,
      { id }
    );

    const me = await findUserByAnyId(req.user.id);
    await notifyUser({
      userId: row.RequesterId,
      title: "Friend request",
      message: `${displayName(me)} accepted your friend request.`,
      type: `FriendAccepted:${id}:${req.user.id}`,
    });
    await settleFriendRequestNotifications(id, "accepted");
    await broadcastFriendshipChange({
      userA: req.user.id,
      userB: row.RequesterId,
      status: "friends",
      friendshipId: id,
    });

    res.json({ status: "friends", friendshipId: id });
  });

  router.post("/:id/reject", async (req, res) => {
    const id = Number(req.params.id);
    const myIds = await identityIdsFor(req.user.id, {
      clerkUserId: req.user.clerkUserId,
    });
    const params = { id };
    const placeholders = myIds.map((userId, index) => {
      params[`mid${index}`] = userId;
      return `@mid${index}`;
    });
    const row = await queryOne(
      `SELECT * FROM Friendships
       WHERE Id = @id
         AND LOWER(LTRIM(RTRIM(Status))) = N'pending'
         AND CONVERT(nvarchar(128), AddresseeId) IN (${placeholders.join(",")})`,
      params
    );
    if (!row) return res.status(404).json({ message: "Request not found." });
    await query(`DELETE FROM Friendships WHERE Id = @id`, { id });
    await settleFriendRequestNotifications(id, "rejected");
    await broadcastFriendshipChange({
      userA: req.user.id,
      userB: row.RequesterId,
      status: "none",
      friendshipId: null,
    });
    res.json({ status: "none", friendshipId: null });
  });

  router.delete("/:userId", async (req, res) => {
    const otherId = req.params.userId;
    const existing = await friendshipBetween(req.user.id, otherId);
    if (!existing) return res.json({ status: "none", friendshipId: null });
    await removeFriendRequestNotifications(existing.Id);
    await query(`DELETE FROM Friendships WHERE Id = @id`, { id: existing.Id });
    await broadcastFriendshipChange({
      userA: req.user.id,
      userB: otherId,
      status: "none",
      friendshipId: null,
    });
    res.json({ status: "none", friendshipId: null });
  });

  return router;
}
