/**
 * Migration: Add color column to lists table
 * Run with: npx tsx lib/db/migrate-list-color.ts
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
  console.log('Adding color column to lists table...\n');

  try {
    await client.execute(`
      ALTER TABLE lists ADD COLUMN color TEXT
    `);
    console.log('  Added: color column');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('duplicate column')) {
      console.log('  Skipped: color column already exists');
    } else {
      throw error;
    }
  }

  console.log('\nMigration complete!');
}

migrate().catch(console.error);
