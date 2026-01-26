import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById } from '@/lib/auth/auth';
import { query } from '@/lib/db/turso';

export const dynamic = 'force-dynamic';

interface TableInfo {
  name: string;
}

// GET /api/admin/backup - Download database backup as JSON
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const currentUser = await getUserById(payload.userId);
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all tables
    const tables = await query<TableInfo>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream_%' ORDER BY name"
    );

    const backup: Record<string, unknown[]> = {
      _meta: [{
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser.email,
        version: '1.0',
      }],
    };

    // Export data from each table
    for (const table of tables) {
      const tableName = table.name;
      const rows = await query<Record<string, unknown>>(`SELECT * FROM ${tableName}`);
      backup[tableName] = rows;
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `pix3lboard-backup-${timestamp}.json`;

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Failed to create backup' }, { status: 500 });
  }
}
