import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById } from '@/lib/auth/auth';
import { queryOne, execute } from '@/lib/db/turso';

export const dynamic = 'force-dynamic';

interface CommentRow {
  id: string;
  user_id: string;
}

// DELETE /api/comments/[commentId] - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
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

    const { commentId } = await params;

    // Get the comment to check ownership
    const comment = await queryOne<CommentRow>(
      'SELECT id, user_id FROM comments WHERE id = :id',
      { id: commentId }
    );

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    // Check if user is owner or admin
    const user = await getUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (comment.user_id !== payload.userId && !user.is_admin) {
      return NextResponse.json({ error: 'Not authorized to delete this comment' }, { status: 403 });
    }

    await execute('DELETE FROM comments WHERE id = :id', { id: commentId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
