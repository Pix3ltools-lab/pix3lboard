import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyToken, getUserById } from '@/lib/auth/auth';
import { getTursoClient } from '@/lib/db/turso';
import type { InStatement } from '@libsql/client';
import logger from '../../../../lib/logger'

// FK-safe insert order — parents before children
const TABLE_ORDER = [
  'users',
  'rate_limits',
  'workspaces',
  'boards',
  'board_shares',
  'lists',
  'cards',
  'comments',
  'attachments',
  'activity_log',
  'notifications',
];

// Validates that a name is a safe SQL identifier (alphanumeric + underscore, no spaces or special chars)
function isValidIdentifier(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

const backupSchema = z.record(z.string(), z.array(z.record(z.string(), z.unknown())));

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const currentUser = await getUserById(payload.userId);
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = backupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid backup format', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const backup = parsed.data;

    // Validate _meta exists
    if (!backup._meta || backup._meta.length === 0) {
      return NextResponse.json({ error: 'Missing _meta in backup' }, { status: 400 });
    }

    // Determine which tables to restore (from backup, in FK order only — no extra tables)
    const tablesToRestore = TABLE_ORDER.filter(t => backup[t] && backup[t].length > 0);

    const statements: InStatement[] = [];

    // Delete in reverse FK order (children first)
    const deleteOrder = [...tablesToRestore].reverse();
    for (const table of deleteOrder) {
      // table names come from TABLE_ORDER (hardcoded), safe to interpolate
      statements.push({ sql: `DELETE FROM ${table}`, args: [] });
    }

    // Insert in FK order (parents first)
    const counts: Record<string, number> = {};
    for (const table of tablesToRestore) {
      const rows = backup[table];
      if (!rows || rows.length === 0) continue;

      counts[table] = rows.length;

      for (const row of rows) {
        const columns = Object.keys(row);

        // Validate every column name before interpolating into SQL
        const invalidColumns = columns.filter(c => !isValidIdentifier(c));
        if (invalidColumns.length > 0) {
          return NextResponse.json(
            { error: `Invalid column names in table "${table}": ${invalidColumns.join(', ')}` },
            { status: 400 }
          );
        }

        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map(c => {
          const v = row[c];
          // Convert undefined to null for SQLite
          return v === undefined ? null : v;
        });

        statements.push({
          sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
          args: values as (string | number | null | boolean | bigint | ArrayBuffer)[],
        });
      }
    }

    const db = getTursoClient();
    await db.batch(statements);

    return NextResponse.json({
      success: true,
      counts,
      totalStatements: statements.length,
    });
  } catch (err) {
    logger.error({ err: err }, 'Restore error');
    return NextResponse.json(
      { error: 'Restore failed', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
