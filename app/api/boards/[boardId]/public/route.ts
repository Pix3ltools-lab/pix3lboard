import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { query, execute } from '@/lib/db/turso';

export const dynamic = 'force-dynamic';

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId || null;
}

// POST - Toggle board public/private
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { boardId } = await params;
    const { isPublic } = await request.json();

    // Verify user owns this board
    const boards = await query<{ id: string }>(
      `SELECT boards.id FROM boards
       JOIN workspaces ON workspaces.id = boards.workspace_id
       WHERE boards.id = :boardId AND workspaces.user_id = :userId`,
      { boardId, userId }
    );

    if (boards.length === 0) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 });
    }

    // Update public status
    await execute(
      'UPDATE boards SET is_public = :isPublic, updated_at = :updatedAt WHERE id = :boardId',
      {
        boardId,
        isPublic: isPublic ? 1 : 0,
        updatedAt: new Date().toISOString(),
      }
    );

    return NextResponse.json({ success: true, isPublic });
  } catch (error) {
    console.error('Toggle public error:', error);
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }
}
