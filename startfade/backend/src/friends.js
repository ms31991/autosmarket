import { query, queryOne } from "./db.js";
import { camel } from "./camel.js";
import { emitToUser } from "./realtime.js";
import { resolveUserKeys } from "./identity.js";
import { toPublicUrl } from "./paths.js";

export async function ensureFriendshipsTable() {
  await query(`
    IF OBJECT_ID(N'dbo.Friendships', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.Friendships (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        RequesterId NVARCHAR(128) NOT NULL,
        AddresseeId NVARCHAR(128) NOT NULL,
        Status NVARCHAR(20) NOT NULL,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Friendships_CreatedAt DEFAULT SYSUTCDATETIME()
      );
      CREATE UNIQUE INDEX IX_Friendships_Pair ON dbo.Friendships (RequesterId, AddresseeId);
    END
  `);
}

export function displayName(user) {
  return `${user?.Name || user?.name || ""} ${user?.Surname || user?.surname || ""}`.trim() || "User";
}

function asId(value) {
  if (value == null || value === "") return "";
  if (typeof value === "object" && typeof value.toString === "function") {
    const text = value.toString();
    if (text && text !== "[object Object]") return text;
  }
  return String(value);
}

function bindIdList(ids, prefix, params) {
  return ids.map((id, index) => {
    const key = `${prefix}${index}`;
    params[key] = id;
    return `@${key}`;
  });
}

export async function findUserByAnyId(userId) {
  const id = asId(userId);
  if (!id) return null;
  return queryOne(
    `SELECT
       CONVERT(nvarchar(128), Id) AS Id,
       CONVERT(nvarchar(128), ClerkUserId) AS ClerkUserId,
       Name, Surname, UserName, ProfileImage
     FROM ApplicationUsers
     WHERE CONVERT(nvarchar(128), Id) = @id
        OR CONVERT(nvarchar(128), ClerkUserId) = @id`,
    { id }
  );
}

export async function friendshipBetween(userA, userB) {
  const aIds = await identityIdsFor(userA);
  const bIds = await identityIdsFor(userB);
  if (!aIds.length || !bIds.length) return null;

  const params = {};
  const aPh = bindIdList(aIds, "a", params);
  const bPh = bindIdList(bIds, "b", params);
  return queryOne(
    `SELECT TOP 1 *
     FROM Friendships
     WHERE (
             CONVERT(nvarchar(128), RequesterId) IN (${aPh.join(",")})
         AND CONVERT(nvarchar(128), AddresseeId) IN (${bPh.join(",")})
           )
        OR (
             CONVERT(nvarchar(128), RequesterId) IN (${bPh.join(",")})
         AND CONVERT(nvarchar(128), AddresseeId) IN (${aPh.join(",")})
           )
     ORDER BY CASE
       WHEN LOWER(LTRIM(RTRIM(Status))) = N'accepted' THEN 0
       WHEN LOWER(LTRIM(RTRIM(Status))) = N'pending' THEN 1
       ELSE 2 END, Id DESC`,
    params
  );
}

export async function identityIdsFor(userId, extra = {}) {
  const keys = await resolveUserKeys(userId);
  const me = asId(keys.id || userId);
  const clerk = asId(extra.clerkUserId || keys.clerkUserId);
  const rows = await query(
    `SELECT CONVERT(nvarchar(128), Id) AS Id,
            CONVERT(nvarchar(128), ClerkUserId) AS ClerkUserId
     FROM ApplicationUsers
     WHERE (@me <> N'' AND CONVERT(nvarchar(128), Id) = @me)
        OR (@clerk <> N'' AND (
              CONVERT(nvarchar(128), ClerkUserId) = @clerk
           OR CONVERT(nvarchar(128), Id) = @clerk
        ))`,
    { me, clerk }
  );

  const ids = new Set();
  for (const row of rows) {
    if (row.Id) ids.add(String(row.Id));
    if (row.ClerkUserId) ids.add(String(row.ClerkUserId));
  }
  if (me) ids.add(me);
  if (clerk) ids.add(clerk);
  return [...ids];
}

export async function listAcceptedFriends(authUser) {
  const myIds = await identityIdsFor(authUser?.id, {
    clerkUserId: authUser?.clerkUserId,
  });
  if (!myIds.length) return [];

  const mine = new Set(myIds.map((id) => id.toLowerCase()));
  const params = {};
  const placeholders = myIds.map((id, index) => {
    params[`mid${index}`] = id;
    return `@mid${index}`;
  });

  const friendships = await query(
    `SELECT RequesterId, AddresseeId
     FROM Friendships
     WHERE LOWER(LTRIM(RTRIM(Status))) = N'accepted'
       AND (
         CONVERT(nvarchar(128), RequesterId) IN (${placeholders.join(",")})
         OR CONVERT(nvarchar(128), AddresseeId) IN (${placeholders.join(",")})
       )`,
    params
  );

  const otherIds = [];
  for (const row of friendships) {
    const requester = asId(row.RequesterId ?? row.requesterId);
    const addressee = asId(row.AddresseeId ?? row.addresseeId);
    const other = mine.has(requester.toLowerCase()) ? addressee : requester;
    if (other && !mine.has(other.toLowerCase()) && !otherIds.includes(other)) {
      otherIds.push(other);
    }
  }

  if (!otherIds.length) return [];

  const userParams = {};
  const userPlaceholders = otherIds.map((id, index) => {
    userParams[`oid${index}`] = id;
    return `@oid${index}`;
  });

  const users = await query(
    `SELECT
       CONVERT(nvarchar(128), Id) AS Id,
       CONVERT(nvarchar(128), ClerkUserId) AS ClerkUserId,
       Name, Surname, UserName, ProfileImage
     FROM ApplicationUsers
     WHERE CONVERT(nvarchar(128), Id) IN (${userPlaceholders.join(",")})
        OR (
          ClerkUserId IS NOT NULL
          AND CONVERT(nvarchar(128), ClerkUserId) IN (${userPlaceholders.join(",")})
        )`,
    userParams
  );

  const seen = new Set();
  const friends = [];
  for (const row of camel(users)) {
    const id = asId(row.id);
    if (!id || seen.has(id.toLowerCase())) continue;
    seen.add(id.toLowerCase());
    const name = `${row.name || ""} ${row.surname || ""}`.trim();
    const userName = String(row.userName || "").trim();
    friends.push({
      id,
      clerkUserId: row.clerkUserId || null,
      name:
        name ||
        (userName && !userName.startsWith("user_") ? userName : "User"),
      profileImage: toPublicUrl(row.profileImage),
    });
  }
  return friends;
}

