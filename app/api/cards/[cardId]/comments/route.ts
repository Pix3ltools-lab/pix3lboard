import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { verifyToken, getUserById } from '@/lib/auth/auth';
import { query, queryOne, execute } from '@/lib/db/turso';

export const dynamic = 'force-dynamic';

interface CommentRow {
  id: string;
  card_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_email: string;
  user_name: string | null;
}

// Helper to verify user has access to a card (owner or shared)
async function verifyCardAccess(cardId: string, userId: string): Promise<boolean> {
  const access = await queryOne<{ id: string }>(`
    SELECT c.id FROM cards c
    JOIN lists l ON l.id = c.list_id
    JOIN boards b ON b.id = l.board_id
    JOIN workspaces w ON w.id = b.workspace_id
    LEFT JOIN board_shares bs ON bs.board_id = b.id AND bs.user_id = :userId
    WHERE c.id = :cardId
      AND (w.user_id = :userId OR bs.user_id IS NOT NULL)
  `, { cardId, userId });
  return access !== null;
}

// GET /api/cards/[cardId]/comments - Get all comments for a card
export async function GET(
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

    // Verify user has access to this card
    const hasAccess = await verifyCardAccess(cardId, payload.userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const comments = await query<CommentRow>(`
      SELECT c.*, u.email as user_email, u.name as user_name
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.card_id = :cardId
      ORDER BY c.created_at ASC
    `, { cardId });

    return NextResponse.json({
      comments: comments.map(c => ({
        id: c.id,
        cardId: c.card_id,
        userId: c.user_id,
        content: c.content,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        user: {
          email: c.user_email,
          name: c.user_name,
        },
      })),
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json({ error: 'Failed to get comments' }, { status: 500 });
  }
}

// POST /api/cards/[cardId]/comments - Add a comment
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

    // Verify user has access to this card
    const hasAccess = await verifyCardAccess(cardId, payload.userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { content } = await request.json();

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const user = await getUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const id = nanoid();
    const now = new Date().toISOString();

    await execute(`
      INSERT INTO comments (id, card_id, user_id, content, created_at, updated_at)
      VALUES (:id, :cardId, :userId, :content, :createdAt, :updatedAt)
    `, {
      id,
      cardId,
      userId: payload.userId,
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      comment: {
        id,
        cardId,
        userId: payload.userId,
        content: content.trim(),
        createdAt: now,
        updatedAt: now,
        user: {
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (error) {
    console.error('Add comment error:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
