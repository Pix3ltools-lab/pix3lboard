/**
 * Database Restore Script
 * Run with: npx tsx lib/db/restore.ts <backup-file>
 * Example: npx tsx lib/db/restore.ts backups/backup-2026-01-23T11-45-48.sql
 */

import { createClient } from '@libsql/client';
import * as fs from 'fs';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  process.exit(1);
}

const backupFile = process.argv[2];

if (!backupFile) {
  console.error('Usage: npx tsx lib/db/restore.ts <backup-file>');
  console.error('Example: npx tsx lib/db/restore.ts backups/backup-2026-01-23T11-45-48.sql');
  process.exit(1);
}

if (!fs.existsSync(backupFile)) {
  console.error(`Backup file not found: ${backupFile}`);
  process.exit(1);
}

const client = createClient({ url, authToken });

async function restore() {
  console.log(`Restoring database from: ${backupFile}\n`);
  console.log(`Target database: ${url}\n`);

  // Read backup file
  const sqlContent = fs.readFileSync(backupFile, 'utf-8');

  // Split by semicolon, handling multi-line statements
  const statements = sqlContent
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements\n`);

  let executed = 0;
  let errors = 0;

  for (const statement of statements) {
    try {
      await client.execute(statement);
      executed++;

      // Log progress for significant statements
      if (statement.startsWith('DROP TABLE')) {
        const match = statement.match(/DROP TABLE IF EXISTS (\w+)/i);
        if (match) console.log(`  Dropped: ${match[1]}`);
      } else if (statement.startsWith('CREATE TABLE')) {
        const match = statement.match(/CREATE TABLE (\w+)/i);
        if (match) console.log(`  Created: ${match[1]}`);
      } else if (statement.startsWith('INSERT INTO')) {
        // Don't log every insert, just count them
      }
    } catch (error) {
      errors++;
      console.error(`Error executing: ${statement.substring(0, 60)}...`);
      console.error(error);
    }
  }

  console.log(`\nRestore complete!`);
  console.log(`  Executed: ${executed} statements`);
  if (errors > 0) {
    console.log(`  Errors: ${errors}`);
  }

  // Verify tables
  console.log('\nVerifying tables...');
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' ORDER BY name"
  );

  for (const table of tables.rows) {
    const count = await client.execute(`SELECT COUNT(*) as count FROM ${table.name}`);
    console.log(`  ${table.name}: ${count.rows[0].count} rows`);
  }
}

restore().catch(console.error);
