/**
 * Database Backup Script
 * Run with: npx tsx lib/db/backup.ts
 */

import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = path.join(process.cwd(), 'backups');
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

  // Create backups directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('Starting database backup...\n');

  let sqlContent = `-- Database Backup\n-- Generated: ${new Date().toISOString()}\n-- Database: ${url}\n\n`;

  // Get all tables
  const tables = await client.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' ORDER BY name"
  );

  console.log(`Found ${tables.rows.length} tables\n`);

  // Export schema and data for each table
  for (const table of tables.rows) {
    const tableName = table.name as string;
    const createSql = table.sql as string;

    console.log(`Exporting: ${tableName}`);

    // Add DROP and CREATE statements
    sqlContent += `-- Table: ${tableName}\n`;
    sqlContent += `DROP TABLE IF EXISTS ${tableName};\n`;
    sqlContent += `${createSql};\n\n`;

    // Get all data from the table
    const data = await client.execute(`SELECT * FROM ${tableName}`);

    if (data.rows.length > 0) {
      console.log(`  - ${data.rows.length} rows`);

      // Get column names
      const columns = data.columns;

      for (const row of data.rows) {
        const values = columns.map(col => {
          const value = row[col];
          if (value === null) return 'NULL';
          if (typeof value === 'number') return value.toString();
          // Escape single quotes and wrap in quotes
          return `'${String(value).replace(/'/g, "''")}'`;
        });

        sqlContent += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      sqlContent += '\n';
    } else {
      console.log(`  - 0 rows`);
    }
  }

  // Get indexes
  const indexes = await client.execute(
    "SELECT sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );

  if (indexes.rows.length > 0) {
    sqlContent += `-- Indexes\n`;
    for (const idx of indexes.rows) {
      if (idx.sql) {
        sqlContent += `${idx.sql};\n`;
      }
    }
  }

  // Write backup file
  fs.writeFileSync(backupFile, sqlContent);

  console.log(`\nBackup complete!`);
  console.log(`File: ${backupFile}`);
  console.log(`Size: ${(fs.statSync(backupFile).size / 1024).toFixed(2)} KB`);
}

backup().catch(console.error);
