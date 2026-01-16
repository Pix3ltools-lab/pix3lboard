/**
 * Migration: Add is_admin column to users table
 * Run with: npx tsx lib/db/migrate-admin.ts
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
  console.log('Running migration: add is_admin column...\n');

  try {
    // Add is_admin column (defaults to false/0)
    await client.execute(`
      ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0
    `);
    console.log('  Added is_admin column to users table');
  } catch (error: unknown) {
    // Column might already exist
    if (error instanceof Error && error.message.includes('duplicate column')) {
      console.log('  is_admin column already exists, skipping');
    } else {
      throw error;
    }
  }

  console.log('\nMigration complete!');

  // Show current users
  console.log('\nCurrent users:');
  const users = await client.execute('SELECT id, email, is_admin FROM users');
  for (const user of users.rows) {
    console.log(`  ${user.email} - admin: ${user.is_admin ? 'yes' : 'no'}`);
  }

  console.log('\nTo make a user admin, run:');
  console.log("  UPDATE users SET is_admin = 1 WHERE email = 'your@email.com'");
}

migrate().catch(console.error);
