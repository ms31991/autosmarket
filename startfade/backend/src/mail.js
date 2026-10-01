import { query, queryOne } from "./db.js";
import { getSiteSettings, resolveMailFrom } from "./siteSettings.js";

function frontendUrl() {
  return String(process.env.FRONTEND_URL || "https://www.autosmarket.me").replace(
    /\/$/,
    ""
  );
}


export function isMailConfigured() {
  return Boolean(
    String(process.env.RESEND_API_KEY || "").trim() ||
      String(process.env.SMTP_HOST || "").trim()
  );
}

export async function emailForUserId(userId) {
  if (!userId) return null;
  const row = await queryOne(
    `SELECT Email FROM ApplicationUsers
     WHERE CONVERT(nvarchar(128), Id) = CONVERT(nvarchar(128), @id)
        OR CONVERT(nvarchar(128), ClerkUserId) = CONVERT(nvarchar(128), @id)`,
    { id: String(userId) }
  );
  const email = String(row?.Email || row?.email || "").trim();
  if (!email.includes("@")) return null;
  if (email.toLowerCase().includes("@users.autosmarket.me")) return null;
  return email;
}

async function sendWithResend({ to, subject, text, html, from, replyTo }) {
  const key = String(process.env.RESEND_API_KEY || "").trim();
  if (!key) return false;
  const payload = {
    from: from || (await resolveMailFrom()),
    to: [to],
    subject,
    text,
    html,
  };
  if (replyTo) payload.reply_to = replyTo;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend ${response.status}: ${body.slice(0, 300)}`);
  }
  return true;
}

async function sendWithSmtp({ to, subject, text, html, from, replyTo }) {
  const host = String(process.env.SMTP_HOST || "").trim();
  if (!host) return false;
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });
  await transporter.sendMail({
    from: from || (await resolveMailFrom()),
    replyTo: replyTo || undefined,
    to,
    subject,
    text,
    html,
  });
  return true;
}

export async function sendMail({ to, subject, text, html, from, replyTo }) {
  if (!to || !isMailConfigured()) return false;
  const payload = { to, subject, text, html, from, replyTo };
  if (String(process.env.RESEND_API_KEY || "").trim()) {
    return sendWithResend(payload);
  }
  return sendWithSmtp(payload);
}

export async function notifyNewMessage({
  receiverId,
  senderName,
  preview,
  conversationId,
}) {
  if (!isMailConfigured()) return;
  const settings = await getSiteSettings();
  const recipients = [];
  const seen = new Set();
  function addTo(email) {
    const to = String(email || "").trim();
    if (!to.includes("@")) return;
    if (to.toLowerCase().includes("@users.autosmarket.me")) return;
    const key = to.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    recipients.push(to);
  }
  addTo(await emailForUserId(receiverId));
  addTo(settings.messageNotifyEmail);
  if (!recipients.length) return;
  const who = String(senderName || "Dikush").trim() || "Dikush";
  const url = `${frontendUrl()}/messages/${conversationId}`;
  const subject = `Të ka shkruar ${who} në AutoMarket`;
  const text = `Të ka shkruar ${who}.\n\n${preview}\n\nHape bisedën: ${url}`;
  const html = `<p>Të ka shkruar <strong>${escapeHtml(who)}</strong>.</p>
<p>${escapeHtml(preview)}</p>
<p><a href="${url}">Hape bisedën</a></p>`;
  for (const to of recipients) {
    await sendMail({
      to,
      subject,
      text,
      html,
      from: await resolveMailFrom(),
    });
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function alreadyMailed(userId, type) {
  const row = await queryOne(
    `SELECT TOP 1 Id FROM Notifications
     WHERE CONVERT(nvarchar(128), UserId) = CONVERT(nvarchar(128), @userId)
       AND Type = @type`,
    { userId: String(userId), type }
  );
  return Boolean(row);
}

async function markMailed(userId, title, message, type) {
  await query(
    `INSERT INTO Notifications (UserId, Title, Message, Type, IsRead, CreatedAt)
     VALUES (@userId, @title, @message, @type, 1, SYSUTCDATETIME())`,
    { userId: String(userId), title, message, type }
  );
}

async function mailOnce(userId, type, title, message, email) {
  if (await alreadyMailed(userId, type)) return false;
  const to = email || (await emailForUserId(userId));
  if (!to) return false;
  await sendMail({
    to,
    subject: title,
    text: message,
    html: `<p>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>`,
  });
  await markMailed(userId, title, message, type);
  return true;
}

export async function runExpiryEmails() {
  if (!isMailConfigured()) return { skipped: true };
  const site = frontendUrl();
  let sent = 0;

  const ads = await query(`
    SELECT
      a.Id, a.VehicleId, a.AdvertiserId, a.EndDate, a.Title,
      b.Name AS BrandName, m.Name AS ModelName
    FROM Advertisements a
    LEFT JOIN Vehicles v ON v.Id = a.VehicleId
    LEFT JOIN Brands b ON b.Id = v.BrandId
    LEFT JOIN VehicleModels m ON m.Id = v.ModelId
    WHERE a.Status = 2
      AND a.EndDate > DATEADD(hour, -6, SYSUTCDATETIME())
      AND a.EndDate <= DATEADD(hour, 24, SYSUTCDATETIME())
  `);

  const now = Date.now();
  for (const ad of ads) {
    const id = ad.Id ?? ad.id;
    const owner = ad.AdvertiserId ?? ad.advertiserId;
    const end = new Date(ad.EndDate ?? ad.endDate).getTime();
    const titleCar = [ad.BrandName || ad.brandName, ad.ModelName || ad.modelName]
      .filter(Boolean)
      .join(" ") || ad.Title || ad.title || "shpallja";
    const vehicleId = ad.VehicleId ?? ad.vehicleId;
    const link = vehicleId
      ? `${site}/vehicles/${vehicleId}`
      : `${site}/my-vehicles`;

    if (end > now) {
      const type = `email:ad-expiring:${id}`;
      const title = "Promovimi i shpalljes skadon së shpejti";
      const message = `${titleCar} nuk do të jetë më e promovuar pas 24 orëve. Rifreskoje këtu: ${link}`;
      try {
        if (await mailOnce(owner, type, title, message)) sent += 1;
      } catch (err) {
        console.error("ad-expiring email:", err.message || err);
      }
    } else {
      const type = `email:ad-expired:${id}`;
      const title = "Promovimi i shpalljes skadoi";
      const message = `Promovimi për ${titleCar} ka skaduar. Mund ta promovosh sërish: ${site}/advertise/select-vehicle`;
      try {
        if (await mailOnce(owner, type, title, message)) sent += 1;
      } catch (err) {
        console.error("ad-expired email:", err.message || err);
      }
    }
  }

  const listings = await query(`
    SELECT
      v.Id, v.OwnerId, b.Name AS BrandName, m.Name AS ModelName
    FROM Vehicles v
    LEFT JOIN Brands b ON b.Id = v.BrandId
    LEFT JOIN VehicleModels m ON m.Id = v.ModelId
    WHERE v.CreatedDate <= DATEADD(day, -30, SYSUTCDATETIME())
      AND v.CreatedDate > DATEADD(day, -32, SYSUTCDATETIME())
  `);

  for (const row of listings) {
    const id = row.Id ?? row.id;
    const owner = row.OwnerId ?? row.ownerId;
    const titleCar = [row.BrandName || row.brandName, row.ModelName || row.modelName]
      .filter(Boolean)
      .join(" ") || `shpallja #${id}`;
    const type = `email:listing-30d:${id}`;
    const title = "Shpallja jote është 30 ditë e vjetër";
    const message = `${titleCar} është online prej 30 ditësh. Kontrolloje ose përditësoje: ${site}/vehicles/${id}`;
    try {
      if (await mailOnce(owner, type, title, message)) sent += 1;
    } catch (err) {
      console.error("listing-30d email:", err.message || err);
    }
  }

  return { sent };
}

export function startExpiryMailJob() {
  if (!isMailConfigured()) {
    console.log("Email notices off (set RESEND_API_KEY or SMTP_HOST).");
    return;
  }
  const tick = () => {
    runExpiryEmails().catch((err) =>
      console.error("expiry emails:", err.message || err)
    );
  };
  setTimeout(tick, 20_000);
  setInterval(tick, 30 * 60 * 1000);
}
