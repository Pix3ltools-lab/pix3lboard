import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { query } from '@/lib/db/turso';
import type { Card, PaginatedResponse } from '@/types';

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
  job_number: string | null;
  severity: string | null;
  priority: string | null;
  effort: string | null;
  attendees: string | null;
  meeting_date: string | null;
  checklist: string | null;
  is_archived: number | null;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
}

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId || null;
}

// GET /api/lists/[listId]/cards - List paginated cards in a list
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listId } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const offset = (page - 1) * limit;

    // Verify list access: board must be owned or shared
    const listAccess = await query<{ id: string }>(
      `SELECT l.id FROM lists l
       JOIN boards b ON b.id = l.board_id
       LEFT JOIN workspaces w ON w.id = b.workspace_id
       LEFT JOIN board_shares bs ON bs.board_id = b.id AND bs.user_id = :userId
       WHERE l.id = :listId AND (w.user_id = :userId OR bs.user_id IS NOT NULL)`,
      { listId, userId }
    );

    if (listAccess.length === 0) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    // Get total count
    const countResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM cards
       WHERE list_id = :listId AND (is_archived = 0 OR is_archived IS NULL)`,
      { listId }
    );
    const total = Number(countResult[0]?.count || 0);

    // Load cards with pagination
    const cardRows = await query<CardRow>(
      `SELECT * FROM cards
       WHERE list_id = :listId AND (is_archived = 0 OR is_archived IS NULL)
       ORDER BY position
       LIMIT :limit OFFSET :offset`,
      { listId, limit, offset }
    );

    // Get comment counts
    let commentCounts = new Map<string, number>();
    if (cardRows.length > 0) {
      const cardIds = cardRows.map(c => c.id);
      const countRows = await query<{ card_id: string; count: number }>(
        `SELECT card_id, COUNT(*) as count FROM comments
         WHERE card_id IN (${cardIds.map((_, i) => `:c${i}`).join(',')})
         GROUP BY card_id`,
        Object.fromEntries(cardIds.map((id, i) => [`c${i}`, id]))
      );
      commentCounts = new Map(countRows.map(r => [r.card_id, Number(r.count)]));
    }

    const cards: Card[] = cardRows.map(c => ({
      id: c.id,
      listId: c.list_id,
      title: c.title,
      description: c.description || undefined,
      position: c.position,
      type: c.type || undefined,
      prompt: c.prompt || undefined,
      rating: c.rating || undefined,
      aiTool: c.ai_tool || undefined,
      tags: c.tags ? JSON.parse(c.tags) : undefined,
      dueDate: c.due_date || undefined,
      links: c.links ? JSON.parse(c.links) : undefined,
      responsible: c.responsible || undefined,
      jobNumber: c.job_number || undefined,
      severity: c.severity || undefined,
      priority: c.priority || undefined,
      effort: c.effort || undefined,
      attendees: c.attendees ? JSON.parse(c.attendees) : undefined,
      meetingDate: c.meeting_date || undefined,
      checklist: c.checklist ? JSON.parse(c.checklist) : undefined,
      isArchived: Boolean(c.is_archived),
      thumbnail: c.thumbnail || undefined,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      commentCount: commentCounts.get(c.id) || 0,
    } as Card));

    const response: PaginatedResponse<Card> = {
      data: cards,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + cards.length < total,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Load cards error:', error);
    return NextResponse.json({ error: 'Failed to load cards' }, { status: 500 });
  }
}
