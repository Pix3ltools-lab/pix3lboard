/**
 * Migration: Add requirements traceability tables
 * Run with: npx tsx lib/db/migrations/add-traceability.ts
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
-- Requirements table
CREATE TABLE IF NOT EXISTS requirements (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (board_id, code)
);

CREATE INDEX IF NOT EXISTS idx_requirements_board ON requirements(board_id);

-- Requirement <-> card link (many-to-many)
CREATE TABLE IF NOT EXISTS requirement_cards (
  requirement_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (requirement_id, card_id)
);

-- Test cases table
CREATE TABLE IF NOT EXISTS test_cases (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'manual',
  requirement_id TEXT REFERENCES requirements(id) ON DELETE SET NULL,
  card_id TEXT REFERENCES cards(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (board_id, code)
);

CREATE INDEX IF NOT EXISTS idx_test_cases_board ON test_cases(board_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_requirement ON test_cases(requirement_id);

-- Test runs table
CREATE TABLE IF NOT EXISTS test_runs (
  id TEXT PRIMARY KEY,
  test_case_id TEXT NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  result TEXT NOT NULL,
  notes TEXT,
  executed_by TEXT NOT NULL REFERENCES users(id),
  executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_test_runs_test_case ON test_runs(test_case_id)
`;

async function migrate() {
  console.log('Running migration: add-traceability\n');

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
