import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/apiAuth';
import { queryOne, execute } from '@/lib/db/turso';
import { getBoardRoleByListId } from '@/lib/auth/permissions';
import { canManageLists } from '@/lib/auth/permissions';
import { UpdateListSchema } from '@/lib/validation/apiSchemas';
import logger from '../../../../../lib/logger'

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
 * /api/v1/lists/{listId}:
 *   patch:
 *     summary: Update a list
 *     tags: [Lists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
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
 *               position:
 *                 type: integer
 *               color:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: List updated
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: List not found
 *   delete:
 *     summary: Delete a list and all its cards
 *     tags: [Lists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: List not found
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listId } = await params;
    const role = await getBoardRoleByListId(userId, listId);
    if (!canManageLists(role)) {
      return NextResponse.json({ error: 'List not found or access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validation = UpdateListSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updateFields: string[] = [];
    const updateParams: Record<string, unknown> = { id: listId };

    if (data.name !== undefined) {
      updateFields.push('name = :name');
      updateParams.name = data.name;
    }
    if (data.position !== undefined) {
      updateFields.push('position = :position');
      updateParams.position = data.position;
    }
    if (data.color !== undefined) {
      updateFields.push('color = :color');
      updateParams.color = data.color;
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updateFields.push('updated_at = :updatedAt');
    updateParams.updatedAt = new Date().toISOString();

    await execute(
      `UPDATE lists SET ${updateFields.join(', ')} WHERE id = :id`,
      updateParams
    );

    const updated = await queryOne<ListRow>(
      'SELECT * FROM lists WHERE id = :listId',
      { listId }
    );

    return NextResponse.json({
      data: {
        id: updated!.id,
        board_id: updated!.board_id,
        name: updated!.name,
        position: updated!.position,
        color: updated!.color,
        created_at: updated!.created_at,
        updated_at: updated!.updated_at,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'PATCH /api/v1/lists/[listId] error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listId } = await params;
    const role = await getBoardRoleByListId(userId, listId);
    if (!canManageLists(role)) {
      return NextResponse.json({ error: 'List not found or access denied' }, { status: 403 });
    }

    // Cascade delete
    await execute('DELETE FROM comments WHERE card_id IN (SELECT id FROM cards WHERE list_id = :id)', { id: listId });
    await execute('DELETE FROM cards WHERE list_id = :id', { id: listId });
    await execute('DELETE FROM lists WHERE id = :id', { id: listId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /api/v1/lists/[listId] error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
