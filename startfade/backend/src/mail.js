import { query, queryOne } from "./db.js";
import { getSiteSettings, resolveMailFrom } from "./siteSettings.js";
import {
  alreadyMailedWhileAway,
  clearMailedWhileAway,
  isChatOpen,
  markMailedWhileAway,
} from "./presence.js";

function frontendUrl() {
  return String(process.env.FRONTEND_URL || "https://www.autosmarket.me").replace(
    /\/$/,
    ""
  );
}

function smtpPass() {
  return String(process.env.SMTP_PASS || "").replace(/\s/g, "");
}

function smtpHost() {
  const raw = String(process.env.SMTP_HOST || "").trim();
  if (!raw || raw === "..." || /^smtp\.example/i.test(raw)) {
    return smtpPass() ? "smtp.gmail.com" : "";
  }
  return raw;
}

export function isMailConfigured() {
  return Boolean(
    String(process.env.RESEND_API_KEY || "").trim() || smtpHost() || smtpPass()
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
  const host = smtpHost();
  if (!host && !smtpPass()) return false;
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = smtpPass();
  const transporter = nodemailer.createTransport({
    host: host || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function chatEmailHtml({ who, preview, link }) {
  const safePreview = escapeHtml(preview).replace(/\n/g, "<br>");
  return `<!DOCTYPE html>
<html lang="sq">
<body style="margin:0;padding:0;background:#f4f6f8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#0f172a;padding:26px 28px 22px;">
              <p style="margin:0;font-family:Georgia,serif;font-size:22px;letter-spacing:-0.03em;color:#f8fafc;">AutoMarket</p>
              <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#f59e0b;">Inbox</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;line-height:1.15;letter-spacing:-0.03em;color:#0f172a;">Dikush të ka shkruar</h1>
              <p style="margin:14px 0 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#64748b;">${escapeHtml(who)} të dërgoi një mesazh ndërsa inbox ishte i mbyllur.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;">
                <tr>
                  <td style="background:#f8fafc;border-radius:16px;padding:16px 18px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#0f172a;">${safePreview}</td>
                </tr>
              </table>
              <p style="margin:22px 0 0;">
                <a href="${escapeHtml(link)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;font-weight:700;padding:12px 18px;border-radius:999px;">Hape bisedën</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function notifyNewMessage({
  receiverId,
  senderName,
  preview,
  conversationId,
}) {
  if (!isMailConfigured()) {
    console.warn("Email i chatit u kapërcye: SMTP/Resend mungon në .env.");
    return;
  }
  if (isChatOpen(receiverId) || alreadyMailedWhileAway(receiverId)) return;
  markMailedWhileAway(receiverId);
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
  if (!recipients.length) {
    clearMailedWhileAway(receiverId);
    console.warn("Email i chatit u kapërcye: marrësi nuk ka adresë.");
    return;
  }
  const who = String(senderName || "Dikush").trim() || "Dikush";
  const url = `${frontendUrl()}/messages/${conversationId}`;
  const subject = "Dikush të ka shkruar në AutoMarket";
  const text = `Dikush të ka shkruar\n\n${who} të dërgoi një mesazh ndërsa inbox ishte i mbyllur.\n\n${preview}\n\nHape bisedën: ${url}`;
  const html = chatEmailHtml({ who, preview, link: url });
  try {
    for (const to of recipients) {
      await sendMail({
        to,
        subject,
        text,
        html,
        from: await resolveMailFrom(),
      });
    }
  } catch (err) {
    clearMailedWhileAway(receiverId);
    throw err;
  }
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
