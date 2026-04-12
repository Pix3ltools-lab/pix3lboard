import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { query, queryOne } from '@/lib/db/turso';
import { getBoardRole, canView } from '@/lib/auth/permissions';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/boards/[boardId]/traceability/coverage
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { boardId } = await params;

    const role = await getBoardRole(payload.userId, boardId);
    if (!canView(role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    // Fetch all requirements for this board with their coverage data
    const requirements = await query<{
      id: string; priority: string; status: string;
      title: string; code: string;
    }>(
      `SELECT id, priority, status, title, code FROM requirements WHERE board_id = :boardId`,
      { boardId }
    );

    if (requirements.length === 0) {
      return NextResponse.json({
        metrics: { total: 0, covered: 0, partial: 0, notCovered: 0 },
        byStatus: [],
        byPriority: [],
        byList: [],
        atRisk: [],
      });
    }

    // Compute coverage per requirement
    const reqCoverage = await Promise.all(requirements.map(async (r) => {
      const testCases = await query<{ result: string | null }>(
        `SELECT (SELECT tr.result FROM test_runs tr WHERE tr.test_case_id = tc.id ORDER BY tr.executed_at DESC LIMIT 1) as result
         FROM test_cases tc WHERE tc.requirement_id = :id`,
        { id: r.id }
      );

      let coveragePercent = 0;
      if (testCases.length > 0) {
        const passed = testCases.filter(tc => tc.result === 'passed').length;
        coveragePercent = Math.round((passed / testCases.length) * 100);
      } else {
        // Fall back to archived cards
        const db = (await import('@/lib/db/turso')).getTursoClient();
        const linkedRes = await db.execute({
          sql: `SELECT card_id FROM requirement_cards WHERE requirement_id = ?`,
          args: [r.id],
        });
        const linkedCardIds = linkedRes.rows.map(row => row.card_id as string);
        if (linkedCardIds.length > 0) {
          const archivedRes = await db.execute({
            sql: `SELECT COUNT(*) as count FROM cards WHERE id IN (${linkedCardIds.map(() => '?').join(',')}) AND is_archived = 1`,
            args: linkedCardIds,
          });
          const archived = Number((archivedRes.rows[0] as unknown as { count: number }).count);
          coveragePercent = Math.round((archived / linkedCardIds.length) * 100);
        }
      }

      return { ...r, coveragePercent };
    }));

    // Metrics
    const total = reqCoverage.length;
    const covered = reqCoverage.filter(r => r.coveragePercent === 100).length;
    const notCovered = reqCoverage.filter(r => r.coveragePercent === 0).length;
    const partial = total - covered - notCovered;

    // By status (for donut chart)
    const statusCounts: Record<string, number> = {};
    for (const r of reqCoverage) {
      statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
    }
    const byStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    // By priority (for horizontal bar chart)
    const priorityGroups: Record<string, { covered: number; partial: number; notCovered: number }> = {};
    for (const r of reqCoverage) {
      if (!priorityGroups[r.priority]) priorityGroups[r.priority] = { covered: 0, partial: 0, notCovered: 0 };
      if (r.coveragePercent === 100) priorityGroups[r.priority].covered++;
      else if (r.coveragePercent === 0) priorityGroups[r.priority].notCovered++;
      else priorityGroups[r.priority].partial++;
    }
    const byPriority = Object.entries(priorityGroups).map(([priority, counts]) => ({ priority, ...counts }));

    // By list (stacked bar chart): requirements linked to cards in each list
    const lists = await query<{ id: string; name: string }>(
      `SELECT id, name FROM lists WHERE board_id = :boardId ORDER BY position ASC`,
      { boardId }
    );

    const byList = await Promise.all(lists.map(async (list) => {
      // Find requirements that have at least one card in this list
      const db = (await import('@/lib/db/turso')).getTursoClient();
      const res = await db.execute({
        sql: `SELECT DISTINCT rc.requirement_id FROM requirement_cards rc
              JOIN cards c ON c.id = rc.card_id
              WHERE c.list_id = ?`,
        args: [list.id],
      });
      const reqIds = res.rows.map(row => row.requirement_id as string);
      if (reqIds.length === 0) return { list: list.name, covered: 0, partial: 0, notCovered: 0 };

      const matched = reqCoverage.filter(r => reqIds.includes(r.id));
      return {
        list: list.name,
        covered: matched.filter(r => r.coveragePercent === 100).length,
        partial: matched.filter(r => r.coveragePercent > 0 && r.coveragePercent < 100).length,
        notCovered: matched.filter(r => r.coveragePercent === 0).length,
      };
    }));

    // At-risk: high priority, not verified
    const atRisk = reqCoverage
      .filter(r => r.priority === 'high' && r.status !== 'verified')
      .map(r => ({
        id: r.id,
        code: r.code,
        title: r.title,
        status: r.status,
        coveragePercent: r.coveragePercent,
      }));

    return NextResponse.json({
      metrics: { total, covered, partial, notCovered },
      byStatus,
      byPriority,
      byList,
      atRisk,
    });
  } catch (error) {
    logger.error({ err: error }, 'Get traceability coverage error');
    return NextResponse.json({ error: 'Failed to get coverage data' }, { status: 500 });
  }
}
