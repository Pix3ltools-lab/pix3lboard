import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/apiAuth';
import { queryOne, execute } from '@/lib/db/turso';
import { getBoardRoleByCardId } from '@/lib/auth/permissions';
import { canEditCards } from '@/lib/auth/permissions';
import { syncCardToFts, removeCardFromFts } from '@/lib/db/fts';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/cards/{cardId}/archive:
 *   post:
 *     summary: Archive or unarchive a card
 *     tags: [Cards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: action
 *         required: true
 *         schema:
 *           type: string
 *           enum: [archive, unarchive]
 *     responses:
 *       200:
 *         description: Card archived/unarchived
 *       400:
 *         description: Invalid action parameter
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Card not found
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cardId } = await params;
    const role = await getBoardRoleByCardId(userId, cardId);
    if (!canEditCards(role)) {
      return NextResponse.json({ error: 'Card not found or access denied' }, { status: 403 });
    }

    const action = request.nextUrl.searchParams.get('action');
    if (action !== 'archive' && action !== 'unarchive') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "archive" or "unarchive"' },
        { status: 400 }
      );
    }

    const card = await queryOne<{ title: string; description: string | null; is_archived: number }>(
      'SELECT title, description, is_archived FROM cards WHERE id = :cardId',
      { cardId }
    );
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const isArchive = action === 'archive';
    const now = new Date().toISOString();

    await execute(
      'UPDATE cards SET is_archived = :isArchived, updated_at = :updatedAt WHERE id = :id',
      { isArchived: isArchive ? 1 : 0, updatedAt: now, id: cardId }
    );

    if (isArchive) {
      await removeCardFromFts(cardId);
    } else {
      await syncCardToFts(cardId, card.title, card.description);
    }

    return NextResponse.json({
      data: {
        id: cardId,
        is_archived: isArchive,
        updated_at: now,
      },
    });
  } catch (error) {
    console.error('POST /api/v1/cards/[cardId]/archive error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
