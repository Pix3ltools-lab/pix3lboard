import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@/lib/storage/blob';
import { verifyToken } from '@/lib/auth/auth';
import { queryOne, execute } from '@/lib/db/turso';
import { ALLOWED_IMAGE_MIME_TYPES, verifyMagicBytes } from '@/lib/validation/mimeValidation';
import logger from '../../../../../lib/logger'

export const dynamic = 'force-dynamic';

// POST /api/cards/[cardId]/thumbnail - Upload thumbnail image
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

    // Verify the card exists and belongs to the user
    const card = await queryOne<{ id: string; thumbnail: string | null }>(
      `SELECT cards.id, cards.thumbnail FROM cards
       JOIN lists ON lists.id = cards.list_id
       JOIN boards ON boards.id = lists.board_id
       JOIN workspaces ON workspaces.id = boards.workspace_id
       WHERE cards.id = :cardId AND workspaces.user_id = :userId`,
      { cardId, userId: payload.userId }
    );

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Get the file from form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate declared MIME type against image whitelist
    if (!file.type || !(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      return NextResponse.json({
        error: 'File must be an image (JPG, PNG, GIF, or WebP).'
      }, { status: 400 });
    }

    // Verify actual file content matches declared MIME type using magic bytes.
    // Prevents a spoofed Content-Type bypass (e.g. .php renamed to .jpg).
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!verifyMagicBytes(header, file.type)) {
      return NextResponse.json({
        error: 'File content does not match the declared file type.'
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // Delete old thumbnail if exists
    if (card.thumbnail) {
      try {
        await del(card.thumbnail);
      } catch (err) {
        logger.error({ err: err }, 'Failed to delete old thumbnail');
      }
    }

    // Upload to Vercel Blob
    const blob = await put(`thumbnails/${cardId}-${Date.now()}`, file, {
      access: 'public',
      contentType: file.type,
    });

    // Update card with new thumbnail URL
    const now = new Date().toISOString();
    await execute(
      'UPDATE cards SET thumbnail = :thumbnail, updated_at = :updatedAt WHERE id = :cardId',
      { thumbnail: blob.url, updatedAt: now, cardId }
    );

    return NextResponse.json({
      success: true,
      thumbnail: blob.url,
    });
  } catch (error) {
    logger.error({ err: error }, 'Upload thumbnail error');
    return NextResponse.json({ error: 'Failed to upload thumbnail' }, { status: 500 });
  }
}

// DELETE /api/cards/[cardId]/thumbnail - Remove thumbnail
export async function DELETE(
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

    // Verify the card exists and belongs to the user
    const card = await queryOne<{ id: string; thumbnail: string | null }>(
      `SELECT cards.id, cards.thumbnail FROM cards
       JOIN lists ON lists.id = cards.list_id
       JOIN boards ON boards.id = lists.board_id
       JOIN workspaces ON workspaces.id = boards.workspace_id
       WHERE cards.id = :cardId AND workspaces.user_id = :userId`,
      { cardId, userId: payload.userId }
    );

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Delete from Vercel Blob if exists
    if (card.thumbnail) {
      try {
        await del(card.thumbnail);
      } catch (err) {
        logger.error({ err: err }, 'Failed to delete thumbnail from blob');
      }
    }

    // Update card to remove thumbnail
    const now = new Date().toISOString();
    await execute(
      'UPDATE cards SET thumbnail = NULL, updated_at = :updatedAt WHERE id = :cardId',
      { updatedAt: now, cardId }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Delete thumbnail error');
    return NextResponse.json({ error: 'Failed to delete thumbnail' }, { status: 500 });
  }
}
