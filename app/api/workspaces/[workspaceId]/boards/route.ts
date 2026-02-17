import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { query } from '@/lib/db/turso';
import type { BoardSummary } from '@/types';
import logger from '../../../../../lib/logger'

export const dynamic = 'force-dynamic';

interface BoardRow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  background: string | null;
  allowed_card_types: string | null;
  is_public: number | null;
  created_at: string;
  updated_at: string;
}

interface SharedBoardRow extends BoardRow {
  share_role: 'owner' | 'viewer';
  workspace_name: string;
  owner_name: string | null;
}

interface CountRow {
  board_id: string;
  list_count: number;
  card_count: number;
}

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId || null;
}

// GET /api/workspaces/[workspaceId]/boards - List all boards in a workspace
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId } = await params;

    // Handle shared boards workspace
    if (workspaceId === '__shared__') {
      const sharedBoardRows = await query<SharedBoardRow>(
        `SELECT b.*, bs.role as share_role, w.name as workspace_name, u.name as owner_name
         FROM boards b
         JOIN board_shares bs ON bs.board_id = b.id
         JOIN workspaces w ON w.id = b.workspace_id
         JOIN users u ON u.id = w.user_id
         WHERE bs.user_id = :userId
         ORDER BY b.created_at`,
        { userId }
      );

      if (sharedBoardRows.length === 0) {
        return NextResponse.json({ data: [] });
      }

      // Get list and card counts
      const boardIds = sharedBoardRows.map(b => b.id);
      const counts = await getBoardCounts(boardIds);

      const boards: BoardSummary[] = sharedBoardRows.map(b => ({
        id: b.id,
        workspaceId: b.workspace_id,
        name: b.name,
        description: b.description || undefined,
        background: b.background || undefined,
        allowedCardTypes: b.allowed_card_types ? JSON.parse(b.allowed_card_types) : undefined,
        isPublic: Boolean(b.is_public),
        shareRole: b.share_role,
        listCount: counts.get(b.id)?.listCount || 0,
        cardCount: counts.get(b.id)?.cardCount || 0,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      }));

      return NextResponse.json({ data: boards });
    }

    // Verify workspace belongs to user
    const workspaceCheck = await query<{ id: string }>(
      'SELECT id FROM workspaces WHERE id = :workspaceId AND user_id = :userId',
      { workspaceId, userId }
    );

    if (workspaceCheck.length === 0) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Load boards for this workspace
    const boardRows = await query<BoardRow>(
      'SELECT * FROM boards WHERE workspace_id = :workspaceId ORDER BY created_at',
      { workspaceId }
    );

    if (boardRows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get list and card counts
    const boardIds = boardRows.map(b => b.id);
    const counts = await getBoardCounts(boardIds);

    const boards: BoardSummary[] = boardRows.map(b => ({
      id: b.id,
      workspaceId: b.workspace_id,
      name: b.name,
      description: b.description || undefined,
      background: b.background || undefined,
      allowedCardTypes: b.allowed_card_types ? JSON.parse(b.allowed_card_types) : undefined,
      isPublic: Boolean(b.is_public),
      listCount: counts.get(b.id)?.listCount || 0,
      cardCount: counts.get(b.id)?.cardCount || 0,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));

    return NextResponse.json({ data: boards });
  } catch (error) {
    logger.error({ err: error }, 'Load boards error');
    return NextResponse.json({ error: 'Failed to load boards' }, { status: 500 });
  }
}

async function getBoardCounts(boardIds: string[]): Promise<Map<string, { listCount: number; cardCount: number }>> {
  if (boardIds.length === 0) return new Map();

  const countRows = await query<CountRow>(
    `SELECT
      l.board_id,
      COUNT(DISTINCT l.id) as list_count,
      COUNT(c.id) as card_count
     FROM lists l
     LEFT JOIN cards c ON c.list_id = l.id AND (c.is_archived = 0 OR c.is_archived IS NULL)
     WHERE l.board_id IN (${boardIds.map((_, i) => `:b${i}`).join(',')})
     GROUP BY l.board_id`,
    Object.fromEntries(boardIds.map((id, i) => [`b${i}`, id]))
  );

  return new Map(countRows.map(r => [
    r.board_id,
    { listCount: Number(r.list_count), cardCount: Number(r.card_count) }
  ]));
}
