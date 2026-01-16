/**
 * Migration: Add checklist column to cards table
 * Run with: npx tsx lib/db/migrate-checklist.ts
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
  console.log('Adding checklist column to cards table...\n');

  try {
    // Add checklist column (TEXT to store JSON array)
    await client.execute(`
      ALTER TABLE cards ADD COLUMN checklist TEXT
    `);
    console.log('  Added: checklist column');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('duplicate column')) {
      console.log('  Skipped: checklist column already exists');
    } else {
      throw error;
    }
  }

  console.log('\nMigration complete!');
}

migrate().catch(console.error);
