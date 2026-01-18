import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { query, queryOne, execute } from '@/lib/db/turso';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

interface BoardShare {
  id: string;
  board_id: string;
  user_id: string;
  role: 'owner' | 'viewer';
  created_at: string;
  user_email?: string;
  user_name?: string;
}

interface Board {
  id: string;
}

// GET /api/boards/[boardId]/shares - List shares for a board
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
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

    const { boardId } = await params;

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

    // Get all shares with user info
    const shares = await query<BoardShare>(
      `SELECT bs.*, u.email as user_email, u.name as user_name
       FROM board_shares bs
       JOIN users u ON u.id = bs.user_id
       WHERE bs.board_id = :boardId
       ORDER BY bs.created_at DESC`,
      { boardId }
    );

    return NextResponse.json({ shares });
  } catch (error) {
    console.error('Get shares error:', error);
    return NextResponse.json({ error: 'Failed to get shares' }, { status: 500 });
  }
}

// POST /api/boards/[boardId]/shares - Add a share
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
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

    const { boardId } = await params;
    const { email, role = 'viewer' } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (role !== 'owner' && role !== 'viewer') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

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

    // Find the user to share with
    const targetUser = await queryOne<{ id: string; email: string; name: string }>(
      'SELECT id, email, name FROM users WHERE email = :email',
      { email: email.toLowerCase() }
    );

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Can't share with yourself
    if (targetUser.id === payload.userId) {
      return NextResponse.json({ error: 'Cannot share with yourself' }, { status: 400 });
    }

    // Check if already shared
    const existingShare = await queryOne<{ id: string }>(
      'SELECT id FROM board_shares WHERE board_id = :boardId AND user_id = :userId',
      { boardId, userId: targetUser.id }
    );

    if (existingShare) {
      // Update existing share role
      await execute(
        'UPDATE board_shares SET role = :role WHERE id = :id',
        { role, id: existingShare.id }
      );

      return NextResponse.json({
        share: {
          id: existingShare.id,
          board_id: boardId,
          user_id: targetUser.id,
          role,
          user_email: targetUser.email,
          user_name: targetUser.name,
        },
        updated: true,
      });
    }

    // Create new share
    const id = nanoid();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO board_shares (id, board_id, user_id, role, created_at)
       VALUES (:id, :boardId, :userId, :role, :createdAt)`,
      {
        id,
        boardId,
        userId: targetUser.id,
        role,
        createdAt: now,
      }
    );

    return NextResponse.json({
      share: {
        id,
        board_id: boardId,
        user_id: targetUser.id,
        role,
        created_at: now,
        user_email: targetUser.email,
        user_name: targetUser.name,
      },
    });
  } catch (error) {
    console.error('Add share error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to add share: ${errorMessage}` }, { status: 500 });
  }
}
