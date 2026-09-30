import { query, queryOne } from "./db.js";
import { camel } from "./camel.js";

const DEFAULTS = {
  legalName: "Automarket",
  legalAddress: "",
  supportEmail: "support@autosmarket.me",
  privacyEmail: "privacy@autosmarket.me",
  mailFrom: "",
  messageNotifyEmail: "combackseassion@gmail.com",
};

function emailInFrom(value) {
  const raw = String(value || "").trim();
  const angled = raw.match(/<([^>]+)>/);
  const addr = (angled ? angled[1] : raw).trim();
  return addr.includes("@") ? addr : "";
}

function rowToSettings(row) {
  if (!row) return { ...DEFAULTS };
  const mapped = camel(row);
  return {
    legalName: mapped.legalName || DEFAULTS.legalName,
    legalAddress: mapped.legalAddress || "",
    supportEmail: mapped.supportEmail || DEFAULTS.supportEmail,
    privacyEmail: mapped.privacyEmail || DEFAULTS.privacyEmail,
    mailFrom: String(mapped.mailFrom || "").trim(),
    messageNotifyEmail:
      String(mapped.messageNotifyEmail || "").trim() || DEFAULTS.messageNotifyEmail,
    updatedAt: mapped.updatedAt || null,
  };
}

export async function ensureSiteSettingsTable() {
  await query(`
    IF OBJECT_ID(N'dbo.SiteSettings', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.SiteSettings (
        Id INT NOT NULL PRIMARY KEY,
        LegalName NVARCHAR(120) NOT NULL,
        LegalAddress NVARCHAR(300) NULL,
        SupportEmail NVARCHAR(200) NOT NULL,
        PrivacyEmail NVARCHAR(200) NOT NULL,
        MailFrom NVARCHAR(200) NULL,
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_SiteSettings_UpdatedAt DEFAULT SYSUTCDATETIME()
      );
    END
  `);
  await query(`
    IF COL_LENGTH(N'dbo.SiteSettings', N'MailFrom') IS NULL
      ALTER TABLE dbo.SiteSettings ADD MailFrom NVARCHAR(200) NULL;
  `);
  await query(`
    IF COL_LENGTH(N'dbo.SiteSettings', N'MessageNotifyEmail') IS NULL
      ALTER TABLE dbo.SiteSettings ADD MessageNotifyEmail NVARCHAR(200) NULL;
  `);
  const existing = await queryOne(`SELECT Id FROM dbo.SiteSettings WHERE Id = 1`);
  if (!existing) {
    await query(
      `INSERT INTO dbo.SiteSettings (Id, LegalName, LegalAddress, SupportEmail, PrivacyEmail, MessageNotifyEmail)
       VALUES (1, @legalName, @legalAddress, @supportEmail, @privacyEmail, @messageNotifyEmail)`,
      {
        legalName: DEFAULTS.legalName,
        legalAddress: DEFAULTS.legalAddress,
        supportEmail: DEFAULTS.supportEmail,
        privacyEmail: DEFAULTS.privacyEmail,
        messageNotifyEmail: DEFAULTS.messageNotifyEmail,
      }
    );
  } else {
    await query(
      `UPDATE dbo.SiteSettings
       SET MessageNotifyEmail = @messageNotifyEmail
       WHERE Id = 1
         AND (MessageNotifyEmail IS NULL OR LTRIM(RTRIM(MessageNotifyEmail)) = '')`,
      { messageNotifyEmail: DEFAULTS.messageNotifyEmail }
    );
  }
}

export async function getSiteSettings() {
  const row = await queryOne(`SELECT * FROM dbo.SiteSettings WHERE Id = 1`);
  return rowToSettings(row);
}

export async function updateSiteSettings(input) {
  const current = await getSiteSettings();
  const legalName = String(input.legalName ?? current.legalName).trim().slice(0, 120);
  const legalAddress = String(input.legalAddress ?? current.legalAddress).trim().slice(0, 300);
  const supportEmail = String(input.supportEmail ?? current.supportEmail).trim().slice(0, 200);
  const privacyEmail = String(input.privacyEmail ?? current.privacyEmail).trim().slice(0, 200);
  const mailFrom = String(input.mailFrom ?? current.mailFrom).trim().slice(0, 200);
  const messageNotifyEmail = String(
    input.messageNotifyEmail ?? current.messageNotifyEmail
  )
    .trim()
    .slice(0, 200);
  if (!legalName) throw new Error("Legal name is required.");
  if (!supportEmail.includes("@") || !privacyEmail.includes("@")) {
    throw new Error("Enter valid support and privacy emails.");
  }
  if (mailFrom && !emailInFrom(mailFrom)) {
    throw new Error("Mail from must be an email, e.g. AutoMarket <support@autosmarket.me>.");
  }
  if (messageNotifyEmail && !messageNotifyEmail.includes("@")) {
    throw new Error("Message notify email must be a valid address.");
  }
  await query(
    `UPDATE dbo.SiteSettings
     SET LegalName = @legalName,
         LegalAddress = @legalAddress,
         SupportEmail = @supportEmail,
         PrivacyEmail = @privacyEmail,
         MailFrom = @mailFrom,
         MessageNotifyEmail = @messageNotifyEmail,
         UpdatedAt = SYSUTCDATETIME()
     WHERE Id = 1`,
    {
      legalName,
      legalAddress,
      supportEmail,
      privacyEmail,
      mailFrom,
      messageNotifyEmail,
    }
  );
  return getSiteSettings();
}

export async function resolveMailFrom() {
  const settings = await getSiteSettings();
  const custom = String(settings.mailFrom || "").trim();
  if (emailInFrom(custom)) {
    return custom.includes("<")
      ? custom
      : `${settings.legalName || "AutoMarket"} <${custom}>`;
  }
  const envFrom = String(process.env.MAIL_FROM || "").trim();
  if (emailInFrom(envFrom)) return envFrom;
  const support = String(settings.supportEmail || DEFAULTS.supportEmail).trim();
  return `AutoMarket <${support}>`;
}
