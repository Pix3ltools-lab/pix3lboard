export interface PutResult {
  url: string;
}

export interface BlobItem {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}

export interface ListResult {
  blobs: BlobItem[];
  hasMore: boolean;
  cursor: string | undefined;
}

export interface BlobStorage {
  put(
    pathname: string,
    body: File | Blob | Buffer | ReadableStream,
    options: { access: string; contentType?: string }
  ): Promise<PutResult>;
  del(url: string): Promise<void>;
  list(options?: { cursor?: string; limit?: number; prefix?: string }): Promise<ListResult>;
}
