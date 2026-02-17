import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/apiAuth';
import { queryOne, execute } from '@/lib/db/turso';
import { getBoardRoleByCardId, getBoardRoleByListId } from '@/lib/auth/permissions';
import { canEditCards } from '@/lib/auth/permissions';
import { MoveCardSchema } from '@/lib/validation/apiSchemas';
import logger from '../../../../../../lib/logger'

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/cards/{cardId}/move:
 *   patch:
 *     summary: Move a card to a different list/position
 *     tags: [Cards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [list_id, position]
 *             properties:
 *               list_id:
 *                 type: string
 *                 description: Target list ID
 *               position:
 *                 type: integer
 *                 description: Target position in the list
 *     responses:
 *       200:
 *         description: Card moved
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Card not found
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cardId } = await params;

    // Check permission on source card
    const sourceRole = await getBoardRoleByCardId(userId, cardId);
    if (!canEditCards(sourceRole)) {
      return NextResponse.json({ error: 'Card not found or access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validation = MoveCardSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { list_id: targetListId, position: targetPosition } = validation.data;

    // Check permission on target list
    const targetRole = await getBoardRoleByListId(userId, targetListId);
    if (!canEditCards(targetRole)) {
      return NextResponse.json({ error: 'Target list not found or access denied' }, { status: 403 });
    }

    // Get current card info
    const card = await queryOne<{ list_id: string; position: number }>(
      'SELECT list_id, position FROM cards WHERE id = :cardId',
      { cardId }
    );
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const sourceListId = card.list_id;
    const sourcePosition = card.position;

    if (sourceListId === targetListId) {
      // Same list: shift positions
      if (targetPosition > sourcePosition) {
        // Moving down: shift cards between old and new position up
        await execute(
          `UPDATE cards SET position = position - 1
           WHERE list_id = :listId AND position > :sourcePos AND position <= :targetPos`,
          { listId: sourceListId, sourcePos: sourcePosition, targetPos: targetPosition }
        );
      } else if (targetPosition < sourcePosition) {
        // Moving up: shift cards between new and old position down
        await execute(
          `UPDATE cards SET position = position + 1
           WHERE list_id = :listId AND position >= :targetPos AND position < :sourcePos`,
          { listId: sourceListId, targetPos: targetPosition, sourcePos: sourcePosition }
        );
      }
    } else {
      // Cross-list move
      // Close gap in source list
      await execute(
        `UPDATE cards SET position = position - 1
         WHERE list_id = :listId AND position > :sourcePos`,
        { listId: sourceListId, sourcePos: sourcePosition }
      );
      // Make room in target list
      await execute(
        `UPDATE cards SET position = position + 1
         WHERE list_id = :listId AND position >= :targetPos`,
        { listId: targetListId, targetPos: targetPosition }
      );
    }

    // Move the card
    const now = new Date().toISOString();
    await execute(
      `UPDATE cards SET list_id = :listId, position = :position, updated_at = :updatedAt WHERE id = :id`,
      { listId: targetListId, position: targetPosition, updatedAt: now, id: cardId }
    );

    return NextResponse.json({
      data: {
        id: cardId,
        list_id: targetListId,
        position: targetPosition,
        updated_at: now,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'PATCH /api/v1/cards/[cardId]/move error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
