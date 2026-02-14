import { NextRequest } from 'next/server';
import { verifyToken } from './auth';

/**
 * Authenticate an API request.
 * Supports both cookie-based auth (web UI) and Bearer token auth (API clients).
 * Returns the userId if authenticated, null otherwise.
 */
export async function authenticateRequest(request: NextRequest): Promise<string | null> {
  // 1. Try Authorization: Bearer header first (API clients)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (token) {
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
