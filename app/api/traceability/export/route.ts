import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { getTursoClient } from '@/lib/db/turso';
import logger from '@/lib/logger';
import type { TraceabilityExport } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/traceability/export?boardIds=id1,id2
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const boardIdsParam = request.nextUrl.searchParams.get('boardIds');
    if (!boardIdsParam) return NextResponse.json({ error: 'boardIds required' }, { status: 400 });

    const boardIds = boardIdsParam.split(',').filter(Boolean);
    if (boardIds.length === 0) {
      return NextResponse.json<TraceabilityExport>({ requirements: [], requirementCards: [], testCases: [], testRuns: [] });
    }

    const db = getTursoClient();
    const placeholders = boardIds.map(() => '?').join(',');

    const [reqRes, tcRes] = await Promise.all([
      db.execute({ sql: `SELECT id, board_id, code, title, description, priority, status, created_by, created_at, updated_at FROM requirements WHERE board_id IN (${placeholders})`, args: boardIds }),
      db.execute({ sql: `SELECT id, board_id, code, title, description, type, requirement_id, card_id, created_by, created_at, updated_at FROM test_cases WHERE board_id IN (${placeholders})`, args: boardIds }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requirements = reqRes.rows.map((r: any) => ({
      id: r.id as string,
      boardId: r.board_id as string,
      code: r.code as string,
      title: r.title as string,
      description: r.description as string | undefined,
      priority: r.priority as string,
      status: r.status as string,
      createdBy: r.created_by as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const testCases = tcRes.rows.map((r: any) => ({
      id: r.id as string,
      boardId: r.board_id as string,
      code: r.code as string,
      title: r.title as string,
      description: r.description as string | undefined,
      type: r.type as string,
      requirementId: r.requirement_id as string | undefined,
      cardId: r.card_id as string | undefined,
      createdBy: r.created_by as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    }));

    const reqIds = requirements.map(r => r.id);
    const tcIds = testCases.map(tc => tc.id);

    let requirementCards: TraceabilityExport['requirementCards'] = [];
    let testRuns: TraceabilityExport['testRuns'] = [];

    if (reqIds.length > 0) {
      const rcPlaceholders = reqIds.map(() => '?').join(',');
      const rcRes = await db.execute({ sql: `SELECT requirement_id, card_id, created_at FROM requirement_cards WHERE requirement_id IN (${rcPlaceholders})`, args: reqIds });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requirementCards = rcRes.rows.map((r: any) => ({
        requirementId: r.requirement_id as string,
        cardId: r.card_id as string,
        createdAt: r.created_at as string,
      }));
    }

    if (tcIds.length > 0) {
      const trPlaceholders = tcIds.map(() => '?').join(',');
      const trRes = await db.execute({ sql: `SELECT id, test_case_id, result, notes, executed_by, executed_at FROM test_runs WHERE test_case_id IN (${trPlaceholders})`, args: tcIds });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      testRuns = trRes.rows.map((r: any) => ({
        id: r.id as string,
        testCaseId: r.test_case_id as string,
        result: r.result as string,
        notes: r.notes as string | undefined,
        executedBy: r.executed_by as string,
        executedAt: r.executed_at as string,
      }));
    }

    return NextResponse.json<TraceabilityExport>({ requirements, requirementCards, testCases, testRuns });
  } catch (error) {
    logger.error({ err: error }, 'Traceability export error');
    return NextResponse.json({ error: 'Failed to export traceability data' }, { status: 500 });
  }
}
