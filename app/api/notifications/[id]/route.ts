import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { execute, queryOne } from '@/lib/db/turso';
import logger from '../../../../lib/logger'

export const dynamic = 'force-dynamic';

interface NotificationRow {
  id: string;
  user_id: string;
}

// PATCH /api/notifications/[id] - Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const { isRead } = await request.json();

    // Verify notification belongs to user
    const notification = await queryOne<NotificationRow>(
      'SELECT id, user_id FROM notifications WHERE id = :id',
      { id }
    );

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (notification.user_id !== payload.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await execute(
      'UPDATE notifications SET is_read = :isRead WHERE id = :id',
      { id, isRead: isRead ? 1 : 0 }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Update notification error');
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;

    // Verify notification belongs to user
    const notification = await queryOne<NotificationRow>(
      'SELECT id, user_id FROM notifications WHERE id = :id',
      { id }
    );

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (notification.user_id !== payload.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await execute('DELETE FROM notifications WHERE id = :id', { id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Delete notification error');
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
