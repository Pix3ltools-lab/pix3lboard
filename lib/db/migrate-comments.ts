/**
 * Migration: Add comments table
 * Run with: npx tsx lib/db/migrate-comments.ts
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
  console.log('Running migration: add comments table...\n');

  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    console.log('  Created comments table');

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_comments_card_id ON comments(card_id)
    `);
    console.log('  Created index on card_id');

  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('  Table already exists, skipping');
    } else {
      throw error;
    }
  }

  console.log('\nMigration complete!');
}

migrate().catch(console.error);
