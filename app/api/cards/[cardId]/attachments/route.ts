import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verifyToken } from '@/lib/auth/auth';
import { query, queryOne, execute } from '@/lib/db/turso';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

interface Attachment {
  id: string;
  card_id: string;
  user_id: string;
  filename: string;
  file_url: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
}

// GET /api/cards/[cardId]/attachments - List attachments
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

    // Verify the card exists and belongs to the user
    const card = await queryOne<{ id: string }>(
      `SELECT cards.id FROM cards
       JOIN lists ON lists.id = cards.list_id
       JOIN boards ON boards.id = lists.board_id
       JOIN workspaces ON workspaces.id = boards.workspace_id
       WHERE cards.id = :cardId AND workspaces.user_id = :userId`,
      { cardId, userId: payload.userId }
    );

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Get attachments
    const attachments = await query<Attachment>(
      'SELECT * FROM attachments WHERE card_id = :cardId ORDER BY created_at DESC',
      { cardId }
    );

    return NextResponse.json({ attachments });
  } catch (error) {
    console.error('Get attachments error:', error);
    return NextResponse.json({ error: 'Failed to get attachments' }, { status: 500 });
  }
}

// POST /api/cards/[cardId]/attachments - Upload attachment
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
    const card = await queryOne<{ id: string }>(
      `SELECT cards.id FROM cards
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

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(`attachments/${cardId}/${nanoid()}-${file.name}`, file, {
      access: 'public',
      contentType: file.type,
    });

    // Save to database
    const id = nanoid();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO attachments (id, card_id, user_id, filename, file_url, file_size, mime_type, created_at)
       VALUES (:id, :cardId, :userId, :filename, :fileUrl, :fileSize, :mimeType, :createdAt)`,
      {
        id,
        cardId,
        userId: payload.userId,
        filename: file.name,
        fileUrl: blob.url,
        fileSize: file.size,
        mimeType: file.type || null,
        createdAt: now,
      }
    );

    return NextResponse.json({
      attachment: {
        id,
        card_id: cardId,
        user_id: payload.userId,
        filename: file.name,
        file_url: blob.url,
        file_size: file.size,
        mime_type: file.type || null,
        created_at: now,
      },
    });
  } catch (error) {
    console.error('Upload attachment error:', error);
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 });
  }
}
