import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { queryOne, execute } from '@/lib/db/turso';
import { getBoardRole, canEditCards } from '@/lib/auth/permissions';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST /api/requirements/[id]/cards - Link a card to a requirement
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id } = await params;

    const requirement = await queryOne<{ board_id: string }>(
      `SELECT board_id FROM requirements WHERE id = :id`, { id }
    );
    if (!requirement) return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });

    const role = await getBoardRole(payload.userId, requirement.board_id);
    if (!canEditCards(role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const { cardId } = await request.json();
    if (!cardId) return NextResponse.json({ error: 'cardId is required' }, { status: 400 });

    // Verify card exists on the same board
    const card = await queryOne<{ id: string }>(
      `SELECT c.id FROM cards c JOIN lists l ON l.id = c.list_id WHERE c.id = :cardId AND l.board_id = :boardId`,
      { cardId, boardId: requirement.board_id }
    );
    if (!card) return NextResponse.json({ error: 'Card not found on this board' }, { status: 404 });

    const now = new Date().toISOString();
    await execute(
      `INSERT OR IGNORE INTO requirement_cards (requirement_id, card_id, created_at) VALUES (:requirementId, :cardId, :createdAt)`,
      { requirementId: id, cardId, createdAt: now }
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, 'Link card to requirement error');
    return NextResponse.json({ error: 'Failed to link card' }, { status: 500 });
  }
}
