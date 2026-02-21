import { NextRequest, NextResponse } from 'next/server';
import { list } from '@/lib/storage/blob';
import { verifyToken, getUserById } from '@/lib/auth/auth';
import { queryOne } from '@/lib/db/turso';
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

// GET /api/admin/storage-info - Return DB size and blob storage totals
export async function GET(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // DB size via PRAGMA
    const pageCountRow = await queryOne<{ page_count: number }>('PRAGMA page_count');
    const pageSizeRow = await queryOne<{ page_size: number }>('PRAGMA page_size');

    const pageCount = pageCountRow?.page_count ?? 0;
    const pageSize = pageSizeRow?.page_size ?? 4096;
    const dbBytes = pageCount * pageSize;

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
        sizeMB: (dbBytes / 1024 / 1024).toFixed(2),
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
