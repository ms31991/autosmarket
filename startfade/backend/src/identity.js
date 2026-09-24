import { queryOne } from "./db.js";

export function asUserId(value) {
  if (value == null || value === "") return "";
  return String(value);
}

export async function requireDbUser(reqUser) {
  const clerkUserId = asUserId(reqUser?.clerkUserId);
  const id = asUserId(reqUser?.id);
  const row = await queryOne(
    `SELECT CONVERT(nvarchar(128), Id) AS Id,
            CONVERT(nvarchar(128), ClerkUserId) AS ClerkUserId
     FROM ApplicationUsers
     WHERE (@clerkUserId <> '' AND ClerkUserId = @clerkUserId)
        OR (@id <> '' AND CONVERT(nvarchar(128), Id) = @id)`,
    { clerkUserId, id }
  );
  if (!row?.Id) return null;
  return {
    id: String(row.Id),
    clerkUserId: String(row.ClerkUserId || clerkUserId),
  };
}

export function keysFromAuth(user) {
  return {
    id: user?.id != null ? String(user.id) : "",
    clerkUserId: user?.clerkUserId ? String(user.clerkUserId) : "",
  };
}

export async function resolveUserKeys(userId) {
  const id = userId != null ? String(userId) : "";
  if (!id) return { id: "", clerkUserId: "" };

  const row = await queryOne(
    `SELECT CONVERT(nvarchar(128), Id) AS Id,
            CONVERT(nvarchar(128), ClerkUserId) AS ClerkUserId
     FROM ApplicationUsers
     WHERE CONVERT(nvarchar(128), Id) = @userId
        OR CONVERT(nvarchar(128), ClerkUserId) = @userId`,
    { userId: id }
  );

  if (!row) return { id, clerkUserId: id };

  return {
    id: String(row.Id || id),
    clerkUserId: String(row.ClerkUserId || id),
  };
}

export function userMatchSql(column, idParam = "userId", clerkParam = "clerkUserId") {
  return `(
    CONVERT(nvarchar(128), ${column}) = CONVERT(nvarchar(128), @${idParam})
    OR (
      NULLIF(@${clerkParam}, '') IS NOT NULL
      AND CONVERT(nvarchar(128), ${column}) = CONVERT(nvarchar(128), @${clerkParam})
    )
  )`;
}

export function isSamePerson(left, right) {
  if (left == null || right == null || left === "" || right === "") return false;
  return String(left).toLowerCase() === String(right).toLowerCase();
}

export function ownsRecord(ownerId, user) {
  const keys = keysFromAuth(user);
  return (
    isSamePerson(ownerId, keys.id) ||
    isSamePerson(ownerId, keys.clerkUserId)
  );
}
