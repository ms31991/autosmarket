import { query, queryOne } from "./db.js";
import { camel } from "./camel.js";

const DEFAULTS = {
  legalName: "Automarket",
  legalAddress: "",
  supportEmail: "support@autosmarket.me",
  privacyEmail: "privacy@autosmarket.me",
};

function rowToSettings(row) {
  if (!row) return { ...DEFAULTS };
  const mapped = camel(row);
  return {
    legalName: mapped.legalName || DEFAULTS.legalName,
    legalAddress: mapped.legalAddress || "",
    supportEmail: mapped.supportEmail || DEFAULTS.supportEmail,
    privacyEmail: mapped.privacyEmail || DEFAULTS.privacyEmail,
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
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_SiteSettings_UpdatedAt DEFAULT SYSUTCDATETIME()
      );
    END
  `);
  const existing = await queryOne(`SELECT Id FROM dbo.SiteSettings WHERE Id = 1`);
  if (!existing) {
    await query(
      `INSERT INTO dbo.SiteSettings (Id, LegalName, LegalAddress, SupportEmail, PrivacyEmail)
       VALUES (1, @legalName, @legalAddress, @supportEmail, @privacyEmail)`,
      {
        legalName: DEFAULTS.legalName,
        legalAddress: DEFAULTS.legalAddress,
        supportEmail: DEFAULTS.supportEmail,
        privacyEmail: DEFAULTS.privacyEmail,
      }
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
  if (!legalName) throw new Error("Legal name is required.");
  if (!supportEmail.includes("@") || !privacyEmail.includes("@")) {
    throw new Error("Enter valid support and privacy emails.");
  }
  await query(
    `UPDATE dbo.SiteSettings
     SET LegalName = @legalName,
         LegalAddress = @legalAddress,
         SupportEmail = @supportEmail,
         PrivacyEmail = @privacyEmail,
         UpdatedAt = SYSUTCDATETIME()
     WHERE Id = 1`,
    { legalName, legalAddress, supportEmail, privacyEmail }
  );
  return getSiteSettings();
}
