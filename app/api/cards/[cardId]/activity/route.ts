import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { query } from '@/lib/db/turso';
import { getBoardRoleByCardId, canView } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

interface ActivityRow {
  id: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  action: string;
  details: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string;
}

// GET /api/cards/[cardId]/activity - Get activity log for a card
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
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

    const { cardId } = await params;

    // Verify user has view access to this card
    const role = await getBoardRoleByCardId(payload.userId, cardId);
    if (!canView(role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get activity log with user info
    const activities = await query<ActivityRow>(`
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM activity_log a
      JOIN users u ON u.id = a.user_id
      WHERE a.entity_type = 'card' AND a.entity_id = :cardId
      ORDER BY a.created_at DESC
      LIMIT 50
    `, { cardId });

    return NextResponse.json({
      activities: activities.map(a => ({
        id: a.id,
        entityType: a.entity_type,
        entityId: a.entity_id,
        userId: a.user_id,
        action: a.action,
        details: a.details ? JSON.parse(a.details) : null,
        createdAt: a.created_at,
        user: {
          name: a.user_name,
          email: a.user_email,
        },
      })),
    });
  } catch (error) {
    console.error('Get activity error:', error);
    return NextResponse.json({ error: 'Failed to get activity' }, { status: 500 });
  }
}
