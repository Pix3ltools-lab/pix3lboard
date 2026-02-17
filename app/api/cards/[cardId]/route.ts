import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { queryOne, execute } from '@/lib/db/turso';
import logger from '../../../../lib/logger'

export const dynamic = 'force-dynamic';

// DELETE /api/cards/[cardId] - Permanently delete a card
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
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

    const { cardId } = await params;

    // Verify the card exists and belongs to the user
    const card = await queryOne<{ id: string }>(
      `SELECT cards.id FROM cards
       JOIN lists ON lists.id = cards.list_id
       JOIN boards ON boards.id = lists.board_id
       JOIN workspaces ON workspaces.id = boards.workspace_id
       WHERE cards.id = :cardId AND workspaces.user_id = :userId`,
      { cardId, userId: payload.userId }
    );

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Delete the card (comments will be cascade deleted)
    await execute('DELETE FROM cards WHERE id = :cardId', { cardId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Delete card error');
    return NextResponse.json({ error: 'Failed to delete card' }, { status: 500 });
  }
}
