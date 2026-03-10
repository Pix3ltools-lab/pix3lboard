import { NextRequest } from 'next/server';
import { verifyToken } from './auth';
import { queryOne, execute } from '@/lib/db/turso';
import crypto from 'crypto';

/**
 * Authenticate an API request.
 * Supports cookie-based auth (web UI), Bearer JWT (API clients), and Bearer API key (pk_live_*).
 * Returns the userId if authenticated, null otherwise.
 */
export async function authenticateRequest(request: NextRequest): Promise<string | null> {
  // 1. Try Authorization: Bearer header first (API clients)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token) {
      // API Key path
      if (token.startsWith('pk_live_')) {
        return authenticateApiKey(token);
      }
      // JWT path
      const payload = await verifyToken(token);
      return payload?.userId || null;
    }
  }

  // 2. Fall back to cookie auth (web UI)
  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    const payload = await verifyToken(cookieToken);
    return payload?.userId || null;
  }

  return null;
}

async function authenticateApiKey(key: string): Promise<string | null> {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const row = await queryOne<{ id: string; user_id: string }>(
    'SELECT id, user_id FROM api_keys WHERE key_hash = :hash',
    { hash }
  );
  if (!row) return null;

  // Update last_used_at (fire and forget)
  execute(
    'UPDATE api_keys SET last_used_at = :now WHERE id = :id',
    { now: new Date().toISOString(), id: row.id }
  ).catch(() => {});

  return row.user_id;
}
