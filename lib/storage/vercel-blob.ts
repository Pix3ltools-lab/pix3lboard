import { put as blobPut, del as blobDel, list as blobList } from '@vercel/blob';
import type { BlobStorage } from './blob-types';

export const vercelBlobStorage: BlobStorage = {
  put: async (pathname, body, options) => {
    const blob = await blobPut(pathname, body, {
      access: 'public',
      contentType: options.contentType,
    });
    return { url: blob.url };
  },
  del: async (url) => {
    await blobDel(url);
  },
  list: async (options) => {
    const result = await blobList({
      cursor: options?.cursor,
      limit: options?.limit,
      prefix: options?.prefix,
    });
    return {
      blobs: result.blobs.map((b) => ({
        url: b.url,
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt,
      })),
      hasMore: result.hasMore,
      cursor: result.cursor,
    };
  },
};
