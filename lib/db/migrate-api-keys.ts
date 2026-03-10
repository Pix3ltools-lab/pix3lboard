/**
 * Migration: Add api_keys table
 * Run with: export $(cat .env.local | xargs) && npx tsx lib/db/migrate-api-keys.ts
 */

import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function migrate() {
  console.log('Creating api_keys table...\n');

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        key_hash TEXT NOT NULL UNIQUE,
        key_prefix TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_used_at TEXT
      )
    `);
    console.log('  Created: api_keys table\n');

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)
    `);
    console.log('  Created: index on user_id\n');

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash)
    `);
    console.log('  Created: index on key_hash\n');

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
