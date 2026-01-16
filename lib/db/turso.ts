import { createClient, type InStatement } from '@libsql/client';

// Singleton client instance
let client: ReturnType<typeof createClient> | null = null;

export function getTursoClient() {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    throw new Error('Missing Turso environment variables: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN');
  }

  client = createClient({
    url,
    authToken,
  });

  return client;
}

// Helper for running queries with named parameters
export async function query<T = unknown>(
  sql: string,
  args: Record<string, unknown> = {}
): Promise<T[]> {
  const db = getTursoClient();
  const result = await db.execute({ sql, args } as InStatement);
  return result.rows as T[];
}

// Helper for running single-result queries
export async function queryOne<T = unknown>(
  sql: string,
  args: Record<string, unknown> = {}
): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] || null;
}

// Helper for insert/update/delete operations
export async function execute(
  sql: string,
  args: Record<string, unknown> = {}
): Promise<{ rowsAffected: number; lastInsertRowid: bigint | undefined }> {
  const db = getTursoClient();
  const result = await db.execute({ sql, args } as InStatement);
  return {
    rowsAffected: result.rowsAffected,
    lastInsertRowid: result.lastInsertRowid,
  };
}
