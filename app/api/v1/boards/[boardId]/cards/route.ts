import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/apiAuth';
import { query } from '@/lib/db/turso';
import { getBoardRole } from '@/lib/auth/permissions';
import { canView } from '@/lib/auth/permissions';
import logger from '../../../../../../lib/logger'

export const dynamic = 'force-dynamic';

interface CardRow {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  position: number;
  type: string | null;
  prompt: string | null;
  rating: number | null;
  ai_tool: string | null;
  tags: string | null;
  due_date: string | null;
  links: string | null;
  responsible: string | null;
  responsible_user_id: string | null;
  responsible_user_name: string | null;
  responsible_user_email: string | null;
  job_number: string | null;
  severity: string | null;
  priority: string | null;
  effort: string | null;
  attendees: string | null;
  meeting_date: string | null;
  checklist: string | null;
  is_archived: number | null;
  thumbnail: string | null;
  wiki_page_id: string | null;
  created_at: string;
  updated_at: string;
  comment_count: number;
}

/**
 * @swagger
 * /api/v1/boards/{boardId}/cards:
 *   get:
 *     summary: List cards for a board with optional filters
 *     tags: [Cards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: list_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: is_archived
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: responsible_user_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *           maximum: 200
 *     responses:
 *       200:
 *         description: List of cards
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { boardId } = await params;
    const role = await getBoardRole(userId, boardId);
    if (!canView(role)) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const listId = searchParams.get('list_id');
    const isArchivedParam = searchParams.get('is_archived');
    const responsibleUserId = searchParams.get('responsible_user_id');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    // Build WHERE clauses
    const conditions: string[] = ['l.board_id = :boardId'];
    const queryParams: Record<string, unknown> = { boardId };

    if (listId) {
      conditions.push('c.list_id = :listId');
      queryParams.listId = listId;
    }

    if (isArchivedParam !== null) {
      conditions.push('c.is_archived = :isArchived');
      queryParams.isArchived = isArchivedParam === 'true' ? 1 : 0;
    } else {
      // Default: exclude archived
      conditions.push('(c.is_archived = 0 OR c.is_archived IS NULL)');
    }

    if (responsibleUserId) {
      conditions.push('c.responsible_user_id = :responsibleUserId');
      queryParams.responsibleUserId = responsibleUserId;
    }

    const whereClause = conditions.join(' AND ');

    // Get total count
    const countResult = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM cards c JOIN lists l ON l.id = c.list_id WHERE ${whereClause}`,
      queryParams
    );
    const total = countResult[0]?.total || 0;

    // Get paginated cards
    const cards = await query<CardRow>(
      `SELECT c.*, u.name as responsible_user_name, u.email as responsible_user_email,
       (SELECT COUNT(*) FROM comments cm WHERE cm.card_id = c.id) as comment_count
       FROM cards c
       JOIN lists l ON l.id = c.list_id
       LEFT JOIN users u ON u.id = c.responsible_user_id
       WHERE ${whereClause}
       ORDER BY c.position
       LIMIT :limit OFFSET :offset`,
      { ...queryParams, limit, offset }
    );

    return NextResponse.json({
      data: cards.map(c => ({
        id: c.id,
        list_id: c.list_id,
        title: c.title,
        description: c.description,
        position: c.position,
        type: c.type,
        prompt: c.prompt,
        rating: c.rating,
        ai_tool: c.ai_tool,
        tags: c.tags ? JSON.parse(c.tags) : null,
        due_date: c.due_date,
        links: c.links ? JSON.parse(c.links) : null,
        responsible: c.responsible,
        responsible_user_id: c.responsible_user_id,
        responsible_user_name: c.responsible_user_name,
        responsible_user_email: c.responsible_user_email,
        job_number: c.job_number,
        severity: c.severity,
        priority: c.priority,
        effort: c.effort,
        attendees: c.attendees ? JSON.parse(c.attendees) : null,
        meeting_date: c.meeting_date,
        checklist: c.checklist ? JSON.parse(c.checklist) : null,
        is_archived: Boolean(c.is_archived),
        thumbnail: c.thumbnail,
        wiki_page_id: c.wiki_page_id,
        comment_count: Number(c.comment_count),
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /api/v1/boards/[boardId]/cards error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
