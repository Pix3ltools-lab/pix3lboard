import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { verifyToken } from '@/lib/auth/auth';
import { query, queryOne, execute } from '@/lib/db/turso';
import { getBoardRole, canEditCards, canView } from '@/lib/auth/permissions';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/requirements?boardId=xxx&cardId=xxx
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

    // Determine boardId for permission check
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

    let requirements;

    if (cardId) {
      // Requirements linked to a specific card via requirement_cards
      requirements = await query<{
        id: string; board_id: string; code: string; title: string;
        description: string | null; priority: string; status: string;
        created_by: string; created_at: string; updated_at: string;
      }>(
        `SELECT r.* FROM requirements r
         JOIN requirement_cards rc ON rc.requirement_id = r.id
         WHERE rc.card_id = :cardId
         ORDER BY r.code ASC`,
        { cardId }
      );
    } else {
      // All requirements for the board with coverage
      requirements = await query<{
        id: string; board_id: string; code: string; title: string;
        description: string | null; priority: string; status: string;
        created_by: string; created_at: string; updated_at: string;
      }>(
        `SELECT * FROM requirements WHERE board_id = :boardId ORDER BY code ASC`,
        { boardId: resolvedBoardId! }
      );
    }

    // Enrich with linked card IDs, test case count, and coverage
    const enriched = await Promise.all(requirements.map(async (r) => {
      const linkedCards = await query<{ card_id: string }>(
        `SELECT card_id FROM requirement_cards WHERE requirement_id = :id`,
        { id: r.id }
      );

      const testCases = await query<{ id: string; result: string | null }>(
        `SELECT tc.id,
           (SELECT tr.result FROM test_runs tr WHERE tr.test_case_id = tc.id ORDER BY tr.executed_at DESC LIMIT 1) as result
         FROM test_cases tc WHERE tc.requirement_id = :id`,
        { id: r.id }
      );

      let coveragePercent = 0;
      if (testCases.length > 0) {
        const passed = testCases.filter(tc => tc.result === 'passed').length;
        coveragePercent = Math.round((passed / testCases.length) * 100);
      } else if (linkedCards.length > 0) {
        const db = (await import('@/lib/db/turso')).getTursoClient();
        const res = await db.execute({
          sql: `SELECT COUNT(*) as count FROM cards WHERE id IN (${linkedCards.map(() => '?').join(',')}) AND is_archived = 1`,
          args: linkedCards.map(c => c.card_id),
        });
        const archived = Number((res.rows[0] as unknown as { count: number }).count);
        coveragePercent = Math.round((archived / linkedCards.length) * 100);
      }

      return {
        id: r.id,
        boardId: r.board_id,
        code: r.code,
        title: r.title,
        description: r.description ?? undefined,
        priority: r.priority,
        status: r.status,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        linkedCardIds: linkedCards.map(c => c.card_id),
        coveragePercent,
      };
    }));

    return NextResponse.json({ requirements: enriched });
  } catch (error) {
    logger.error({ err: error }, 'Get requirements error');
    return NextResponse.json({ error: 'Failed to get requirements' }, { status: 500 });
  }
}

// POST /api/requirements
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { boardId, title, description, priority } = body;

    if (!boardId || !title?.trim()) {
      return NextResponse.json({ error: 'boardId and title are required' }, { status: 400 });
    }

    const role = await getBoardRole(payload.userId, boardId);
    if (!canEditCards(role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    // Auto-generate code: REQ-001, REQ-002, etc.
    let code: string;
    let inserted = false;
    let attempts = 0;
    while (!inserted && attempts < 3) {
      const maxRow = await queryOne<{ max_num: number | null }>(
        `SELECT MAX(CAST(SUBSTR(code, 5) AS INTEGER)) as max_num FROM requirements WHERE board_id = :boardId`,
        { boardId }
      );
      const nextNum = (maxRow?.max_num ?? 0) + 1;
      code = `REQ-${String(nextNum).padStart(3, '0')}`;

      try {
        const id = nanoid();
        const now = new Date().toISOString();
        await execute(
          `INSERT INTO requirements (id, board_id, code, title, description, priority, status, created_by, created_at, updated_at)
           VALUES (:id, :boardId, :code, :title, :description, 'draft', 'draft', :createdBy, :createdAt, :updatedAt)`,
          {
            id, boardId, code: code!, title: title.trim(),
            description: description?.trim() ?? null,
            createdBy: payload.userId, createdAt: now, updatedAt: now,
          }
        );
        inserted = true;
        return NextResponse.json({
          requirement: {
            id, boardId, code: code!, title: title.trim(),
            description: description?.trim() ?? undefined,
            priority: priority ?? 'medium', status: 'draft',
            createdBy: payload.userId, createdAt: now, updatedAt: now,
            linkedCardIds: [], coveragePercent: 0,
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
    logger.error({ err: error }, 'Create requirement error');
    return NextResponse.json({ error: 'Failed to create requirement' }, { status: 500 });
  }
}
