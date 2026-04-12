import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { query, queryOne, execute } from '@/lib/db/turso';
import { getBoardRole, canEditCards, canView } from '@/lib/auth/permissions';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/test-cases/[id]
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

    const testCase = await queryOne<{
      id: string; board_id: string; code: string; title: string;
      description: string | null; type: string; requirement_id: string | null;
      card_id: string | null; created_by: string; created_at: string; updated_at: string;
    }>(`SELECT * FROM test_cases WHERE id = :id`, { id });

    if (!testCase) return NextResponse.json({ error: 'Test case not found' }, { status: 404 });

    const role = await getBoardRole(payload.userId, testCase.board_id);
    if (!canView(role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const runs = await query<{
      id: string; test_case_id: string; result: string;
      notes: string | null; executed_by: string; executed_at: string;
      user_email: string; user_name: string | null;
    }>(
      `SELECT tr.*, u.email as user_email, u.name as user_name
       FROM test_runs tr JOIN users u ON u.id = tr.executed_by
       WHERE tr.test_case_id = :id ORDER BY tr.executed_at DESC`,
      { id }
    );

    return NextResponse.json({
      testCase: {
        id: testCase.id,
        boardId: testCase.board_id,
        code: testCase.code,
        title: testCase.title,
        description: testCase.description ?? undefined,
        type: testCase.type,
        requirementId: testCase.requirement_id ?? undefined,
        cardId: testCase.card_id ?? undefined,
        createdBy: testCase.created_by,
        createdAt: testCase.created_at,
        updatedAt: testCase.updated_at,
        latestResult: runs[0]?.result ?? undefined,
        latestRun: runs[0] ? {
          id: runs[0].id,
          testCaseId: runs[0].test_case_id,
          result: runs[0].result,
          notes: runs[0].notes ?? undefined,
          executedBy: runs[0].executed_by,
          executedAt: runs[0].executed_at,
        } : undefined,
        runs: runs.map(r => ({
          id: r.id,
          testCaseId: r.test_case_id,
          result: r.result,
          notes: r.notes ?? undefined,
          executedBy: r.executed_by,
          executedAt: r.executed_at,
          user: { email: r.user_email, name: r.user_name },
        })),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Get test case error');
    return NextResponse.json({ error: 'Failed to get test case' }, { status: 500 });
  }
}

// PATCH /api/test-cases/[id]
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

    const testCase = await queryOne<{ board_id: string }>(
      `SELECT board_id FROM test_cases WHERE id = :id`, { id }
    );
    if (!testCase) return NextResponse.json({ error: 'Test case not found' }, { status: 404 });

    const role = await getBoardRole(payload.userId, testCase.board_id);
    if (!canEditCards(role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const body = await request.json();
    const { title, description, type, requirementId, cardId } = body;

    const fields: string[] = [];
    const args: Record<string, unknown> = { id };

    if (title !== undefined) { fields.push('title = :title'); args.title = title.trim(); }
    if (description !== undefined) { fields.push('description = :description'); args.description = description?.trim() ?? null; }
    if (type !== undefined) { fields.push('type = :type'); args.type = type; }
    if (requirementId !== undefined) { fields.push('requirement_id = :requirementId'); args.requirementId = requirementId ?? null; }
    // cardId: null means unlink, undefined means don't change
    if ('cardId' in body) { fields.push('card_id = :cardId'); args.cardId = cardId ?? null; }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const now = new Date().toISOString();
    fields.push('updated_at = :updatedAt');
    args.updatedAt = now;

    await execute(`UPDATE test_cases SET ${fields.join(', ')} WHERE id = :id`, args);

    const updated = await queryOne<{
      id: string; board_id: string; code: string; title: string;
      description: string | null; type: string; requirement_id: string | null;
      card_id: string | null; created_by: string; created_at: string; updated_at: string;
    }>(`SELECT * FROM test_cases WHERE id = :id`, { id });

    return NextResponse.json({
      testCase: {
        id: updated!.id,
        boardId: updated!.board_id,
        code: updated!.code,
        title: updated!.title,
        description: updated!.description ?? undefined,
        type: updated!.type,
        requirementId: updated!.requirement_id ?? undefined,
        cardId: updated!.card_id ?? undefined,
        createdBy: updated!.created_by,
        createdAt: updated!.created_at,
        updatedAt: updated!.updated_at,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Update test case error');
    return NextResponse.json({ error: 'Failed to update test case' }, { status: 500 });
  }
}

// DELETE /api/test-cases/[id]
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

    const testCase = await queryOne<{ board_id: string }>(
      `SELECT board_id FROM test_cases WHERE id = :id`, { id }
    );
    if (!testCase) return NextResponse.json({ error: 'Test case not found' }, { status: 404 });

    const role = await getBoardRole(payload.userId, testCase.board_id);
    if (!canEditCards(role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    await execute(`DELETE FROM test_cases WHERE id = :id`, { id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, 'Delete test case error');
    return NextResponse.json({ error: 'Failed to delete test case' }, { status: 500 });
  }
}
