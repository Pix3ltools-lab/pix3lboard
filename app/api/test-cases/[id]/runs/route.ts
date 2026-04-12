import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { verifyToken } from '@/lib/auth/auth';
import { query, queryOne, execute } from '@/lib/db/turso';
import { getBoardRole, canEditCards, canView } from '@/lib/auth/permissions';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/test-cases/[id]/runs
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

    const testCase = await queryOne<{ board_id: string }>(
      `SELECT board_id FROM test_cases WHERE id = :id`, { id }
    );
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
      runs: runs.map(r => ({
        id: r.id,
        testCaseId: r.test_case_id,
        result: r.result,
        notes: r.notes ?? undefined,
        executedBy: r.executed_by,
        executedAt: r.executed_at,
        user: { email: r.user_email, name: r.user_name },
      })),
    });
  } catch (error) {
    logger.error({ err: error }, 'Get test runs error');
    return NextResponse.json({ error: 'Failed to get test runs' }, { status: 500 });
  }
}

// POST /api/test-cases/[id]/runs
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id } = await params;

    const testCase = await queryOne<{ board_id: string; requirement_id: string | null }>(
      `SELECT board_id, requirement_id FROM test_cases WHERE id = :id`, { id }
    );
    if (!testCase) return NextResponse.json({ error: 'Test case not found' }, { status: 404 });

    const role = await getBoardRole(payload.userId, testCase.board_id);
    if (!canEditCards(role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    const { result, notes } = await request.json();
    if (!['passed', 'failed', 'pending'].includes(result)) {
      return NextResponse.json({ error: 'result must be passed, failed, or pending' }, { status: 400 });
    }

    const runId = nanoid();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO test_runs (id, test_case_id, result, notes, executed_by, executed_at)
       VALUES (:id, :testCaseId, :result, :notes, :executedBy, :executedAt)`,
      { id: runId, testCaseId: id, result, notes: notes?.trim() ?? null, executedBy: payload.userId, executedAt: now }
    );

    // Auto-update requirement status if this test case is linked to a requirement
    if (testCase.requirement_id) {
      await updateRequirementStatus(testCase.requirement_id);
    }

    return NextResponse.json({
      run: {
        id: runId,
        testCaseId: id,
        result,
        notes: notes?.trim() ?? undefined,
        executedBy: payload.userId,
        executedAt: now,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, 'Create test run error');
    return NextResponse.json({ error: 'Failed to create test run' }, { status: 500 });
  }
}

// Update requirement status based on all linked test case results
async function updateRequirementStatus(requirementId: string): Promise<void> {
  const testCases = await query<{ id: string; latest_result: string | null }>(
    `SELECT tc.id,
       (SELECT tr.result FROM test_runs tr WHERE tr.test_case_id = tc.id ORDER BY tr.executed_at DESC LIMIT 1) as latest_result
     FROM test_cases tc WHERE tc.requirement_id = :requirementId`,
    { requirementId }
  );

  if (testCases.length === 0) return;

  const results = testCases.map(tc => tc.latest_result);
  const allPassed = results.every(r => r === 'passed');
  const anyFailed = results.some(r => r === 'failed');

  let newStatus: string | null = null;
  if (allPassed) newStatus = 'verified';
  else if (anyFailed) newStatus = 'implemented';

  if (newStatus) {
    await execute(
      `UPDATE requirements SET status = :status, updated_at = :updatedAt WHERE id = :id`,
      { status: newStatus, updatedAt: new Date().toISOString(), id: requirementId }
    );
  }
}
