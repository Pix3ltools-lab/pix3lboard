import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const STORAGE_DIR = process.env.LOCAL_STORAGE_PATH || '/data/blob-storage';

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.md': 'text/markdown',
  '.zip': 'application/zip',
};

// GET /api/storage/[...path] - Serve files from local storage (Docker only)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  if (process.env.STORAGE_PROVIDER !== 'local') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { path: segments } = await params;
  const filePath = path.join(STORAGE_DIR, ...segments);

  // Prevent directory traversal
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(STORAGE_DIR))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const file = await fs.readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(file, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
