import jwt from "jsonwebtoken";
import jwksRsa from "jwks-rsa";
import { randomUUID } from "crypto";
import { query, queryOne } from "./db.js";

const issuer = (process.env.CLERK_ISSUER || "").replace(/\/$/, "");

const client = jwksRsa({
  jwksUri: `${issuer}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

export function verifyClerkToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        issuer,
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      }
    );
  });
}

export async function ensureRoles() {
  const userRole = await queryOne(
    `SELECT roli_id FROM Rolis WHERE roli_emri = 'User'`
  );
  if (!userRole) {
    await query(`INSERT INTO Rolis (roli_emri) VALUES ('User')`);
  }
  const adminRole = await queryOne(
    `SELECT roli_id FROM Rolis WHERE roli_emri = 'Admin'`
  );
  if (!adminRole) {
    await query(`INSERT INTO Rolis (roli_emri) VALUES ('Admin')`);
  }
}

async function getUserRoleId() {
  const row = await queryOne(
    `SELECT roli_id FROM Rolis WHERE roli_emri = 'User'`
  );
  return row?.roli_id;
}

async function namesFromClerkPayload(payload) {
  let name = String(payload.given_name || payload.first_name || "").trim();
  let surname = String(payload.family_name || payload.last_name || "").trim();

  if ((!name || !surname) && payload.name) {
    const parts = String(payload.name).trim().split(/\s+/);
    if (!name) name = parts[0] || "";
    if (!surname && parts.length > 1) surname = parts.slice(1).join(" ");
  }

  return { name, surname };
}

function looksLikeClerkUserId(value) {
  return /^user_[a-zA-Z0-9]+$/i.test(String(value || "").trim());
}

function isFallbackEmail(value) {
  return String(value || "")
    .toLowerCase()
    .endsWith("@users.autosmarket.me");
}

function emailFromPayload(payload) {
  const direct = String(
    payload.email ||
      payload.email_address ||
      payload.primary_email_address ||
      ""
  )
    .trim()
    .toLowerCase();
  if (direct.includes("@") && !looksLikeClerkUserId(direct.split("@")[0])) {
    return direct;
  }
  return "";
}

function usernameFromPayload(payload, email, name, surname, fallbackId) {
  const claimed = String(
    payload.username || payload.preferred_username || ""
  ).trim();
  if (claimed && !looksLikeClerkUserId(claimed)) {
    return claimed.slice(0, 40);
  }
  if (email.includes("@") && !isFallbackEmail(email)) {
    return email.split("@")[0].slice(0, 40);
  }
  const slug = `${name}${surname ? `.${surname}` : ""}`
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 40);
  if (slug && slug !== "user" && slug !== "user.user") return slug;
  return `member${String(fallbackId || "").replace(/[^a-z0-9]/gi, "").slice(-6)}`;
}

async function findUserByEmail(email) {
  if (!email) return null;
  return queryOne(
    `SELECT u.*, r.roli_emri
     FROM ApplicationUsers u
     LEFT JOIN Rolis r ON r.roli_id = u.roli_id
     WHERE LOWER(LTRIM(RTRIM(u.Email))) = @email
        OR LOWER(LTRIM(RTRIM(u.UserName))) = @email`,
    { email }
  );
}

function toAuthUser(user, clerkUserId) {
  return {
    id: String(user.Id ?? user.id ?? ""),
    clerkUserId: String(user.ClerkUserId ?? user.clerkUserId ?? clerkUserId ?? ""),
    roleName: user.roli_emri,
  };
}

export async function provisionUser(payload) {
  const clerkUserId = payload.sub;
  if (!clerkUserId) return null;

  const { name, surname } = namesFromClerkPayload(payload);
  const email = emailFromPayload(payload);

  let user = await queryOne(
    `SELECT u.*, r.roli_emri
     FROM ApplicationUsers u
     LEFT JOIN Rolis r ON r.roli_id = u.roli_id
     WHERE u.ClerkUserId = @clerkUserId`,
    { clerkUserId }
  );

  const byEmail = await findUserByEmail(email);
  if (byEmail && user && String(byEmail.Id) !== String(user.Id) && byEmail.roli_id) {
    await query(
      `UPDATE ApplicationUsers SET roli_id = @roliId WHERE Id = @id`,
      { roliId: byEmail.roli_id, id: user.Id }
    );
    user.roli_id = byEmail.roli_id;
    user.roli_emri = byEmail.roli_emri;
  }

  if (!user && byEmail) {
    await query(
      `UPDATE ApplicationUsers
       SET ClerkUserId = @clerkUserId,
           Email = COALESCE(NULLIF(LTRIM(RTRIM(Email)), ''), @email)
       WHERE Id = @id AND (ClerkUserId IS NULL OR ClerkUserId = @clerkUserId)`,
      { clerkUserId, email: email || null, id: byEmail.Id }
    );
    user = await queryOne(
      `SELECT u.*, r.roli_emri
       FROM ApplicationUsers u
       LEFT JOIN Rolis r ON r.roli_id = u.roli_id
       WHERE u.Id = @id`,
      { id: byEmail.Id }
    );
  }

  if (user) {
    const currentName = String(user.Name || "").trim();
    const currentSurname = String(user.Surname || "").trim();
    const currentUserName = String(user.UserName || "").trim();
    const currentEmail = String(user.Email || "").trim();
    const nameIsId = !currentName || looksLikeClerkUserId(currentName);
    const surnameIsId = looksLikeClerkUserId(currentSurname);
    const userNameIsId =
      !currentUserName ||
      looksLikeClerkUserId(currentUserName) ||
      isFallbackEmail(currentUserName);
    const displayUserName = usernameFromPayload(
      payload,
      email,
      name,
      surname,
      user.Id
    );

    if (
      (nameIsId && name) ||
      (surnameIsId && surname) ||
      (!currentSurname && surname) ||
      userNameIsId ||
      isFallbackEmail(currentEmail)
    ) {
      await query(
        `UPDATE ApplicationUsers
         SET Name = CASE
               WHEN (Name IS NULL OR LTRIM(RTRIM(Name)) = '' OR Name LIKE 'user_%') AND @name <> ''
               THEN @name ELSE Name END,
             Surname = CASE
               WHEN (Surname IS NULL OR LTRIM(RTRIM(Surname)) = '' OR Surname LIKE 'user_%') AND @surname <> ''
               THEN @surname ELSE Surname END,
             UserName = CASE
               WHEN UserName IS NULL OR LTRIM(RTRIM(UserName)) = '' OR UserName LIKE 'user_%'
                    OR LOWER(UserName) LIKE '%@users.autosmarket.me'
               THEN @userName ELSE UserName END,
             Email = CASE
               WHEN Email IS NULL OR LTRIM(RTRIM(Email)) = '' OR LOWER(Email) LIKE '%@users.autosmarket.me'
               THEN NULLIF(@email, '') ELSE Email END
         WHERE Id = @id`,
        {
          id: user.Id,
          name: name || currentName.replace(/^user_.*/i, "") || "User",
          surname: surname || (surnameIsId ? "User" : currentSurname) || "User",
          userName: displayUserName,
          email,
        }
      );
    }

    return toAuthUser(user, clerkUserId);
  }

  const roliId = await getUserRoleId();
  const id = randomUUID();

  try {
    await query(
      `INSERT INTO ApplicationUsers
        (Id, ClerkUserId, UserName, Email, EmailConfirmed, Name, Surname, roli_id, CreatedDate,
         PhoneNumberConfirmed, TwoFactorEnabled, LockoutEnabled, AccessFailedCount)
       VALUES
        (@id, @clerkUserId, @userName, @email, 1, @name, @surname, @roliId, SYSUTCDATETIME(),
         0, 0, 0, 0)`,
      {
        id,
        clerkUserId,
        userName: usernameFromPayload(payload, email, name, surname, id),
        email: email || null,
        name: name || "User",
        surname: surname || "User",
        roliId,
      }
    );
  } catch {
    user = await queryOne(
      `SELECT u.*, r.roli_emri
       FROM ApplicationUsers u
       LEFT JOIN Rolis r ON r.roli_id = u.roli_id
       WHERE u.ClerkUserId = @clerkUserId`,
      { clerkUserId }
    );
    if (user) {
      return toAuthUser(user, clerkUserId);
    }
    throw new Error("Nuk u krijua ApplicationUser.");
  }

  return {
    id: String(id),
    clerkUserId: String(clerkUserId),
    roleName: "User",
  };
}

function bearer(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return req.query.access_token || req.auth?.token || null;
}

export async function attachUser(req) {
  const token = bearer(req);
  if (!token) return null;
  const payload = await verifyClerkToken(token);
  const user = await provisionUser(payload);
  req.authPayload = payload;
  req.user = user;
  return user;
}

export function optionalAuth(req, res, next) {
  attachUser(req)
    .then(() => next())
    .catch(() => next());
}

export function requireAuth(req, res, next) {
  if (req.method === "OPTIONS") {
    return next();
  }

  attachUser(req)
    .then((user) => {
      if (!user) {
        return res.status(401).json({ message: "User nuk është i autentikuar." });
      }
      next();
    })
    .catch((err) => {
      console.error("AUTH FAIL:", err && err.message);
      res.status(401).json({ message: "User nuk është i autentikuar." });
    });
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user?.roleName !== "Admin") {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  });
}
