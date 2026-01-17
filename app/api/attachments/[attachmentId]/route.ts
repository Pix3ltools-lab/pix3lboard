import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { verifyToken } from '@/lib/auth/auth';
import { queryOne, execute } from '@/lib/db/turso';

export const dynamic = 'force-dynamic';

interface AttachmentRow {
  id: string;
  card_id: string;
  user_id: string;
  file_url: string;
}

// DELETE /api/attachments/[attachmentId] - Delete attachment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> }
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

    const { attachmentId } = await params;

    // Get the attachment and verify ownership
    const attachment = await queryOne<AttachmentRow>(
      `SELECT a.id, a.card_id, a.user_id, a.file_url FROM attachments a
       JOIN cards ON cards.id = a.card_id
       JOIN lists ON lists.id = cards.list_id
       JOIN boards ON boards.id = lists.board_id
       JOIN workspaces ON workspaces.id = boards.workspace_id
       WHERE a.id = :attachmentId AND workspaces.user_id = :userId`,
      { attachmentId, userId: payload.userId }
    );

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Delete from Vercel Blob
    try {
      await del(attachment.file_url);
    } catch (err) {
      console.error('Failed to delete file from blob:', err);
      // Continue anyway to clean up database
    }

    // Delete from database
    await execute('DELETE FROM attachments WHERE id = :attachmentId', { attachmentId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 });
  }
}
