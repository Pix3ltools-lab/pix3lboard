import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { queryOne, execute } from '@/lib/db/turso';

export const dynamic = 'force-dynamic';

interface Board {
  id: string;
}

// DELETE /api/boards/[boardId]/shares/[shareUserId] - Remove a share
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string; shareUserId: string }> }
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

    const { boardId, shareUserId } = await params;

    // Check if user is the owner of the board
    const board = await queryOne<Board>(
      `SELECT b.id FROM boards b
       JOIN workspaces w ON w.id = b.workspace_id
       WHERE b.id = :boardId AND w.user_id = :userId`,
      { boardId, userId: payload.userId }
    );

    if (!board) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 });
    }

    // Delete the share
    await execute(
      'DELETE FROM board_shares WHERE board_id = :boardId AND user_id = :shareUserId',
      { boardId, shareUserId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete share error:', error);
    return NextResponse.json({ error: 'Failed to delete share' }, { status: 500 });
  }
}
