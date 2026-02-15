import { NextRequest, NextResponse } from 'next/server';
import { list, del } from '@/lib/storage/blob';
import { verifyToken, getUserById } from '@/lib/auth/auth';
import { query } from '@/lib/db/turso';

export const dynamic = 'force-dynamic';

// Only allow admin users to run cleanup
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return false;

  const payload = await verifyToken(token);
  if (!payload?.userId) return false;

  const user = await getUserById(payload.userId);
  return user?.is_admin === true;
}

interface OrphanedBlob {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}

// GET /api/admin/cleanup-blobs - List orphaned blobs (dry run)
// POST /api/admin/cleanup-blobs - Delete orphaned blobs
export async function GET(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const result = await findOrphanedBlobs();

    return NextResponse.json({
      message: 'Dry run - no files deleted',
      orphanedCount: result.orphaned.length,
      orphanedSize: result.orphaned.reduce((sum, b) => sum + b.size, 0),
      orphanedSizeMB: (result.orphaned.reduce((sum, b) => sum + b.size, 0) / (1024 * 1024)).toFixed(2),
      totalBlobsChecked: result.totalBlobs,
      referencedCount: result.referencedCount,
      orphanedBlobs: result.orphaned,
    });
  } catch (error) {
    console.error('Cleanup blobs error:', error);
    return NextResponse.json({ error: 'Failed to analyze blobs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const result = await findOrphanedBlobs();

    if (result.orphaned.length === 0) {
      return NextResponse.json({
        message: 'No orphaned blobs found',
        deletedCount: 0,
      });
    }

    // Delete orphaned blobs
    const deleted: string[] = [];
    const failed: Array<{ url: string; error: string }> = [];

    for (const blob of result.orphaned) {
      try {
        await del(blob.url);
        deleted.push(blob.url);
      } catch (err) {
        failed.push({
          url: blob.url,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: 'Cleanup completed',
      deletedCount: deleted.length,
      failedCount: failed.length,
      freedSpaceMB: (result.orphaned
        .filter(b => deleted.includes(b.url))
        .reduce((sum, b) => sum + b.size, 0) / (1024 * 1024)).toFixed(2),
      deleted,
      failed: failed.length > 0 ? failed : undefined,
    });
  } catch (error) {
    console.error('Cleanup blobs error:', error);
    return NextResponse.json({ error: 'Failed to cleanup blobs' }, { status: 500 });
  }
}

async function findOrphanedBlobs(): Promise<{
  orphaned: OrphanedBlob[];
  totalBlobs: number;
  referencedCount: number;
}> {
  // Get all blob URLs from database
  const attachmentUrls = await query<{ file_url: string }>(
    'SELECT file_url FROM attachments'
  );
  const thumbnailUrls = await query<{ thumbnail: string }>(
    'SELECT thumbnail FROM cards WHERE thumbnail IS NOT NULL'
  );

  const referencedUrls = new Set<string>([
    ...attachmentUrls.map(a => a.file_url),
    ...thumbnailUrls.map(t => t.thumbnail),
  ]);

  // List all blobs from Vercel Blob storage
  const allBlobs: Array<{ url: string; pathname: string; size: number; uploadedAt: Date }> = [];
  let cursor: string | undefined;

  do {
    const response = await list({ cursor, limit: 1000 });
    allBlobs.push(...response.blobs.map(b => ({
      url: b.url,
      pathname: b.pathname,
      size: b.size,
      uploadedAt: b.uploadedAt,
    })));
    cursor = response.hasMore ? response.cursor : undefined;
  } while (cursor);

  // Find orphaned blobs (in storage but not in DB)
  const orphaned = allBlobs.filter(blob => !referencedUrls.has(blob.url));

  return {
    orphaned,
    totalBlobs: allBlobs.length,
    referencedCount: referencedUrls.size,
  };
}
