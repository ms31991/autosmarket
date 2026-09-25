import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { query, queryOne } from "../db.js";
import { optionalAuth, requireAuth } from "../auth.js";
import { pick } from "../camel.js";
import { isPlaceholderName } from "../personName.js";
import {
  findUserByAnyId,
  friendCount,
  friendshipBetween,
  identityIdsFor,
  statusForUser,
} from "../friends.js";
import { profileUploadsDir, publicFilePath, toPublicUrl } from "../paths.js";

const uploadDir = profileUploadsDir;
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

async function findByClerk(clerkUserId) {
  return queryOne(
    `SELECT u.*, r.roli_emri
     FROM ApplicationUsers u
     LEFT JOIN Rolis r ON r.roli_id = u.roli_id
     WHERE u.ClerkUserId = @clerkUserId`,
    { clerkUserId }
  );
}

export function usersRouter() {
  const router = Router();

  router.get("/public/:userId", optionalAuth, async (req, res) => {
    const userId = req.params.userId;
    const user = await findUserByAnyId(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    const targetId = String(user.Id);
    const myIds = req.user?.id
      ? await identityIdsFor(req.user.id, { clerkUserId: req.user.clerkUserId })
      : [];
    const otherIds = await identityIdsFor(targetId, {
      clerkUserId: user.ClerkUserId,
    });
    const isSelf = Boolean(
      myIds.length &&
        otherIds.some((id) =>
          myIds.map((item) => item.toLowerCase()).includes(String(id).toLowerCase())
        )
    );
    const row = req.user?.id && !isSelf
      ? await friendshipBetween(req.user.id, targetId)
      : null;

    res.json({
      id: user.Id,
      name: user.Name,
      surname: user.Surname,
      userName: user.UserName || null,
      profileImage: toPublicUrl(user.ProfileImage) || null,
      friendCount: await friendCount(targetId),
      isSelf,
      friendship: isSelf
        ? { status: "self", friendshipId: null }
        : req.user?.id
          ? await statusForUser(row, req.user)
          : { status: "none", friendshipId: null },
    });
  });

  router.use(requireAuth);

  router.post("/sync", async (req, res) => {
    const user = await findByClerk(req.user.clerkUserId);
    if (!user) {
      return res.status(404).json({ message: "User nuk u gjet. Duhet të bëhet sync me Clerk." });
    }

    const name = String(pick(req.body, "Name") || "").trim();
    const surname = String(pick(req.body, "Surname") || "").trim();
    const email = String(pick(req.body, "Email") || "").trim().toLowerCase();
    let userName = String(pick(req.body, "UserName") || "")
      .trim()
      .replace(/^@/, "");
    if (userName && (!/^[a-zA-Z0-9._]{3,30}$/.test(userName) || /^user_/i.test(userName))) {
      userName = "";
    }

    const currentName = String(user.Name || "").trim();
    const currentSurname = String(user.Surname || "").trim();
    const nextName = name && !isPlaceholderName(name) ? name : currentName;
    const nextSurname =
      surname && !isPlaceholderName(surname) ? surname : currentSurname;
    const nextEmail =
      email.includes("@") && !email.endsWith("@users.autosmarket.me")
        ? email
        : user.Email;
    const currentUserName = String(user.UserName || "").trim();
    const nextUserName =
      userName ||
      (!isPlaceholderName(currentUserName) ? currentUserName : currentUserName);

    await query(
      `UPDATE ApplicationUsers
       SET Name = CASE WHEN @name <> '' THEN @name ELSE Name END,
           Surname = CASE WHEN @surname <> '' THEN @surname ELSE Surname END,
           Email = CASE WHEN @email <> '' THEN @email ELSE Email END,
           UserName = CASE
             WHEN @userName <> '' AND (UserName IS NULL OR UserName LIKE 'user_%' OR LOWER(UserName) LIKE '%@users.autosmarket.me')
             THEN @userName ELSE UserName END
       WHERE ClerkUserId = @clerkUserId`,
      {
        name: isPlaceholderName(nextName) ? "" : nextName,
        surname: isPlaceholderName(nextSurname) ? "" : nextSurname,
        email: nextEmail || "",
        userName: nextUserName && !isPlaceholderName(nextUserName) ? nextUserName : "",
        clerkUserId: req.user.clerkUserId,
      }
    );

    const fresh = await findByClerk(req.user.clerkUserId);
    res.json({
      message: "User already exists.",
      user: {
        id: fresh.Id,
        clerkUserId: fresh.ClerkUserId,
        name: fresh.Name,
        surname: fresh.Surname,
        userName: fresh.UserName,
        email: fresh.Email,
        profileImage: fresh.ProfileImage,
        phoneNumber: fresh.PhoneNumber,
        roli_id: fresh.roli_id,
      },
    });
  });

  router.get("/profile", async (req, res) => {
    const user = await findByClerk(req.user.clerkUserId);
    if (!user) {
      return res.status(404).json({ message: "User nuk u gjet. Duhet të bëhet sync me Clerk." });
    }
    res.json({
      id: user.Id,
      clerkUserId: user.ClerkUserId,
      name: user.Name,
      surname: user.Surname,
      userName: user.UserName,
      email: user.Email,
      phoneNumber: user.PhoneNumber,
      profileImage: toPublicUrl(user.ProfileImage) || null,
      roliId: user.roli_id,
      roleName: user.roli_emri,
      createdDate: user.CreatedDate,
      friendCount: await friendCount(user.Id),
    });
  });

  router.put("/profile", async (req, res) => {
    const name = pick(req.body, "Name");
    const surname = pick(req.body, "Surname");
    const userName = String(pick(req.body, "UserName") || "")
      .trim()
      .replace(/^@/, "");
    if (!name?.trim()) return res.status(400).json({ message: "Emri është i detyrueshëm." });
    if (!surname?.trim()) return res.status(400).json({ message: "Mbiemri është i detyrueshëm." });
    if (!userName) return res.status(400).json({ message: "Username is required." });
    if (!/^[a-zA-Z0-9._]{3,30}$/.test(userName) || /^user_/i.test(userName)) {
      return res.status(400).json({
        message: "Username must be 3–30 letters, numbers, dots or underscores.",
      });
    }
    const taken = await queryOne(
      `SELECT Id FROM ApplicationUsers
       WHERE LOWER(LTRIM(RTRIM(UserName))) = LOWER(@userName)
         AND ClerkUserId <> @clerkUserId`,
      { userName, clerkUserId: req.user.clerkUserId }
    );
    if (taken) {
      return res.status(400).json({ message: "That username is taken." });
    }
    await query(
      `UPDATE ApplicationUsers
       SET Name = @name, Surname = @surname, UserName = @userName, PhoneNumber = @phoneNumber
       WHERE ClerkUserId = @clerkUserId`,
      {
        name: name.trim(),
        surname: surname.trim(),
        userName,
        phoneNumber: pick(req.body, "PhoneNumber") || null,
        clerkUserId: req.user.clerkUserId,
      }
    );
    res.json({ message: "Profili u përditësua me sukses." });
  });

  router.post("/profile-image", upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Duhet të zgjidhni një foto." });
    const user = await findByClerk(req.user.clerkUserId);
    if (user?.ProfileImage) {
      const old = publicFilePath(user.ProfileImage);
      if (fs.existsSync(old)) fs.unlinkSync(old);
    }
    const imageUrl = `/uploads/profiles/${req.file.filename}`;
    await query(
      `UPDATE ApplicationUsers SET ProfileImage = @imageUrl WHERE ClerkUserId = @clerkUserId`,
      { imageUrl, clerkUserId: req.user.clerkUserId }
    );
    res.json({ message: "Fotoja e profilit u uploadua me sukses.", profileImage: imageUrl });
  });

  router.delete("/profile-image", async (req, res) => {
    const user = await findByClerk(req.user.clerkUserId);
    if (!user?.ProfileImage) {
      return res.status(404).json({ message: "User nuk ka foto profili." });
    }
    const filePath = publicFilePath(user.ProfileImage);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await query(
      `UPDATE ApplicationUsers SET ProfileImage = NULL WHERE ClerkUserId = @clerkUserId`,
      { clerkUserId: req.user.clerkUserId }
    );
    res.json({ message: "Fotoja e profilit u fshi me sukses." });
  });

  router.put("/change-password", (_req, res) => {
    res.status(400).json({
      message:
        "Password-i menaxhohet nga Clerk. Përdorni Clerk për ndryshimin e password-it.",
    });
  });

  return router;
}
