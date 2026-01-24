/**
 * Migration: Add responsible_user_id column to cards table
 * Run with: npx tsx lib/db/migrate-responsible-user.ts
 *
 * This migration adds a new column to link the responsible field to a real user.
 * The existing 'responsible' text field is kept for backward compatibility.
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
  console.log('Starting migration: Add responsible_user_id to cards...\n');

  try {
    // Check if column already exists
    const tableInfo = await client.execute("PRAGMA table_info(cards)");
    const columnExists = tableInfo.rows.some(row => row.name === 'responsible_user_id');

    if (columnExists) {
      console.log('Column responsible_user_id already exists. Migration skipped.');
      return;
    }

    // Add the new column
    await client.execute(`
      ALTER TABLE cards ADD COLUMN responsible_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
    `);

    console.log('Added column: responsible_user_id');

    // Create index for better query performance
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_cards_responsible_user_id ON cards(responsible_user_id)
    `);

    console.log('Created index: idx_cards_responsible_user_id');

    console.log('\nMigration complete!');
    console.log('\nNote: Existing cards with text in the "responsible" field will continue to work.');
    console.log('New assignments will use responsible_user_id to link to real users.');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
