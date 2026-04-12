import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { query, queryOne, execute } from '@/lib/db/turso';
import { getBoardRole, canEditCards, canView } from '@/lib/auth/permissions';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/requirements/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id } = await params;

    const requirement = await queryOne<{
      id: string; board_id: string; code: string; title: string;
      description: string | null; priority: string; status: string;
      created_by: string; created_at: string; updated_at: string;
    }>(`SELECT * FROM requirements WHERE id = :id`, { id });

    if (!requirement) return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });

    const role = await getBoardRole(payload.userId, requirement.board_id);
    if (!canView(role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const linkedCards = await query<{ card_id: string }>(
      `SELECT card_id FROM requirement_cards WHERE requirement_id = :id`, { id }
    );

    const testCases = await query<{
      id: string; board_id: string; code: string; title: string;
      description: string | null; type: string; requirement_id: string | null;
      card_id: string | null; created_by: string; created_at: string; updated_at: string;
      latest_result: string | null;
    }>(
      `SELECT tc.*,
         (SELECT tr.result FROM test_runs tr WHERE tr.test_case_id = tc.id ORDER BY tr.executed_at DESC LIMIT 1) as latest_result
       FROM test_cases tc WHERE tc.requirement_id = :id ORDER BY tc.code ASC`,
      { id }
    );

    return NextResponse.json({
      requirement: {
        id: requirement.id,
        boardId: requirement.board_id,
        code: requirement.code,
        title: requirement.title,
        description: requirement.description ?? undefined,
        priority: requirement.priority,
        status: requirement.status,
        createdBy: requirement.created_by,
        createdAt: requirement.created_at,
        updatedAt: requirement.updated_at,
        linkedCardIds: linkedCards.map(c => c.card_id),
        testCases: testCases.map(tc => ({
          id: tc.id,
          boardId: tc.board_id,
          code: tc.code,
          title: tc.title,
          description: tc.description ?? undefined,
          type: tc.type,
          requirementId: tc.requirement_id ?? undefined,
          cardId: tc.card_id ?? undefined,
          createdBy: tc.created_by,
          createdAt: tc.created_at,
          updatedAt: tc.updated_at,
          latestResult: tc.latest_result ?? undefined,
        })),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Get requirement error');
    return NextResponse.json({ error: 'Failed to get requirement' }, { status: 500 });
  }
}

// PATCH /api/requirements/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id } = await params;

    const requirement = await queryOne<{ board_id: string }>(
      `SELECT board_id FROM requirements WHERE id = :id`, { id }
    );
    if (!requirement) return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });

    const role = await getBoardRole(payload.userId, requirement.board_id);
    if (!canEditCards(role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const body = await request.json();
    const { title, description, priority, status } = body;

    const fields: string[] = [];
    const args: Record<string, unknown> = { id };

    if (title !== undefined) { fields.push('title = :title'); args.title = title.trim(); }
    if (description !== undefined) { fields.push('description = :description'); args.description = description?.trim() ?? null; }
    if (priority !== undefined) { fields.push('priority = :priority'); args.priority = priority; }
    if (status !== undefined) { fields.push('status = :status'); args.status = status; }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const now = new Date().toISOString();
    fields.push('updated_at = :updatedAt');
    args.updatedAt = now;

    await execute(`UPDATE requirements SET ${fields.join(', ')} WHERE id = :id`, args);

    const updated = await queryOne<{
      id: string; board_id: string; code: string; title: string;
      description: string | null; priority: string; status: string;
      created_by: string; created_at: string; updated_at: string;
    }>(`SELECT * FROM requirements WHERE id = :id`, { id });

    return NextResponse.json({
      requirement: {
        id: updated!.id,
        boardId: updated!.board_id,
        code: updated!.code,
        title: updated!.title,
        description: updated!.description ?? undefined,
        priority: updated!.priority,
        status: updated!.status,
        createdBy: updated!.created_by,
        createdAt: updated!.created_at,
        updatedAt: updated!.updated_at,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Update requirement error');
    return NextResponse.json({ error: 'Failed to update requirement' }, { status: 500 });
  }
}

// DELETE /api/requirements/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id } = await params;

    const requirement = await queryOne<{ board_id: string }>(
      `SELECT board_id FROM requirements WHERE id = :id`, { id }
    );
    if (!requirement) return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });

    const role = await getBoardRole(payload.userId, requirement.board_id);
    if (!canEditCards(role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    await execute(`DELETE FROM requirements WHERE id = :id`, { id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Delete requirement error');
    return NextResponse.json({ error: 'Failed to delete requirement' }, { status: 500 });
  }
}
