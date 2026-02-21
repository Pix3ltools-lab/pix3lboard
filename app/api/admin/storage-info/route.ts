import { NextRequest, NextResponse } from 'next/server';
import { list } from '@/lib/storage/blob';
import { verifyToken, getUserById } from '@/lib/auth/auth';
import { query, queryOne } from '@/lib/db/turso';
import logger from '../../../../lib/logger';

export const dynamic = 'force-dynamic';

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;

  const payload = await verifyToken(token);
  if (!payload?.userId) return false;

  const user = await getUserById(payload.userId);
  return user?.is_admin === true;
}

// Tables owned by each app (used to split dbstat results)
const PIX3LBOARD_TABLES = new Set([
  'activity_log', 'attachments', 'board_shares', 'boards', 'cards',
  'comments', 'lists', 'notifications', 'rate_limits', 'users', 'workspaces',
]);
const PIX3LWIKI_TABLES = new Set([
  'wiki_pages', 'wiki_versions', 'wiki_categories', 'pix3lboard_links',
]);

function classifyTable(name: string): 'pix3lboard' | 'pix3lwiki' | 'other' {
  if (PIX3LBOARD_TABLES.has(name)) return 'pix3lboard';
  // FTS shadow tables: cards_fts*, comments_fts*
  if (name.startsWith('cards_fts') || name.startsWith('comments_fts')) return 'pix3lboard';
  if (PIX3LWIKI_TABLES.has(name)) return 'pix3lwiki';
  return 'other';
}

// GET /api/admin/storage-info - Return DB size (split by app) and blob storage totals
export async function GET(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Total DB size via PRAGMA (always available)
    const pageCountRow = await queryOne<{ page_count: number }>('PRAGMA page_count');
    const pageSizeRow = await queryOne<{ page_size: number }>('PRAGMA page_size');

    const pageCount = pageCountRow?.page_count ?? 0;
    const pageSize = pageSizeRow?.page_size ?? 4096;
    const totalDbBytes = pageCount * pageSize;

    // Per-table sizes via dbstat (may not be supported on all backends)
    let pix3lboardBytes: number | null = null;
    let pix3lwikiBytes: number | null = null;

    try {
      const rows = await query<{ name: string; total_bytes: number }>(
        'SELECT name, SUM(pgsize) as total_bytes FROM dbstat GROUP BY name'
      );
      pix3lboardBytes = 0;
      pix3lwikiBytes = 0;
      for (const row of rows) {
        const app = classifyTable(row.name);
        if (app === 'pix3lboard') pix3lboardBytes += Number(row.total_bytes);
        else if (app === 'pix3lwiki') pix3lwikiBytes += Number(row.total_bytes);
      }
    } catch {
      // dbstat not supported — fall back to null (UI shows total only)
    }

    // Blob storage totals
    let blobCount = 0;
    let blobTotalBytes = 0;
    let cursor: string | undefined;

    do {
      const response = await list({ cursor, limit: 1000 });
      for (const blob of response.blobs) {
        blobCount++;
        blobTotalBytes += blob.size;
      }
      cursor = response.hasMore ? response.cursor : undefined;
    } while (cursor);

    return NextResponse.json({
      db: {
        pageCount,
        pageSize,
        totalSizeMB: (totalDbBytes / 1024 / 1024).toFixed(2),
        pix3lboardSizeMB: pix3lboardBytes !== null
          ? (pix3lboardBytes / 1024 / 1024).toFixed(2)
          : null,
        pix3lwikiSizeMB: pix3lwikiBytes !== null
          ? (pix3lwikiBytes / 1024 / 1024).toFixed(2)
          : null,
      },
      blobs: {
        count: blobCount,
        totalSize: blobTotalBytes,
        totalSizeMB: (blobTotalBytes / 1024 / 1024).toFixed(2),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Storage info error');
    return NextResponse.json({ error: 'Failed to get storage info' }, { status: 500 });
  }
}
