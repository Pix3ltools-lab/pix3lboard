import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { query } from '@/lib/db/turso';
import type { WorkspaceSummary } from '@/types';

export const dynamic = 'force-dynamic';

interface WorkspaceRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

interface BoardCountRow {
  workspace_id: string;
  count: number;
}

async function getUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId || null;
}

// GET /api/workspaces - List all workspaces (without nested boards)
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ data: [] });
    }

    // Load workspaces
    const workspaceRows = await query<WorkspaceRow>(
      'SELECT * FROM workspaces WHERE user_id = :userId ORDER BY created_at',
      { userId }
    );

    if (workspaceRows.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get board counts per workspace
    const workspaceIds = workspaceRows.map(w => w.id);
    const countRows = await query<BoardCountRow>(
      `SELECT workspace_id, COUNT(*) as count FROM boards
       WHERE workspace_id IN (${workspaceIds.map((_, i) => `:ws${i}`).join(',')})
       GROUP BY workspace_id`,
      Object.fromEntries(workspaceIds.map((id, i) => [`ws${i}`, id]))
    );
    const boardCounts = new Map(countRows.map(r => [r.workspace_id, Number(r.count)]));

    // Check for shared boards
    const sharedBoardsCount = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM board_shares WHERE user_id = :userId`,
      { userId }
    );
    const hasSharedBoards = Number(sharedBoardsCount[0]?.count || 0) > 0;

    // Map to summary format
    const workspaces: WorkspaceSummary[] = workspaceRows.map(ws => ({
      id: ws.id,
      name: ws.name,
      description: ws.description || undefined,
      icon: ws.icon || undefined,
      color: ws.color || undefined,
      boardCount: boardCounts.get(ws.id) || 0,
      createdAt: ws.created_at,
      updatedAt: ws.updated_at,
    }));

    // Add "Shared with me" virtual workspace if there are shared boards
    if (hasSharedBoards) {
      workspaces.push({
        id: '__shared__',
        name: 'Shared with me',
        description: 'Boards shared with you by other users',
        icon: '👥',
        color: '#6366f1',
        isShared: true,
        boardCount: Number(sharedBoardsCount[0]?.count || 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ data: workspaces });
  } catch (error) {
    console.error('Load workspaces error:', error);
    return NextResponse.json({ error: 'Failed to load workspaces' }, { status: 500 });
  }
}
