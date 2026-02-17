import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { query } from '@/lib/db/turso';
import { checkDueDates } from '@/lib/db/notifications';
import logger from '../../../lib/logger'

export const dynamic = 'force-dynamic';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: number;
  created_at: string;
}

// GET /api/notifications - Get user's notifications
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get limit from query params (default 50)
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Check for due date notifications (runs on each fetch, deduped internally)
    try {
      await checkDueDates(payload.userId);
    } catch (error) {
      logger.error({ err: error }, 'Error checking due dates');
      // Don't fail the request if due date check fails
    }

    const notifications = await query<NotificationRow>(`
      SELECT * FROM notifications
      WHERE user_id = :userId
      ORDER BY created_at DESC
      LIMIT :limit
    `, { userId: payload.userId, limit });

    return NextResponse.json({
      notifications: notifications.map(n => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: n.is_read === 1,
        createdAt: n.created_at,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, 'Get notifications error');
    return NextResponse.json({ error: 'Failed to get notifications' }, { status: 500 });
  }
}
