import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/apiAuth';
import { query, queryOne, execute } from '@/lib/db/turso';
import { getBoardRole } from '@/lib/auth/permissions';
import { canView, canManageBoard } from '@/lib/auth/permissions';
import { UpdateBoardSchema } from '@/lib/validation/apiSchemas';

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
  color: string | null;
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
  thumbnail: string | null;
  wiki_page_id: string | null;
  created_at: string;
  updated_at: string;
  comment_count: number;
}

/**
 * @swagger
 * /api/v1/boards/{boardId}:
 *   get:
 *     summary: Get board detail with lists and cards
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Board with nested lists and cards
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Board not found
 *   patch:
 *     summary: Update a board
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               background:
 *                 type: string
 *                 nullable: true
 *               allowed_card_types:
 *                 type: array
 *                 items:
 *                   type: string
 *                 nullable: true
 *               is_public:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Board updated
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Board not found
 *   delete:
 *     summary: Delete a board (owner only)
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Board deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Board not found
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

    const board = await queryOne<BoardRow>(
      'SELECT * FROM boards WHERE id = :boardId',
      { boardId }
    );
    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    const lists = await query<ListRow>(
      'SELECT * FROM lists WHERE board_id = :boardId ORDER BY position',
      { boardId }
    );

    let cards: CardRow[] = [];
    if (lists.length > 0) {
      const listIds = lists.map(l => l.id);
      cards = await query<CardRow>(
        `SELECT c.*, u.name as responsible_user_name, u.email as responsible_user_email,
         (SELECT COUNT(*) FROM comments cm WHERE cm.card_id = c.id) as comment_count
         FROM cards c
         LEFT JOIN users u ON u.id = c.responsible_user_id
         WHERE c.list_id IN (${listIds.map((_, i) => `:l${i}`).join(',')})
         AND (c.is_archived = 0 OR c.is_archived IS NULL)
         ORDER BY c.position`,
        Object.fromEntries(listIds.map((id, i) => [`l${i}`, id]))
      );
    }

    const formatCard = (c: CardRow) => ({
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
    });

    return NextResponse.json({
      data: {
        id: board.id,
        workspace_id: board.workspace_id,
        name: board.name,
        description: board.description,
        background: board.background,
        allowed_card_types: board.allowed_card_types ? JSON.parse(board.allowed_card_types) : null,
        is_public: Boolean(board.is_public),
        role,
        created_at: board.created_at,
        updated_at: board.updated_at,
        lists: lists.map(l => ({
          id: l.id,
          board_id: l.board_id,
          name: l.name,
          position: l.position,
          color: l.color,
          created_at: l.created_at,
          updated_at: l.updated_at,
          cards: cards.filter(c => c.list_id === l.id).map(formatCard),
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/v1/boards/[boardId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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
    if (!canManageBoard(role)) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validation = UpdateBoardSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updateFields: string[] = [];
    const updateParams: Record<string, unknown> = { id: boardId };

    if (data.name !== undefined) {
      updateFields.push('name = :name');
      updateParams.name = data.name;
    }
    if (data.description !== undefined) {
      updateFields.push('description = :description');
      updateParams.description = data.description;
    }
    if (data.background !== undefined) {
      updateFields.push('background = :background');
      updateParams.background = data.background;
    }
    if (data.allowed_card_types !== undefined) {
      updateFields.push('allowed_card_types = :allowedCardTypes');
      updateParams.allowedCardTypes = data.allowed_card_types ? JSON.stringify(data.allowed_card_types) : null;
    }
    if (data.is_public !== undefined) {
      updateFields.push('is_public = :isPublic');
      updateParams.isPublic = data.is_public ? 1 : 0;
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updateFields.push('updated_at = :updatedAt');
    updateParams.updatedAt = new Date().toISOString();

    await execute(
      `UPDATE boards SET ${updateFields.join(', ')} WHERE id = :id`,
      updateParams
    );

    const updated = await queryOne<BoardRow>(
      'SELECT * FROM boards WHERE id = :boardId',
      { boardId }
    );

    return NextResponse.json({
      data: {
        id: updated!.id,
        workspace_id: updated!.workspace_id,
        name: updated!.name,
        description: updated!.description,
        background: updated!.background,
        allowed_card_types: updated!.allowed_card_types ? JSON.parse(updated!.allowed_card_types) : null,
        is_public: Boolean(updated!.is_public),
        role,
        created_at: updated!.created_at,
        updated_at: updated!.updated_at,
      },
    });
  } catch (error) {
    console.error('PATCH /api/v1/boards/[boardId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
    if (role !== 'owner') {
      return NextResponse.json({ error: 'Only the board owner can delete it' }, { status: 403 });
    }

    // Cascade delete
    await execute('DELETE FROM comments WHERE card_id IN (SELECT id FROM cards WHERE list_id IN (SELECT id FROM lists WHERE board_id = :id))', { id: boardId });
    await execute('DELETE FROM cards WHERE list_id IN (SELECT id FROM lists WHERE board_id = :id)', { id: boardId });
    await execute('DELETE FROM lists WHERE board_id = :id', { id: boardId });
    await execute('DELETE FROM board_shares WHERE board_id = :id', { id: boardId });
    await execute('DELETE FROM boards WHERE id = :id', { id: boardId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/v1/boards/[boardId] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
