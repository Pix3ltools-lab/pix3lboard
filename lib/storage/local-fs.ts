import fs from 'fs/promises';
import path from 'path';
import type { BlobStorage, BlobItem } from './blob-types';

const STORAGE_DIR = process.env.LOCAL_STORAGE_PATH || '/data/blob-storage';
const PUBLIC_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function toBuffer(body: File | Blob | Buffer | ReadableStream): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Blob) return Buffer.from(await body.arrayBuffer());
  // ReadableStream
  const chunks: Buffer[] = [];
  const reader = (body as ReadableStream).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

async function getAllFiles(dir: string, prefix: string = ''): Promise<BlobItem[]> {
  const items: BlobItem[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        items.push(...(await getAllFiles(fullPath, relativePath)));
      } else {
        const stat = await fs.stat(fullPath);
        items.push({
          url: `${PUBLIC_URL}/api/storage/${relativePath}`,
          pathname: relativePath,
          size: stat.size,
          uploadedAt: stat.mtime,
        });
      }
    }
  } catch {
    // directory doesn't exist yet
  }
  return items;
}

export const localFsStorage: BlobStorage = {
  put: async (pathname, body, _options) => {
    const fullPath = path.join(STORAGE_DIR, pathname);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, await toBuffer(body));
    return { url: `${PUBLIC_URL}/api/storage/${pathname}` };
  },
  del: async (url) => {
    const pathname = url.replace(`${PUBLIC_URL}/api/storage/`, '');
    const fullPath = path.join(STORAGE_DIR, pathname);
    await fs.unlink(fullPath).catch(() => {});
  },
  list: async (options) => {
    const dir = options?.prefix
      ? path.join(STORAGE_DIR, options.prefix)
      : STORAGE_DIR;
    const allFiles = await getAllFiles(dir, options?.prefix || '');
    const limit = options?.limit || 1000;
    const startIndex = options?.cursor ? parseInt(options.cursor, 10) : 0;
    const slice = allFiles.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < allFiles.length;
    return {
      blobs: slice,
      hasMore,
      cursor: hasMore ? String(startIndex + limit) : '',
    };
  },
};
