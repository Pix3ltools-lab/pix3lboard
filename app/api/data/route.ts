import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { query, execute, getTursoClient } from '@/lib/db/turso';
import type { Workspace, Board, List, Card } from '@/types';

export const dynamic = 'force-dynamic';

// Type definitions for database rows
interface WorkspaceRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

interface BoardRow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  background: string | null;
  allowed_card_types: string | null;
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
  job_number: string | null;
  severity: string | null;
  priority: string | null;
  effort: string | null;
  attendees: string | null;
  meeting_date: string | null;
  created_at: string;
  updated_at: string;
}

// Helper to get user ID from request
async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId || null;
}

// GET - Load all user data
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ workspaces: [] });
    }

    // Load workspaces
    const workspaceRows = await query<WorkspaceRow>(
      'SELECT * FROM workspaces WHERE user_id = :userId ORDER BY created_at',
      { userId }
    );

    if (workspaceRows.length === 0) {
      return NextResponse.json({ workspaces: [] });
    }

    // Load all boards for these workspaces
    const workspaceIds = workspaceRows.map(w => w.id);
    const boardRows = await query<BoardRow>(
      `SELECT * FROM boards WHERE workspace_id IN (${workspaceIds.map((_, i) => `:ws${i}`).join(',')}) ORDER BY created_at`,
      Object.fromEntries(workspaceIds.map((id, i) => [`ws${i}`, id]))
    );

    // Load all lists for these boards
    let listRows: ListRow[] = [];
    if (boardRows.length > 0) {
      const boardIds = boardRows.map(b => b.id);
      listRows = await query<ListRow>(
        `SELECT * FROM lists WHERE board_id IN (${boardIds.map((_, i) => `:b${i}`).join(',')}) ORDER BY position`,
        Object.fromEntries(boardIds.map((id, i) => [`b${i}`, id]))
      );
    }

    // Load all cards for these lists
    let cardRows: CardRow[] = [];
    if (listRows.length > 0) {
      const listIds = listRows.map(l => l.id);
      cardRows = await query<CardRow>(
        `SELECT * FROM cards WHERE list_id IN (${listIds.map((_, i) => `:l${i}`).join(',')}) ORDER BY position`,
        Object.fromEntries(listIds.map((id, i) => [`l${i}`, id]))
      );
    }

    // Assemble the nested structure
    const workspaces: Workspace[] = workspaceRows.map(ws => ({
      id: ws.id,
      name: ws.name,
      description: ws.description || undefined,
      icon: ws.icon || undefined,
      color: ws.color || undefined,
      createdAt: ws.created_at,
      updatedAt: ws.updated_at,
      boards: boardRows
        .filter(b => b.workspace_id === ws.id)
        .map(b => ({
          id: b.id,
          workspaceId: b.workspace_id,
          name: b.name,
          description: b.description || undefined,
          background: b.background || undefined,
          allowedCardTypes: b.allowed_card_types ? JSON.parse(b.allowed_card_types) : undefined,
          createdAt: b.created_at,
          updatedAt: b.updated_at,
          lists: listRows
            .filter(l => l.board_id === b.id)
            .map(l => ({
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
                  jobNumber: c.job_number || undefined,
                  severity: c.severity || undefined,
                  priority: c.priority || undefined,
                  effort: c.effort || undefined,
                  attendees: c.attendees ? JSON.parse(c.attendees) : undefined,
                  meetingDate: c.meeting_date || undefined,
                  createdAt: c.created_at,
                  updatedAt: c.updated_at,
                } as Card)),
            } as List)),
        } as Board)),
    }));

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error('Load data error:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}

// POST - Save all user data (replace everything)
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaces } = await request.json() as { workspaces: Workspace[] };
    const db = getTursoClient();

    // Save comments before deleting (they would be cascade deleted with cards)
    const existingComments = await query<{
      id: string;
      card_id: string;
      user_id: string;
      content: string;
      created_at: string;
      updated_at: string;
    }>(`
      SELECT c.* FROM comments c
      JOIN cards ON cards.id = c.card_id
      JOIN lists ON lists.id = cards.list_id
      JOIN boards ON boards.id = lists.board_id
      JOIN workspaces ON workspaces.id = boards.workspace_id
      WHERE workspaces.user_id = :userId
    `, { userId });

    // Use a transaction to replace all data
    await db.batch([
      // Delete existing data (cascade will handle boards, lists, cards, comments)
      { sql: 'DELETE FROM workspaces WHERE user_id = :userId', args: { userId } },
    ]);

    // Insert all new data
    for (const ws of workspaces) {
      await execute(
        `INSERT INTO workspaces (id, user_id, name, description, icon, color, created_at, updated_at)
         VALUES (:id, :userId, :name, :description, :icon, :color, :createdAt, :updatedAt)`,
        {
          id: ws.id,
          userId,
          name: ws.name,
          description: ws.description || null,
          icon: ws.icon || null,
          color: ws.color || null,
          createdAt: ws.createdAt,
          updatedAt: ws.updatedAt,
        }
      );

      for (const board of ws.boards) {
        await execute(
          `INSERT INTO boards (id, workspace_id, name, description, background, allowed_card_types, created_at, updated_at)
           VALUES (:id, :workspaceId, :name, :description, :background, :allowedCardTypes, :createdAt, :updatedAt)`,
          {
            id: board.id,
            workspaceId: board.workspaceId,
            name: board.name,
            description: board.description || null,
            background: board.background || null,
            allowedCardTypes: board.allowedCardTypes ? JSON.stringify(board.allowedCardTypes) : null,
            createdAt: board.createdAt,
            updatedAt: board.updatedAt,
          }
        );

        for (const list of board.lists) {
          await execute(
            `INSERT INTO lists (id, board_id, name, position, created_at, updated_at)
             VALUES (:id, :boardId, :name, :position, :createdAt, :updatedAt)`,
            {
              id: list.id,
              boardId: list.boardId,
              name: list.name,
              position: list.position,
              createdAt: list.createdAt,
              updatedAt: list.updatedAt,
            }
          );

          for (const card of list.cards) {
            await execute(
              `INSERT INTO cards (id, list_id, title, description, position, type, prompt, rating, ai_tool, tags, due_date, links, responsible, job_number, severity, priority, effort, attendees, meeting_date, created_at, updated_at)
               VALUES (:id, :listId, :title, :description, :position, :type, :prompt, :rating, :aiTool, :tags, :dueDate, :links, :responsible, :jobNumber, :severity, :priority, :effort, :attendees, :meetingDate, :createdAt, :updatedAt)`,
              {
                id: card.id,
                listId: card.listId,
                title: card.title,
                description: card.description || null,
                position: card.position,
                type: card.type || null,
                prompt: card.prompt || null,
                rating: card.rating || null,
                aiTool: card.aiTool || null,
                tags: card.tags ? JSON.stringify(card.tags) : null,
                dueDate: card.dueDate || null,
                links: card.links ? JSON.stringify(card.links) : null,
                responsible: card.responsible || null,
                jobNumber: card.jobNumber || null,
                severity: card.severity || null,
                priority: card.priority || null,
                effort: card.effort || null,
                attendees: card.attendees ? JSON.stringify(card.attendees) : null,
                meetingDate: card.meetingDate || null,
                createdAt: card.createdAt,
                updatedAt: card.updatedAt,
              }
            );
          }
        }
      }
    }

    // Restore comments for cards that still exist
    const newCardIds = workspaces.flatMap(ws =>
      ws.boards.flatMap(b =>
        b.lists.flatMap(l =>
          l.cards.map(c => c.id)
        )
      )
    );

    for (const comment of existingComments) {
      // Only restore if the card still exists
      if (newCardIds.includes(comment.card_id)) {
        await execute(`
          INSERT INTO comments (id, card_id, user_id, content, created_at, updated_at)
          VALUES (:id, :cardId, :userId, :content, :createdAt, :updatedAt)
        `, {
          id: comment.id,
          cardId: comment.card_id,
          userId: comment.user_id,
          content: comment.content,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save data error:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
