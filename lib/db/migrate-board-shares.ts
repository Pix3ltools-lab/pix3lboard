/**
 * Migration: Add board_shares table for board sharing
 * Run with: export $(cat .env.local | xargs) && npx tsx lib/db/migrate-board-shares.ts
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
  console.log('Creating board_shares table...\n');

  try {
    // Create board_shares table
    // role: 'owner' (full access) or 'viewer' (read-only)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS board_shares (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        created_at TEXT NOT NULL,
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(board_id, user_id)
      )
    `);
    console.log('  Created: board_shares table\n');

    // Create indexes for faster lookups
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_board_shares_board_id ON board_shares(board_id)
    `);
    console.log('  Created: index on board_id\n');

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_board_shares_user_id ON board_shares(user_id)
    `);
    console.log('  Created: index on user_id\n');

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
