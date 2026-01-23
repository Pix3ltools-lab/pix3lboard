/**
 * Migration: Add rate_limits table for persistent rate limiting
 * Run with: export $(cat .env.local | xargs) && npx tsx lib/db/migrate-rate-limits.ts
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
  console.log('Creating rate_limits table...\n');

  try {
    // Create rate_limits table for persistent rate limiting
    await client.execute(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        attempts INTEGER DEFAULT 1,
        window_start TEXT NOT NULL,
        locked_until TEXT,
        created_at TEXT NOT NULL,
        UNIQUE(identifier, endpoint)
      )
    `);
    console.log('  Created: rate_limits table\n');

    // Create indexes for faster lookups
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier)
    `);
    console.log('  Created: index on identifier\n');

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_rate_limits_locked ON rate_limits(locked_until)
    `);
    console.log('  Created: index on locked_until\n');

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
