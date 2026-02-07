/**
 * Migration: Add wiki_page_id column to cards table
 * Run with: npx tsx lib/db/migrate-wiki-page-id.ts
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
  console.log('Adding wiki_page_id column to cards table...\n');

  try {
    // Check if column already exists
    const tableInfo = await client.execute('PRAGMA table_info(cards)');
    const columns = tableInfo.rows.map(row => row.name);

    if (columns.includes('wiki_page_id')) {
      console.log('  Skipped: wiki_page_id column already exists\n');
    } else {
      await client.execute('ALTER TABLE cards ADD COLUMN wiki_page_id TEXT DEFAULT NULL');
      console.log('  Added: wiki_page_id column\n');
    }

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
