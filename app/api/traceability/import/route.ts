import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { execute } from '@/lib/db/turso';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface ImportRequirement {
  id: string; boardId: string; code: string; title: string;
  description?: string; priority: string; status: string;
  createdBy: string; createdAt: string; updatedAt: string;
}

interface ImportRequirementCard {
  requirementId: string; cardId: string; createdAt: string;
}

interface ImportTestCase {
  id: string; boardId: string; code: string; title: string;
  description?: string; type: string; requirementId?: string;
  cardId?: string; createdBy: string; createdAt: string; updatedAt: string;
}

interface ImportTestRun {
  id: string; testCaseId: string; result: string;
  notes?: string; executedBy: string; executedAt: string;
}

interface TraceabilityPayload {
  requirements?: ImportRequirement[];
  requirementCards?: ImportRequirementCard[];
  testCases?: ImportTestCase[];
  testRuns?: ImportTestRun[];
}

// POST /api/traceability/import
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const body: TraceabilityPayload = await request.json();
    const { requirements = [], requirementCards = [], testCases = [], testRuns = [] } = body;

    let imported = 0;
    let skipped = 0;

    // INSERT OR IGNORE preserves existing records
    for (const r of requirements) {
      try {
        await execute(
          `INSERT OR IGNORE INTO requirements (id, board_id, code, title, description, priority, status, created_by, created_at, updated_at)
           VALUES (:id, :boardId, :code, :title, :description, :priority, :status, :createdBy, :createdAt, :updatedAt)`,
          {
            id: r.id, boardId: r.boardId, code: r.code, title: r.title,
            description: r.description ?? null, priority: r.priority, status: r.status,
            createdBy: r.createdBy, createdAt: r.createdAt, updatedAt: r.updatedAt,
          }
        );
        imported++;
      } catch { skipped++; }
    }

    for (const rc of requirementCards) {
      try {
        await execute(
          `INSERT OR IGNORE INTO requirement_cards (requirement_id, card_id, created_at) VALUES (:requirementId, :cardId, :createdAt)`,
          { requirementId: rc.requirementId, cardId: rc.cardId, createdAt: rc.createdAt }
        );
        imported++;
      } catch { skipped++; }
    }

    for (const tc of testCases) {
      try {
        await execute(
          `INSERT OR IGNORE INTO test_cases (id, board_id, code, title, description, type, requirement_id, card_id, created_by, created_at, updated_at)
           VALUES (:id, :boardId, :code, :title, :description, :type, :requirementId, :cardId, :createdBy, :createdAt, :updatedAt)`,
          {
            id: tc.id, boardId: tc.boardId, code: tc.code, title: tc.title,
            description: tc.description ?? null, type: tc.type,
            requirementId: tc.requirementId ?? null, cardId: tc.cardId ?? null,
            createdBy: tc.createdBy, createdAt: tc.createdAt, updatedAt: tc.updatedAt,
          }
        );
        imported++;
      } catch { skipped++; }
    }

    for (const tr of testRuns) {
      try {
        await execute(
          `INSERT OR IGNORE INTO test_runs (id, test_case_id, result, notes, executed_by, executed_at)
           VALUES (:id, :testCaseId, :result, :notes, :executedBy, :executedAt)`,
          {
            id: tr.id, testCaseId: tr.testCaseId, result: tr.result,
            notes: tr.notes ?? null, executedBy: tr.executedBy, executedAt: tr.executedAt,
          }
        );
        imported++;
      } catch { skipped++; }
    }

    return NextResponse.json({ success: true, imported, skipped });
  } catch (error) {
    logger.error({ err: error }, 'Traceability import error');
    return NextResponse.json({ error: 'Failed to import traceability data' }, { status: 500 });
  }
}
