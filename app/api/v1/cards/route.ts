import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/apiAuth';
import { getUserById } from '@/lib/auth/auth';
import { queryOne, execute } from '@/lib/db/turso';
import { getBoardRoleByListId } from '@/lib/auth/permissions';
import { canEditCards } from '@/lib/auth/permissions';
import { CreateCardSchema } from '@/lib/validation/apiSchemas';
import { generateId } from '@/lib/utils/id';
import { syncCardToFts } from '@/lib/db/fts';
import { notifyAssignment } from '@/lib/db/notifications';

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/v1/cards:
 *   post:
 *     summary: Create a new card
 *     tags: [Cards]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [list_id, title]
 *             properties:
 *               list_id:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               position:
 *                 type: integer
 *               type:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               due_date:
 *                 type: string
 *               responsible_user_id:
 *                 type: string
 *               priority:
 *                 type: string
 *               severity:
 *                 type: string
 *               effort:
 *                 type: string
 *     responses:
 *       201:
 *         description: Card created
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = CreateCardSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;
    const role = await getBoardRoleByListId(userId, data.list_id);
    if (!canEditCards(role)) {
      return NextResponse.json({ error: 'List not found or access denied' }, { status: 403 });
    }

    // Auto-calculate position if not provided
    let position = data.position;
    if (position === undefined) {
      const maxPos = await queryOne<{ max_pos: number | null }>(
        'SELECT MAX(position) as max_pos FROM cards WHERE list_id = :listId',
        { listId: data.list_id }
      );
      position = (maxPos?.max_pos ?? -1) + 1;
    }

    const id = generateId();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO cards (id, list_id, title, description, position, type, prompt, rating, ai_tool, tags, due_date, links, responsible, responsible_user_id, job_number, severity, priority, effort, attendees, meeting_date, checklist, is_archived, thumbnail, wiki_page_id, created_at, updated_at)
       VALUES (:id, :listId, :title, :description, :position, :type, :prompt, :rating, :aiTool, :tags, :dueDate, :links, :responsible, :responsibleUserId, :jobNumber, :severity, :priority, :effort, :attendees, :meetingDate, :checklist, 0, :thumbnail, :wikiPageId, :createdAt, :updatedAt)`,
      {
        id,
        listId: data.list_id,
        title: data.title,
        description: data.description || null,
        position,
        type: data.type || null,
        prompt: data.prompt || null,
        rating: data.rating || null,
        aiTool: data.ai_tool || null,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        dueDate: data.due_date || null,
        links: data.links ? JSON.stringify(data.links) : null,
        responsible: data.responsible || null,
        responsibleUserId: data.responsible_user_id || null,
        jobNumber: data.job_number || null,
        severity: data.severity || null,
        priority: data.priority || null,
        effort: data.effort || null,
        attendees: data.attendees ? JSON.stringify(data.attendees) : null,
        meetingDate: data.meeting_date || null,
        checklist: data.checklist ? JSON.stringify(data.checklist) : null,
        thumbnail: data.thumbnail || null,
        wikiPageId: data.wiki_page_id || null,
        createdAt: now,
        updatedAt: now,
      }
    );

    // Sync to FTS
    await syncCardToFts(id, data.title, data.description || null);

    // Notify assignment if assigning to another user
    if (data.responsible_user_id && data.responsible_user_id !== userId) {
      try {
        const listInfo = await queryOne<{ board_id: string }>(
          'SELECT board_id FROM lists WHERE id = :listId',
          { listId: data.list_id }
        );
        const assigner = await getUserById(userId);
        if (listInfo) {
          await notifyAssignment({
            assignedUserId: data.responsible_user_id,
            cardId: id,
            cardTitle: data.title,
            boardId: listInfo.board_id,
            assignerName: assigner?.name || assigner?.email || 'Someone',
          });
        }
      } catch (notifyError) {
        console.error('Failed to send assignment notification:', notifyError);
      }
    }

    return NextResponse.json({
      data: {
        id,
        list_id: data.list_id,
        title: data.title,
        description: data.description || null,
        position,
        type: data.type || null,
        prompt: data.prompt || null,
        rating: data.rating || null,
        ai_tool: data.ai_tool || null,
        tags: data.tags || null,
        due_date: data.due_date || null,
        links: data.links || null,
        responsible: data.responsible || null,
        responsible_user_id: data.responsible_user_id || null,
        job_number: data.job_number || null,
        severity: data.severity || null,
        priority: data.priority || null,
        effort: data.effort || null,
        attendees: data.attendees || null,
        meeting_date: data.meeting_date || null,
        checklist: data.checklist || null,
        is_archived: false,
        thumbnail: data.thumbnail || null,
        wiki_page_id: data.wiki_page_id || null,
        created_at: now,
        updated_at: now,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/v1/cards error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
