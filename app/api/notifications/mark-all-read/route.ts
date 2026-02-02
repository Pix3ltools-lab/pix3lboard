import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { execute } from '@/lib/db/turso';

export const dynamic = 'force-dynamic';

// POST /api/notifications/mark-all-read - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const result = await execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = :userId AND is_read = 0',
      { userId: payload.userId }
    );

    return NextResponse.json({
      success: true,
      updated: result.rowsAffected,
    });
  } catch (error) {
    console.error('Mark all read error:', error);
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
  }
}
