import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { query } from '@/lib/db/turso';
import { getBoardRole, canView } from '@/lib/auth/permissions';
import logger from '../../../../../lib/logger'

export const dynamic = 'force-dynamic';

// GET /api/boards/[boardId]/analytics?from=2025-01-01&to=2025-12-31
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
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

    const { boardId } = await params;

    // Check user has access to this board
    const role = await getBoardRole(payload.userId, boardId);
    if (!canView(role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const fromDate = searchParams.get('from') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = searchParams.get('to') || new Date().toISOString().split('T')[0];

    // Run all queries in parallel
    const [
      cardsByList,
      cardsByType,
      cardsByPriority,
      overdueCards,
      throughputData,
      completedCards,
      createdVsCompleted,
    ] = await Promise.all([
      // Cards per list (current state)
      query<{ list_name: string; count: number }>(
        `SELECT l.name as list_name, COUNT(c.id) as count
         FROM lists l
         LEFT JOIN cards c ON c.list_id = l.id AND (c.is_archived = 0 OR c.is_archived IS NULL)
         WHERE l.board_id = :boardId
         GROUP BY l.id, l.name
         ORDER BY l.position`,
        { boardId }
      ),

      // Cards per type
      query<{ type: string; count: number }>(
        `SELECT COALESCE(c.type, 'task') as type, COUNT(*) as count
         FROM cards c
         JOIN lists l ON c.list_id = l.id
         WHERE l.board_id = :boardId
           AND (c.is_archived = 0 OR c.is_archived IS NULL)
         GROUP BY c.type
         ORDER BY count DESC`,
        { boardId }
      ),

      // Cards per priority
      query<{ priority: string; count: number }>(
        `SELECT COALESCE(c.priority, 'none') as priority, COUNT(*) as count
         FROM cards c
         JOIN lists l ON c.list_id = l.id
         WHERE l.board_id = :boardId
           AND (c.is_archived = 0 OR c.is_archived IS NULL)
         GROUP BY c.priority
         ORDER BY count DESC`,
        { boardId }
      ),

      // Overdue cards count
      query<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM cards c
         JOIN lists l ON c.list_id = l.id
         WHERE l.board_id = :boardId
           AND (c.is_archived = 0 OR c.is_archived IS NULL)
           AND c.due_date IS NOT NULL
           AND c.due_date < date('now')`,
        { boardId }
      ),

      // Throughput: cards created per day in the date range
      query<{ date: string; created: number }>(
        `SELECT date(c.created_at) as date, COUNT(*) as created
         FROM cards c
         JOIN lists l ON c.list_id = l.id
         WHERE l.board_id = :boardId
           AND date(c.created_at) >= :fromDate
           AND date(c.created_at) <= :toDate
         GROUP BY date(c.created_at)
         ORDER BY date`,
        { boardId, fromDate, toDate }
      ),

      // Total completed (archived) cards in period
      query<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM activity_log al
         JOIN cards c ON al.entity_id = c.id
         JOIN lists l ON c.list_id = l.id
         WHERE l.board_id = :boardId
           AND al.entity_type = 'card'
           AND al.action = 'archived'
           AND date(al.created_at) >= :fromDate
           AND date(al.created_at) <= :toDate`,
        { boardId, fromDate, toDate }
      ),

      // Created vs completed per week
      query<{ week: string; created: number; archived: number }>(
        `SELECT
           strftime('%Y-W%W', al.created_at) as week,
           SUM(CASE WHEN al.action = 'created' THEN 1 ELSE 0 END) as created,
           SUM(CASE WHEN al.action = 'archived' THEN 1 ELSE 0 END) as archived
         FROM activity_log al
         JOIN cards c ON al.entity_id = c.id
         JOIN lists l ON c.list_id = l.id
         WHERE l.board_id = :boardId
           AND al.entity_type = 'card'
           AND al.action IN ('created', 'archived')
           AND date(al.created_at) >= :fromDate
           AND date(al.created_at) <= :toDate
         GROUP BY week
         ORDER BY week`,
        { boardId, fromDate, toDate }
      ),
    ]);

    // Calculate lead time from activity log (created → archived)
    const leadTimeData = await query<{ card_id: string; title: string; lead_time_days: number }>(
      `SELECT
         c.id as card_id,
         c.title,
         ROUND(julianday(arch.created_at) - julianday(cr.created_at), 1) as lead_time_days
       FROM activity_log cr
       JOIN activity_log arch ON cr.entity_id = arch.entity_id
         AND arch.entity_type = 'card' AND arch.action = 'archived'
       JOIN cards c ON cr.entity_id = c.id
       JOIN lists l ON c.list_id = l.id
       WHERE l.board_id = :boardId
         AND cr.entity_type = 'card'
         AND cr.action = 'created'
         AND date(arch.created_at) >= :fromDate
         AND date(arch.created_at) <= :toDate
       ORDER BY arch.created_at DESC
       LIMIT 50`,
      { boardId, fromDate, toDate }
    );

    // Compute summary metrics
    const totalCards = cardsByList.reduce((sum, r) => sum + Number(r.count), 0);
    const avgLeadTime = leadTimeData.length > 0
      ? Math.round(leadTimeData.reduce((sum, r) => sum + Number(r.lead_time_days), 0) / leadTimeData.length * 10) / 10
      : null;

    return NextResponse.json({
      period: { from: fromDate, to: toDate },
      summary: {
        totalCards,
        overdueCards: Number(overdueCards[0]?.count || 0),
        completedInPeriod: Number(completedCards[0]?.count || 0),
        avgLeadTimeDays: avgLeadTime,
      },
      cardsByList,
      cardsByType,
      cardsByPriority,
      throughput: throughputData,
      createdVsCompleted,
      leadTime: leadTimeData,
    });
  } catch (error) {
    logger.error({ err: error }, 'Analytics error');
    return NextResponse.json(
      { error: 'Failed to load analytics' },
      { status: 500 }
    );
  }
}
