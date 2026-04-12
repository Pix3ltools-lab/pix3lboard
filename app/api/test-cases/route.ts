import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { verifyToken } from '@/lib/auth/auth';
import { query, queryOne, execute } from '@/lib/db/turso';
import { getBoardRole, canEditCards, canView } from '@/lib/auth/permissions';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/test-cases?boardId=xxx&cardId=xxx
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');
    const cardId = searchParams.get('cardId');

    if (!boardId && !cardId) {
      return NextResponse.json({ error: 'boardId or cardId is required' }, { status: 400 });
    }

    let resolvedBoardId = boardId;
    if (!resolvedBoardId && cardId) {
      const card = await queryOne<{ board_id: string }>(
        `SELECT l.board_id FROM cards c JOIN lists l ON l.id = c.list_id WHERE c.id = :cardId`,
        { cardId }
      );
      if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
      resolvedBoardId = card.board_id;
    }

    const role = await getBoardRole(payload.userId, resolvedBoardId!);
    if (!canView(role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    let testCases;
    if (cardId) {
      testCases = await query<{
        id: string; board_id: string; code: string; title: string;
        description: string | null; type: string; requirement_id: string | null;
        card_id: string | null; created_by: string; created_at: string; updated_at: string;
        latest_result: string | null; latest_run_at: string | null;
      }>(
        `SELECT tc.*,
           (SELECT tr.result FROM test_runs tr WHERE tr.test_case_id = tc.id ORDER BY tr.executed_at DESC LIMIT 1) as latest_result,
           (SELECT tr.executed_at FROM test_runs tr WHERE tr.test_case_id = tc.id ORDER BY tr.executed_at DESC LIMIT 1) as latest_run_at
         FROM test_cases tc WHERE tc.card_id = :cardId ORDER BY tc.code ASC`,
        { cardId }
      );
    } else {
      testCases = await query<{
        id: string; board_id: string; code: string; title: string;
        description: string | null; type: string; requirement_id: string | null;
        card_id: string | null; created_by: string; created_at: string; updated_at: string;
        latest_result: string | null; latest_run_at: string | null;
      }>(
        `SELECT tc.*,
           (SELECT tr.result FROM test_runs tr WHERE tr.test_case_id = tc.id ORDER BY tr.executed_at DESC LIMIT 1) as latest_result,
           (SELECT tr.executed_at FROM test_runs tr WHERE tr.test_case_id = tc.id ORDER BY tr.executed_at DESC LIMIT 1) as latest_run_at
         FROM test_cases tc WHERE tc.board_id = :boardId ORDER BY tc.code ASC`,
        { boardId: resolvedBoardId! }
      );
    }

    return NextResponse.json({
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
        latestRunAt: tc.latest_run_at ?? undefined,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, 'Get test cases error');
    return NextResponse.json({ error: 'Failed to get test cases' }, { status: 500 });
  }
}

// POST /api/test-cases
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { boardId, title, description, type, requirementId, cardId } = body;

    if (!boardId || !title?.trim()) {
      return NextResponse.json({ error: 'boardId and title are required' }, { status: 400 });
    }

    const role = await getBoardRole(payload.userId, boardId);
    if (!canEditCards(role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    // Auto-generate code: TC-001, TC-002, etc.
    let inserted = false;
    let attempts = 0;
    while (!inserted && attempts < 3) {
      const maxRow = await queryOne<{ max_num: number | null }>(
        `SELECT MAX(CAST(SUBSTR(code, 4) AS INTEGER)) as max_num FROM test_cases WHERE board_id = :boardId`,
        { boardId }
      );
      const nextNum = (maxRow?.max_num ?? 0) + 1;
      const code = `TC-${String(nextNum).padStart(3, '0')}`;

      try {
        const id = nanoid();
        const now = new Date().toISOString();
        await execute(
          `INSERT INTO test_cases (id, board_id, code, title, description, type, requirement_id, card_id, created_by, created_at, updated_at)
           VALUES (:id, :boardId, :code, :title, :description, :type, :requirementId, :cardId, :createdBy, :createdAt, :updatedAt)`,
          {
            id, boardId, code, title: title.trim(),
            description: description?.trim() ?? null,
            type: type ?? 'manual',
            requirementId: requirementId ?? null,
            cardId: cardId ?? null,
            createdBy: payload.userId,
            createdAt: now, updatedAt: now,
          }
        );
        inserted = true;
        return NextResponse.json({
          testCase: {
            id, boardId, code, title: title.trim(),
            description: description?.trim() ?? undefined,
            type: type ?? 'manual',
            requirementId: requirementId ?? undefined,
            cardId: cardId ?? undefined,
            createdBy: payload.userId,
            createdAt: now, updatedAt: now,
          },
        }, { status: 201 });
      } catch (err: unknown) {
        if (err instanceof Error && err.message?.includes('UNIQUE')) {
          attempts++;
        } else {
          throw err;
        }
      }
    }

    return NextResponse.json({ error: 'Failed to generate unique code' }, { status: 500 });
  } catch (error) {
    logger.error({ err: error }, 'Create test case error');
    return NextResponse.json({ error: 'Failed to create test case' }, { status: 500 });
  }
}
