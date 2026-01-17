/**
 * Migration: Add attachments table
 * Run with: npx tsx lib/db/migrate-attachments.ts
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
  console.log('Creating attachments table...\n');

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('  Created: attachments table\n');

    // Create index for faster lookups
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_attachments_card_id ON attachments(card_id)
    `);
    console.log('  Created: index on card_id\n');

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
