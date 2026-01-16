/**
 * Set a user as admin
 * Run with: npx tsx lib/db/set-admin.ts email@example.com
 */

import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
const email = process.argv[2];

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  process.exit(1);
}

if (!email) {
  console.error('Usage: npx tsx lib/db/set-admin.ts email@example.com');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function setAdmin() {
  const result = await client.execute({
    sql: 'UPDATE users SET is_admin = 1 WHERE email = ?',
    args: [email.toLowerCase()],
  });

  if (result.rowsAffected === 0) {
    console.error(`User ${email} not found`);
    process.exit(1);
  }

  console.log(`${email} is now admin`);
}

setAdmin().catch(console.error);
