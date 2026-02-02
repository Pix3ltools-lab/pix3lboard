/**
 * Migration: Add notifications table
 * Run with: npx tsx lib/db/migrations/add-notifications.ts
 */

import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  process.exit(1);
}

const client = createClient({ url, authToken });

const migration = `
-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
`;

async function migrate() {
  console.log('Running migration: add-notifications\n');

  const statements = migration
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await client.execute(statement);
      const match = statement.match(/(?:TABLE|INDEX)(?:\s+IF\s+NOT\s+EXISTS)?\s+(\w+)/i);
      if (match) {
        console.log(`  ✓ Created: ${match[1]}`);
      }
    } catch (error) {
      console.error(`Error executing: ${statement.substring(0, 50)}...`);
      console.error(error);
      process.exit(1);
    }
  }

  console.log('\n✓ Migration complete!');
}

migrate().catch(console.error);
