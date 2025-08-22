import sql, { type config as SqlConfig, type ConnectionPool } from "mssql";

// Cuenta SQL
const config: SqlConfig = {
  server: "localhost",
  port: 1433,
  database: "ClubMaster",
  user: "clubadmin",
  password: "Spyltd12!",
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: ConnectionPool | null = null;

/** Obtiene (o crea) un pool de conexiones a SQL Server */
export async function getConnection(): Promise<ConnectionPool> {
  if (pool) return pool;

  pool = await sql.connect(config);
  console.log("✅ Conectado a ClubMaster SQL Server exitosamente");
  return pool;
}

/** Cierra el pool (útil en tests o shut‑down) */
export async function closeConnection(): Promise<void> {
  if (!pool) return;
  await pool.close();
  pool = null;
  console.log("🔌 Conexión a SQL Server cerrada");
}

/** Helper genérico para consultas simples (sin parámetros) */
export async function executeQuery(query: string) {
  const conn = await getConnection();
  return conn.request().query(query);
}

export { sql };
