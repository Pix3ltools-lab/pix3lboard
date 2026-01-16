/**
 * Migration: Add is_approved column to users table
 * Run with: npx tsx lib/db/migrate-approval.ts
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
  console.log('Adding is_approved column to users table...\n');

  try {
    // Add is_approved column (default false for new users, but existing users should be approved)
    await client.execute(`
      ALTER TABLE users ADD COLUMN is_approved INTEGER DEFAULT 0
    `);
    console.log('  Added: is_approved column');

    // Approve all existing users
    await client.execute(`
      UPDATE users SET is_approved = 1
    `);
    console.log('  Updated: All existing users set to approved');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('duplicate column')) {
      console.log('  Skipped: is_approved column already exists');
    } else {
      throw error;
    }
  }

  console.log('\nMigration complete!');
}

migrate().catch(console.error);
