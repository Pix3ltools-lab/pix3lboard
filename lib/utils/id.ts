/**
 * Generate a unique ID using UUID v4
 * Compatible with Supabase uuid columns
 */
export function generateId(): string {
  // Use crypto.randomUUID() which generates RFC4122 UUID
  // Compatible with PostgreSQL uuid type
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older environments (shouldn't happen in modern browsers)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
