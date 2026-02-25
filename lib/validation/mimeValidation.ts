/**
 * Server-side MIME type validation using magic bytes (file signatures).
 *
 * The browser-supplied file.type can be spoofed (e.g. a .php file with
 * Content-Type: image/jpeg). Reading the first bytes of the actual file
 * content and comparing against known signatures prevents this bypass.
 *
 * Only the first 12 bytes are read, so there is no performance impact
 * even for large files (use file.slice(0, 12).arrayBuffer()).
 *
 * Text formats (text/plain, text/csv, text/markdown) have no reliable
 * magic bytes and are accepted based on declared MIME type alone — they
 * are low risk since they are not executable on any platform.
 */

// Allowed MIME types for card attachments
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Images (SVG excluded: XSS risk when served inline)
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Text
  'text/plain',
  'text/csv',
  'text/markdown',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
] as const;

// Allowed MIME types for card thumbnails
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

type Signature = { offset: number; bytes: readonly number[] };

/**
 * Magic byte signatures per MIME type.
 * null = text type, no magic bytes, skip check.
 * Multiple entries = alternative signatures (e.g. GIF87a vs GIF89a).
 */
const SIGNATURES: Record<string, Signature[] | null> = {
  // Images
  'image/jpeg': [
    { offset: 0, bytes: [0xFF, 0xD8, 0xFF] },
  ],
  'image/png': [
    { offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  ],
  'image/gif': [
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
  // WebP: bytes 0-3 = "RIFF", bytes 8-11 = "WEBP" (handled separately below)
  'image/webp': [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF"
  ],
  // Documents
  'application/pdf': [
    { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // "%PDF"
  ],
  // Old binary Office formats (Compound Document File)
  'application/msword': [
    { offset: 0, bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] },
  ],
  'application/vnd.ms-excel': [
    { offset: 0, bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] },
  ],
  'application/vnd.ms-powerpoint': [
    { offset: 0, bytes: [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1] },
  ],
  // Modern Office formats and ZIP (all use PK zip signature)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    { offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }, // "PK\x03\x04"
  ],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
    { offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] },
  ],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    { offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] },
  ],
  'application/zip': [
    { offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] },
  ],
  'application/x-zip-compressed': [
    { offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] },
  ],
  // Text formats — no magic bytes, accepted on declared type alone
  'text/plain': null,
  'text/csv': null,
  'text/markdown': null,
};

/**
 * Verifies the file content matches the declared MIME type using magic bytes.
 *
 * @param header - First 12 bytes of the file (from file.slice(0, 12).arrayBuffer())
 * @param declaredMimeType - The MIME type declared by the client (file.type)
 * @returns true if the content matches the declared type, false otherwise
 */
export function verifyMagicBytes(header: Uint8Array, declaredMimeType: string): boolean {
  const signatures = SIGNATURES[declaredMimeType];

  // Unknown MIME type — not in our map
  if (signatures === undefined) return false;

  // Text types: no magic bytes, accept on declared type alone
  if (signatures === null) return true;

  // WebP requires two separate checks: "RIFF" at 0 and "WEBP" at 8
  if (declaredMimeType === 'image/webp') {
    if (header.length < 12) return false;
    const isRiff = [0x52, 0x49, 0x46, 0x46].every((b, i) => header[i] === b);
    const isWebp = [0x57, 0x45, 0x42, 0x50].every((b, i) => header[8 + i] === b);
    return isRiff && isWebp;
  }

  // Check if any of the known signatures match
  return signatures.some(sig => {
    if (header.length < sig.offset + sig.bytes.length) return false;
    return sig.bytes.every((byte, i) => header[sig.offset + i] === byte);
  });
}
