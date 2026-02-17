import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { query } from '@/lib/db/turso';
import logger from '../../../../../lib/logger'

export const dynamic = 'force-dynamic';

interface ArchivedCardRow {
  id: string;
  list_id: string;
  list_name: string;
  title: string;
  description: string | null;
  type: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

// GET /api/boards/[boardId]/archived-cards - Get all archived cards for a board
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

    // Verify board belongs to user and get archived cards
    const cards = await query<ArchivedCardRow>(
      `SELECT cards.id, cards.list_id, lists.name as list_name, cards.title,
              cards.description, cards.type, cards.tags, cards.created_at, cards.updated_at
       FROM cards
       JOIN lists ON lists.id = cards.list_id
       JOIN boards ON boards.id = lists.board_id
       JOIN workspaces ON workspaces.id = boards.workspace_id
       WHERE boards.id = :boardId
         AND workspaces.user_id = :userId
         AND cards.is_archived = 1
       ORDER BY cards.updated_at DESC`,
      { boardId, userId: payload.userId }
    );

    return NextResponse.json({
      cards: cards.map(c => ({
        id: c.id,
        listId: c.list_id,
        listName: c.list_name,
        title: c.title,
        description: c.description || undefined,
        type: c.type || undefined,
        tags: c.tags ? JSON.parse(c.tags) : undefined,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, 'Get archived cards error');
    return NextResponse.json({ error: 'Failed to get archived cards' }, { status: 500 });
  }
}
