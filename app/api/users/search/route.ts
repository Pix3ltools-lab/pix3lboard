import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById } from '@/lib/auth/auth';
import { query } from '@/lib/db/turso';
import logger from '../../../../lib/logger'

export const dynamic = 'force-dynamic';

interface UserSearchResult {
  id: string;
  email: string;
  name: string | null;
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify user exists and is approved
    const currentUser = await getUserById(payload.userId);
    if (!currentUser || !currentUser.is_approved) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const limitParam = searchParams.get('limit');
    let limit = limitParam ? parseInt(limitParam, 10) : 10;

    // Validate parameters
    if (q.length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
    }

    // Cap limit at 20
    if (isNaN(limit) || limit < 1) {
      limit = 10;
    } else if (limit > 20) {
      limit = 20;
    }

    // Search for users (case-insensitive, approved only, exclude current user)
    const searchTerm = `%${q.toLowerCase()}%`;

    const users = await query<UserSearchResult>(
      `SELECT id, email, name FROM users
       WHERE is_approved = 1
         AND id != :currentUserId
         AND (LOWER(email) LIKE :searchTerm OR LOWER(name) LIKE :searchTerm)
       LIMIT :limit`,
      {
        currentUserId: payload.userId,
        searchTerm,
        limit,
      }
    );

    return NextResponse.json({ users });
  } catch (error) {
    logger.error({ err: error }, 'User search error');
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
