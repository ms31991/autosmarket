import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { query, queryOne } from "../db.js";
import { optionalAuth, requireAuth } from "../auth.js";
import { pick } from "../camel.js";
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
    res.json({
      message: "User already exists.",
      user: {
        id: user.Id,
        clerkUserId: user.ClerkUserId,
        name: user.Name,
        surname: user.Surname,
        email: user.Email,
        profileImage: user.ProfileImage,
        phoneNumber: user.PhoneNumber,
        roli_id: user.roli_id,
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
    if (!name?.trim()) return res.status(400).json({ message: "Emri është i detyrueshëm." });
    if (!surname?.trim()) return res.status(400).json({ message: "Mbiemri është i detyrueshëm." });
    await query(
      `UPDATE ApplicationUsers
       SET Name = @name, Surname = @surname, PhoneNumber = @phoneNumber
       WHERE ClerkUserId = @clerkUserId`,
      {
        name: name.trim(),
        surname: surname.trim(),
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
