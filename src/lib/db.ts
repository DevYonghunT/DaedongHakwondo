import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

function getPool() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL
  });

  return pool;
}

export async function sql<T extends QueryResultRow>(
  text: string,
  values: unknown[] = []
) {
  const currentPool = getPool();
  if (!currentPool) {
    throw new Error("DATABASE_URL is not configured");
  }

  return currentPool.query<T>(text, values);
}
