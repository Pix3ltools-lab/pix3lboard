import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/apiAuth';
import { getUserById } from '@/lib/auth/auth';
import { query, queryOne, execute } from '@/lib/db/turso';
import { getBoardRoleByCardId } from '@/lib/auth/permissions';
import { canView, canEditCards } from '@/lib/auth/permissions';
import { UpdateCardSchema } from '@/lib/validation/apiSchemas';
import { syncCardToFts, removeCardFromFts } from '@/lib/db/fts';
import { notifyAssignment } from '@/lib/db/notifications';
import logger from '../../../../../lib/logger'

export const dynamic = 'force-dynamic';

interface CardRow {
  id: string;
  list_id: string;
  title: string;
  description: string | null;
  position: number;
  type: string | null;
  prompt: string | null;
  rating: number | null;
  ai_tool: string | null;
  tags: string | null;
  due_date: string | null;
  links: string | null;
  responsible: string | null;
  responsible_user_id: string | null;
  responsible_user_name: string | null;
  responsible_user_email: string | null;
  job_number: string | null;
  severity: string | null;
  priority: string | null;
  effort: string | null;
  attendees: string | null;
  meeting_date: string | null;
  checklist: string | null;
  is_archived: number | null;
  thumbnail: string | null;
  wiki_page_id: string | null;
  created_at: string;
  updated_at: string;
}