export async function friendCount(userId) {
  const ids = await identityIdsFor(userId);
  if (!ids.length) return 0;
  const params = {};
  const placeholders = ids.map((id, index) => {
    params[`mid${index}`] = id;
    return `@mid${index}`;
  });
  const row = await queryOne(
    `SELECT COUNT(*) AS count
     FROM Friendships
     WHERE LOWER(LTRIM(RTRIM(Status))) = N'accepted'
       AND (
         CONVERT(nvarchar(128), RequesterId) IN (${placeholders.join(",")})
         OR CONVERT(nvarchar(128), AddresseeId) IN (${placeholders.join(",")})
       )`,
    params
  );
  return Number(row?.count || 0);
}

export function friendshipStatus(row, me) {
  if (!row) return { status: "none", friendshipId: null };
  const id = row.Id;
  const mine = new Set(
    (Array.isArray(me) ? me : [me])
      .filter(Boolean)
      .map((value) => asId(value).toLowerCase())
  );
  const status = String(row.Status || "").toLowerCase();
  const requester = asId(row.RequesterId).toLowerCase();
  const addressee = asId(row.AddresseeId).toLowerCase();

  if (status === "accepted") {
    return { status: "friends", friendshipId: id };
  }
  if (status === "pending" && mine.has(requester)) {
    return { status: "pending_sent", friendshipId: id };
  }
  if (status === "pending" && mine.has(addressee)) {
    return { status: "pending_received", friendshipId: id };
  }
  return { status: "none", friendshipId: id };
}

export async function statusForUser(row, authUser) {
  if (!row) return { status: "none", friendshipId: null };
  const ids = await identityIdsFor(authUser?.id || authUser, {
    clerkUserId: authUser?.clerkUserId,
  });
  return friendshipStatus(row, ids);
}

function notificationPayload(n) {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    isRead: n.isRead,
    createdAt: n.createdAt,
    userId: n.userId,
  };
}

export async function emitToIdentities(userId, event, payload) {
  const ids = await identityIdsFor(userId);
  for (const id of ids) {
    emitToUser("notifications", id, event, payload);
  }
}

export async function notifyUser({ userId, title, message, type }) {
  const keys = await resolveUserKeys(userId);
  const inserted = await query(
    `INSERT INTO Notifications (UserId, Title, Message, Type, IsRead, CreatedAt)
     OUTPUT INSERTED.*
     VALUES (@userId, @title, @message, @type, 0, SYSUTCDATETIME())`,
    { userId: keys.id || userId, title, message, type }
  );
  const n = camel(inserted[0]);
  const payload = notificationPayload(n);
  await emitToIdentities(keys.id || userId, "ReceiveNotification", payload);
  return n;
}

export async function settleFriendRequestNotifications(friendshipId, outcome) {
  const id = Number(friendshipId);
  const accepted = outcome === "accepted";
  const rows = await query(
    `UPDATE Notifications
     SET IsRead = 1,
         Type = @newType,
         Message = @message
     OUTPUT INSERTED.*
     WHERE Type LIKE @like`,
    {
      newType: `FriendRequestSettled:${id}:${accepted ? "accepted" : "rejected"}`,
      message: accepted
        ? "You accepted this friend request."
        : "You rejected this friend request.",
      like: `FriendRequest:${id}:%`,
    }
  );

  for (const row of camel(rows)) {
    const payload = notificationPayload(row);
    payload.isRead = true;
    await emitToIdentities(row.userId, "NotificationUpdated", payload);
  }
}

export async function removeFriendRequestNotifications(friendshipId) {
  const id = Number(friendshipId);
  const rows = await query(
    `DELETE FROM Notifications
     OUTPUT DELETED.*
     WHERE Type LIKE @like`,
    { like: `FriendRequest:${id}:%` }
  );
  for (const row of camel(rows)) {
    await emitToIdentities(row.userId, "NotificationRemoved", { id: row.id });
  }
}

export async function broadcastFriendshipChange({
  userA,
  userB,
  status,
  friendshipId,
}) {
  const payloadFor = (otherUserId) => ({
    status,
    friendshipId,
    otherUserId,
  });
  await emitToIdentities(userA, "FriendshipUpdated", payloadFor(userB));
  await emitToIdentities(userB, "FriendshipUpdated", payloadFor(userA));
}
