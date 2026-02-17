import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/apiAuth';
import { query, queryOne, execute } from '@/lib/db/turso';
import { getBoardRole } from '@/lib/auth/permissions';
import { canView, canManageLists } from '@/lib/auth/permissions';
import { CreateListSchema } from '@/lib/validation/apiSchemas';
import { generateId } from '@/lib/utils/id';
import logger from '../../../../../../lib/logger'

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

/**
 * @swagger
 * /api/v1/boards/{boardId}/lists:
 *   get:
 *     summary: List all lists for a board
 *     tags: [Lists]
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
 *         description: List of lists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   post:
 *     summary: Create a new list in a board
 *     tags: [Lists]
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               position:
 *                 type: integer
 *               color:
 *                 type: string
 *     responses:
 *       201:
 *         description: List created
 *       400:
 *         description: Invalid request
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

    const lists = await query<ListRow>(
      'SELECT * FROM lists WHERE board_id = :boardId ORDER BY position',
      { boardId }
    );

    return NextResponse.json({
      data: lists.map(l => ({
        id: l.id,
        board_id: l.board_id,
        name: l.name,
        position: l.position,
        color: l.color,
        created_at: l.created_at,
        updated_at: l.updated_at,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /api/v1/boards/[boardId]/lists error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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
    if (!canManageLists(role)) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validation = CreateListSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { name, position, color } = validation.data;

    // Auto-calculate position if not provided
    let finalPosition = position;
    if (finalPosition === undefined) {
      const maxPos = await queryOne<{ max_pos: number | null }>(
        'SELECT MAX(position) as max_pos FROM lists WHERE board_id = :boardId',
        { boardId }
      );
      finalPosition = (maxPos?.max_pos ?? -1) + 1;
    }

    const id = generateId();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO lists (id, board_id, name, position, color, created_at, updated_at)
       VALUES (:id, :boardId, :name, :position, :color, :createdAt, :updatedAt)`,
      {
        id,
        boardId,
        name,
        position: finalPosition,
        color: color || null,
        createdAt: now,
        updatedAt: now,
      }
    );

    return NextResponse.json({
      data: {
        id,
        board_id: boardId,
        name,
        position: finalPosition,
        color: color || null,
        created_at: now,
        updated_at: now,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, 'POST /api/v1/boards/[boardId]/lists error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
