import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { query } from '@/lib/db/turso';
import type { ListSummary } from '@/types';

export const dynamic = 'force-dynamic';

interface ListRow {
  id: string;
  board_id: string;
  name: string;
  position: number;
  color: string | null;
  created_at: string;
  updated_at: string;
}

interface CardCountRow {
  list_id: string;
  count: number;
}

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId || null;
}

// GET /api/boards/[boardId]/lists - List all lists in a board
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { boardId } = await params;

    // Verify board access: owned or shared
    const boardAccess = await query<{ id: string }>(
      `SELECT b.id FROM boards b
       LEFT JOIN workspaces w ON w.id = b.workspace_id
       LEFT JOIN board_shares bs ON bs.board_id = b.id AND bs.user_id = :userId
       WHERE b.id = :boardId AND (w.user_id = :userId OR bs.user_id IS NOT NULL)`,
      { boardId, userId }
    );

    if (boardAccess.length === 0) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Load lists for this board
    const listRows = await query<ListRow>(
      'SELECT * FROM lists WHERE board_id = :boardId ORDER BY position',
      { boardId }
    );

    if (listRows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get card counts per list (excluding archived)
    const listIds = listRows.map(l => l.id);
    const countRows = await query<CardCountRow>(
      `SELECT list_id, COUNT(*) as count FROM cards
       WHERE list_id IN (${listIds.map((_, i) => `:l${i}`).join(',')})
       AND (is_archived = 0 OR is_archived IS NULL)
       GROUP BY list_id`,
      Object.fromEntries(listIds.map((id, i) => [`l${i}`, id]))
    );
    const cardCounts = new Map(countRows.map(r => [r.list_id, Number(r.count)]));

    const lists: ListSummary[] = listRows.map(l => ({
      id: l.id,
      boardId: l.board_id,
      name: l.name,
      position: l.position,
      color: l.color || undefined,
      cardCount: cardCounts.get(l.id) || 0,
      createdAt: l.created_at,
      updatedAt: l.updated_at,
    }));

    return NextResponse.json({ data: lists });
  } catch (error) {
    console.error('Load lists error:', error);
    return NextResponse.json({ error: 'Failed to load lists' }, { status: 500 });
  }
}
