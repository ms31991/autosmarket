import { query } from "./db.js";

export async function ensureListingReportsTable() {
  await query(`
    IF OBJECT_ID(N'dbo.ListingReports', N'U') IS NULL
    BEGIN
      CREATE TABLE dbo.ListingReports (
        Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        VehicleId INT NOT NULL,
        ReporterUserId NVARCHAR(128) NULL,
        Reason NVARCHAR(80) NOT NULL,
        Details NVARCHAR(1000) NULL,
        Status INT NOT NULL CONSTRAINT DF_ListingReports_Status DEFAULT 0,
        CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ListingReports_CreatedAt DEFAULT SYSUTCDATETIME()
      );
      CREATE INDEX IX_ListingReports_Vehicle ON dbo.ListingReports (VehicleId, Status);
    END
  `);
}
