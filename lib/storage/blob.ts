import type { BlobStorage } from './blob-types';

let storage: BlobStorage;

if (process.env.STORAGE_PROVIDER === 'local') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  storage = require('./local-fs').localFsStorage;
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  storage = require('./vercel-blob').vercelBlobStorage;
}

export const { put, del, list } = storage;
