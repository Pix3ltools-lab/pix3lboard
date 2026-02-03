import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { queryOne, execute } from '@/lib/db/turso';
import { logActivity } from '@/lib/db/activityLog';
import { syncCardToFts, removeCardFromFts } from '@/lib/db/fts';

export const dynamic = 'force-dynamic';

// POST /api/cards/[cardId]/archive - Archive or unarchive a card
export async function POST(
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
    const { archive } = await request.json();

    if (typeof archive !== 'boolean') {
      return NextResponse.json({ error: 'archive must be a boolean' }, { status: 400 });
    }

    // Verify the card exists and belongs to the user
    const card = await queryOne<{ id: string; title: string; description: string | null; is_archived: number | null }>(
      `SELECT cards.id, cards.title, cards.description, cards.is_archived FROM cards
       JOIN lists ON lists.id = cards.list_id
       JOIN boards ON boards.id = lists.board_id
       JOIN workspaces ON workspaces.id = boards.workspace_id
       WHERE cards.id = :cardId AND workspaces.user_id = :userId`,
      { cardId, userId: payload.userId }
    );

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    await execute(
      'UPDATE cards SET is_archived = :isArchived, updated_at = :updatedAt WHERE id = :cardId',
      { isArchived: archive ? 1 : 0, updatedAt: now, cardId }
    );

    // Update FTS index
    if (archive) {
      // Remove from FTS when archiving
      await removeCardFromFts(cardId);
    } else {
      // Add back to FTS when restoring
      await syncCardToFts(cardId, card.title, card.description);
    }

    // Log activity
    await logActivity({
      entityType: 'card',
      entityId: cardId,
      userId: payload.userId,
      action: archive ? 'archived' : 'restored',
    });

    return NextResponse.json({
      success: true,
      isArchived: archive,
    });
  } catch (error) {
    console.error('Archive card error:', error);
    return NextResponse.json({ error: 'Failed to archive card' }, { status: 500 });
  }
}
