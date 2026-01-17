/**
 * Migration: Add is_public column to boards table
 * Run with: npx tsx lib/db/migrate-public-boards.ts
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
  console.log('Adding is_public column to boards table...\n');

  try {
    await client.execute(`
      ALTER TABLE boards ADD COLUMN is_public INTEGER DEFAULT 0
    `);
    console.log('  Added: is_public column');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('duplicate column')) {
      console.log('  Skipped: is_public column already exists');
    } else {
      throw error;
    }
  }

  console.log('\nMigration complete!');
}

migrate().catch(console.error);
