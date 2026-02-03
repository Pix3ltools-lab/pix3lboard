import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { verifyToken, getUserById } from '@/lib/auth/auth';
import { query, execute, queryOne } from '@/lib/db/turso';
import { getBoardRoleByCardId, canView, canComment } from '@/lib/auth/permissions';
import { logActivity } from '@/lib/db/activityLog';
import { notifyComment } from '@/lib/db/notifications';
import { syncCommentToFts } from '@/lib/db/fts';

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

// Helper to verify user has view access to a card
async function verifyCardViewAccess(cardId: string, userId: string): Promise<boolean> {
  const role = await getBoardRoleByCardId(userId, cardId);
  return canView(role);
}

// Helper to verify user can comment on a card
async function verifyCardCommentAccess(cardId: string, userId: string): Promise<boolean> {
  const role = await getBoardRoleByCardId(userId, cardId);
  return canComment(role);
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

    // Verify user has view access to this card
    const hasAccess = await verifyCardViewAccess(cardId, payload.userId);
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

    // Verify user has comment access to this card
    const hasAccess = await verifyCardCommentAccess(cardId, payload.userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied. You need commenter or higher role to add comments.' }, { status: 403 });
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

    // Sync to FTS index
    await syncCommentToFts(id, cardId, content.trim());

    // Log activity
    await logActivity({
      entityType: 'card',
      entityId: cardId,
      userId: payload.userId,
      action: 'commented',
      details: { commentId: id },
    });

    // Notify responsible user if exists and is not the commenter
    try {
      const cardInfo = await queryOne<{
        responsible_user_id: string | null;
        title: string;
        board_id: string;
      }>(`
        SELECT c.responsible_user_id, c.title, l.board_id
        FROM cards c
        JOIN lists l ON l.id = c.list_id
        WHERE c.id = :cardId
      `, { cardId });

      if (
        cardInfo &&
        cardInfo.responsible_user_id &&
        cardInfo.responsible_user_id !== payload.userId
      ) {
        await notifyComment({
          responsibleUserId: cardInfo.responsible_user_id,
          cardId,
          cardTitle: cardInfo.title,
          boardId: cardInfo.board_id,
          commenterName: user.name || user.email,
          commentSnippet: content.trim(),
        });
      }
    } catch (notifyError) {
      console.error('Failed to send comment notification:', notifyError);
      // Don't fail the request if notification fails
    }

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
