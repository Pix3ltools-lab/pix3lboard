import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { queryOne, execute } from '@/lib/db/turso';
import { getBoardRole, canEditCards } from '@/lib/auth/permissions';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// DELETE /api/requirements/[id]/cards/[cardId] - Unlink a card from a requirement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id, cardId } = await params;

    const requirement = await queryOne<{ board_id: string }>(
      `SELECT board_id FROM requirements WHERE id = :id`, { id }
    );
    if (!requirement) return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });

    const role = await getBoardRole(payload.userId, requirement.board_id);
    if (!canEditCards(role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    await execute(
      `DELETE FROM requirement_cards WHERE requirement_id = :id AND card_id = :cardId`,
      { id, cardId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Unlink card from requirement error');
    return NextResponse.json({ error: 'Failed to unlink card' }, { status: 500 });
  }
}