interface CommentRow {
  id: string;
  card_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface AttachmentRow {
  id: string;
  card_id: string;
  user_id: string;
  filename: string;
  url: string;
  size: number;
  mime_type: string | null;
  created_at: string;
}

function formatCard(c: CardRow) {
  return {
    id: c.id,
    list_id: c.list_id,
    title: c.title,
    description: c.description,
    position: c.position,
    type: c.type,
    prompt: c.prompt,
    rating: c.rating,
    ai_tool: c.ai_tool,
    tags: c.tags ? JSON.parse(c.tags) : null,
    due_date: c.due_date,
    links: c.links ? JSON.parse(c.links) : null,
    responsible: c.responsible,
    responsible_user_id: c.responsible_user_id,
    responsible_user_name: c.responsible_user_name,
    responsible_user_email: c.responsible_user_email,
    job_number: c.job_number,
    severity: c.severity,
    priority: c.priority,
    effort: c.effort,
    attendees: c.attendees ? JSON.parse(c.attendees) : null,
    meeting_date: c.meeting_date,
    checklist: c.checklist ? JSON.parse(c.checklist) : null,
    is_archived: Boolean(c.is_archived),
    thumbnail: c.thumbnail,
    wiki_page_id: c.wiki_page_id,
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

/**
 * @swagger
 * /api/v1/cards/{cardId}:
 *   get:
 *     summary: Get card detail with comments and attachments
 *     tags: [Cards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Card with comments and attachments
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Card not found
 *   patch:
 *     summary: Update a card
 *     tags: [Cards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               position:
 *                 type: integer
 *               type:
 *                 type: string
 *                 nullable: true
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 nullable: true
 *               due_date:
 *                 type: string
 *                 nullable: true
 *               responsible_user_id:
 *                 type: string
 *                 nullable: true
 *               priority:
 *                 type: string
 *                 nullable: true
 *               severity:
 *                 type: string
 *                 nullable: true
 *               effort:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Card updated
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Card not found
 *   delete:
 *     summary: Delete a card
 *     tags: [Cards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Card deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Card not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cardId } = await params;
    const role = await getBoardRoleByCardId(userId, cardId);
    if (!canView(role)) {
      return NextResponse.json({ error: 'Card not found or access denied' }, { status: 404 });
    }

    const card = await queryOne<CardRow>(
      `SELECT c.*, u.name as responsible_user_name, u.email as responsible_user_email
       FROM cards c
       LEFT JOIN users u ON u.id = c.responsible_user_id
       WHERE c.id = :cardId`,
      { cardId }
    );
    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    // Get comments
    const comments = await query<CommentRow>(
      `SELECT c.*, u.name as user_name, u.email as user_email
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.card_id = :cardId
       ORDER BY c.created_at ASC`,
      { cardId }
    );

    // Get attachments
    const attachments = await query<AttachmentRow>(
      `SELECT * FROM attachments WHERE card_id = :cardId ORDER BY created_at DESC`,
      { cardId }
    );

    return NextResponse.json({
      data: {
        ...formatCard(card),
        comments: comments.map(c => ({
          id: c.id,
          card_id: c.card_id,
          user_id: c.user_id,
          user_name: c.user_name,
          user_email: c.user_email,
          content: c.content,
          created_at: c.created_at,
          updated_at: c.updated_at,
        })),
        attachments: attachments.map(a => ({
          id: a.id,
          card_id: a.card_id,
          user_id: a.user_id,
          filename: a.filename,
          url: a.url,
          size: a.size,
          mime_type: a.mime_type,
          created_at: a.created_at,
        })),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'GET /api/v1/cards/[cardId] error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cardId } = await params;
    const role = await getBoardRoleByCardId(userId, cardId);
    if (!canEditCards(role)) {
      return NextResponse.json({ error: 'Card not found or access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validation = UpdateCardSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: validation.error.issues },
        { status: 400 }
      );
    }

    // Get current card data for notification comparison
    const currentCard = await queryOne<{
      responsible_user_id: string | null;
      title: string;
      board_id: string;
    }>(`
      SELECT c.responsible_user_id, c.title, l.board_id
      FROM cards c
      JOIN lists l ON l.id = c.list_id
      WHERE c.id = :id
    `, { id: cardId });

    if (!currentCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    }

    const data = validation.data;
    const updateFields: string[] = [];
    const updateParams: Record<string, unknown> = { id: cardId };

    if (data.title !== undefined) {
      updateFields.push('title = :title');
      updateParams.title = data.title;
    }
    if (data.description !== undefined) {
      updateFields.push('description = :description');
      updateParams.description = data.description;
    }
    if (data.position !== undefined) {
      updateFields.push('position = :position');
      updateParams.position = data.position;
    }
    if (data.type !== undefined) {
      updateFields.push('type = :type');
      updateParams.type = data.type;
    }
    if (data.prompt !== undefined) {
      updateFields.push('prompt = :prompt');
      updateParams.prompt = data.prompt;
    }
    if (data.rating !== undefined) {
      updateFields.push('rating = :rating');
      updateParams.rating = data.rating;
    }
    if (data.ai_tool !== undefined) {
      updateFields.push('ai_tool = :aiTool');
      updateParams.aiTool = data.ai_tool;
    }
    if (data.tags !== undefined) {
      updateFields.push('tags = :tags');
      updateParams.tags = data.tags ? JSON.stringify(data.tags) : null;
    }
    if (data.due_date !== undefined) {
      updateFields.push('due_date = :dueDate');
      updateParams.dueDate = data.due_date;
    }
    if (data.links !== undefined) {
      updateFields.push('links = :links');
      updateParams.links = data.links ? JSON.stringify(data.links) : null;
    }
    if (data.responsible !== undefined) {
      updateFields.push('responsible = :responsible');
      updateParams.responsible = data.responsible;
    }
    if (data.responsible_user_id !== undefined) {
      updateFields.push('responsible_user_id = :responsibleUserId');
      updateParams.responsibleUserId = data.responsible_user_id;
    }
    if (data.job_number !== undefined) {
      updateFields.push('job_number = :jobNumber');
      updateParams.jobNumber = data.job_number;
    }
    if (data.severity !== undefined) {
      updateFields.push('severity = :severity');
      updateParams.severity = data.severity;
    }
    if (data.priority !== undefined) {
      updateFields.push('priority = :priority');
      updateParams.priority = data.priority;
    }
    if (data.effort !== undefined) {
      updateFields.push('effort = :effort');
      updateParams.effort = data.effort;
    }
    if (data.attendees !== undefined) {
      updateFields.push('attendees = :attendees');
      updateParams.attendees = data.attendees ? JSON.stringify(data.attendees) : null;
    }
    if (data.meeting_date !== undefined) {
      updateFields.push('meeting_date = :meetingDate');
      updateParams.meetingDate = data.meeting_date;
    }
    if (data.checklist !== undefined) {
      updateFields.push('checklist = :checklist');
      updateParams.checklist = data.checklist ? JSON.stringify(data.checklist) : null;
    }
    if (data.thumbnail !== undefined) {
      updateFields.push('thumbnail = :thumbnail');
      updateParams.thumbnail = data.thumbnail;
    }
    if (data.wiki_page_id !== undefined) {
      updateFields.push('wiki_page_id = :wikiPageId');
      updateParams.wikiPageId = data.wiki_page_id;
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updateFields.push('updated_at = :updatedAt');
    updateParams.updatedAt = new Date().toISOString();

    await execute(
      `UPDATE cards SET ${updateFields.join(', ')} WHERE id = :id`,
      updateParams
    );

    // Notify assignment if responsible changed
    if (
      data.responsible_user_id !== undefined &&
      data.responsible_user_id &&
      data.responsible_user_id !== userId &&
      data.responsible_user_id !== currentCard.responsible_user_id
    ) {
      try {
        const assigner = await getUserById(userId);
        await notifyAssignment({
          assignedUserId: data.responsible_user_id,
          cardId,
          cardTitle: data.title || currentCard.title,
          boardId: currentCard.board_id,
          assignerName: assigner?.name || assigner?.email || 'Someone',
        });
      } catch (notifyError) {
        logger.error({ err: notifyError }, 'Failed to send assignment notification');
      }
    }

    // Sync FTS if title or description changed
    if (data.title !== undefined || data.description !== undefined) {
      const updatedCard = await queryOne<{ title: string; description: string | null; is_archived: number }>(
        'SELECT title, description, is_archived FROM cards WHERE id = :id',
        { id: cardId }
      );
      if (updatedCard && !updatedCard.is_archived) {
        await syncCardToFts(cardId, updatedCard.title, updatedCard.description);
      }
    }

    // Fetch the updated card to return
    const updated = await queryOne<CardRow>(
      `SELECT c.*, u.name as responsible_user_name, u.email as responsible_user_email
       FROM cards c
       LEFT JOIN users u ON u.id = c.responsible_user_id
       WHERE c.id = :cardId`,
      { cardId }
    );

    return NextResponse.json({ data: formatCard(updated!) });
  } catch (error) {
    logger.error({ err: error }, 'PATCH /api/v1/cards/[cardId] error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cardId: string }> }
) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cardId } = await params;
    const role = await getBoardRoleByCardId(userId, cardId);
    if (!canEditCards(role)) {
      return NextResponse.json({ error: 'Card not found or access denied' }, { status: 403 });
    }

    await removeCardFromFts(cardId);
    await execute('DELETE FROM comments WHERE card_id = :id', { id: cardId });
    await execute('DELETE FROM cards WHERE id = :id', { id: cardId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'DELETE /api/v1/cards/[cardId] error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
