import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/turso';
import type { Board, List, Card } from '@/types';

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

interface ListRow {
  id: string;
  board_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

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
  created_at: string;
  updated_at: string;
}

// GET - Load public board data (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const { boardId } = await params;

    // Get board (must be public)
    const boardRows = await query<BoardRow>(
      'SELECT * FROM boards WHERE id = :boardId AND is_public = 1',
      { boardId }
    );

    if (boardRows.length === 0) {
      return NextResponse.json({ error: 'Board not found or not public' }, { status: 404 });
    }

    const boardRow = boardRows[0];

    // Get lists
    const listRows = await query<ListRow>(
      'SELECT * FROM lists WHERE board_id = :boardId ORDER BY position',
      { boardId }
    );

    // Get cards (excluding archived), with responsible user info
    const listIds = listRows.map(l => l.id);
    let cardRows: CardRow[] = [];
    if (listIds.length > 0) {
      cardRows = await query<CardRow>(
        `SELECT c.*, u.name as responsible_user_name, u.email as responsible_user_email
         FROM cards c
         LEFT JOIN users u ON u.id = c.responsible_user_id
         WHERE c.list_id IN (${listIds.map((_, i) => `:l${i}`).join(',')}) AND (c.is_archived = 0 OR c.is_archived IS NULL)
         ORDER BY c.position`,
        Object.fromEntries(listIds.map((id, i) => [`l${i}`, id]))
      );
    }

    // Get comment counts
    let commentCounts: Map<string, number> = new Map();
    if (cardRows.length > 0) {
      const cardIds = cardRows.map(c => c.id);
      const countRows = await query<{ card_id: string; count: number }>(
        `SELECT card_id, COUNT(*) as count FROM comments WHERE card_id IN (${cardIds.map((_, i) => `:c${i}`).join(',')}) GROUP BY card_id`,
        Object.fromEntries(cardIds.map((id, i) => [`c${i}`, id]))
      );
      commentCounts = new Map(countRows.map(r => [r.card_id, Number(r.count)]));
    }

    // Assemble board structure
    const board: Board = {
      id: boardRow.id,
      workspaceId: boardRow.workspace_id,
      name: boardRow.name,
      description: boardRow.description || undefined,
      background: boardRow.background || undefined,
      allowedCardTypes: boardRow.allowed_card_types ? JSON.parse(boardRow.allowed_card_types) : undefined,
      isPublic: true,
      createdAt: boardRow.created_at,
      updatedAt: boardRow.updated_at,
      lists: listRows.map(l => ({
        id: l.id,
        boardId: l.board_id,
        name: l.name,
        position: l.position,
        createdAt: l.created_at,
        updatedAt: l.updated_at,
        cards: cardRows
          .filter(c => c.list_id === l.id)
          .map(c => ({
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
            responsibleUserId: c.responsible_user_id || undefined,
            responsibleUserName: c.responsible_user_name || undefined,
            responsibleUserEmail: c.responsible_user_email || undefined,
            jobNumber: c.job_number || undefined,
            severity: c.severity || undefined,
            priority: c.priority || undefined,
            effort: c.effort || undefined,
            attendees: c.attendees ? JSON.parse(c.attendees) : undefined,
            meetingDate: c.meeting_date || undefined,
            checklist: c.checklist ? JSON.parse(c.checklist) : undefined,
            isArchived: false,
            createdAt: c.created_at,
            updatedAt: c.updated_at,
            commentCount: commentCounts.get(c.id) || 0,
          } as Card)),
      } as List)),
    };

    return NextResponse.json({ board });
  } catch (error) {
    console.error('Load public board error:', error);
    return NextResponse.json({ error: 'Failed to load board' }, { status: 500 });
  }
}
