import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

let pool;

function sqlAuthConfig() {
  return {
    server: process.env.SQL_SERVER,
    database: process.env.SQL_DATABASE,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  };
}

export async function getPool() {
  if (pool) return pool;

  if (process.env.SQL_USER && process.env.SQL_PASSWORD) {
    pool = await sql.connect(sqlAuthConfig());
    return pool;
  }

  const nativeSql = (await import("mssql/msnodesqlv8.js")).default;
  const driver = process.env.SQL_ODBC_DRIVER || "ODBC Driver 17 for SQL Server";
  const connectionString =
    `Driver={${driver}};Server=${process.env.SQL_SERVER};Database=${process.env.SQL_DATABASE};` +
    `Trusted_Connection=Yes;TrustServerCertificate=Yes;`;
  pool = await nativeSql.connect({
    connectionString,
    options: {
      trustedConnection: true,
      trustServerCertificate: true,
    },
  });
  return pool;
}

function bindValue(value) {
  if (value === undefined) return null;
  if (
    value &&
    typeof value === "object" &&
    !(value instanceof Date) &&
    !Buffer.isBuffer(value) &&
    typeof value.toString === "function"
  ) {
    const name = value.constructor?.name || "";
    if (name === "UniqueIdentifier" || name === "Guid") {
      return String(value);
    }
  }
  return value;
}

export async function query(text, params = {}) {
  const db = await getPool();
  const request = db.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, bindValue(value));
  }
  const result = await request.query(text);
  return result.recordset || [];
}

export async function queryOne(text, params = {}) {
  const rows = await query(text, params);
  return rows[0] || null;
}

export { sql };
