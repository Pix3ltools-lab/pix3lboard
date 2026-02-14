import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth/apiAuth';
import { query, queryOne, execute } from '@/lib/db/turso';
import { CreateBoardSchema } from '@/lib/validation/apiSchemas';
import { generateId } from '@/lib/utils/id';

export const dynamic = 'force-dynamic';

interface BoardRow {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  background: string | null;
  allowed_card_types: string | null;
  is_public: number | null;
  created_at: string;
  updated_at: string;
}

interface SharedBoardRow extends BoardRow {
  role: string;
  workspace_name: string;
  owner_name: string | null;
}

/**
 * @swagger
 * /api/v1/boards:
 *   get:
 *     summary: List all boards accessible by the user
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: workspace_id
 *         schema:
 *           type: string
 *         description: Filter by workspace ID
 *     responses:
 *       200:
 *         description: List of boards
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Create a new board
 *     tags: [Boards]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [workspace_id, name]
 *             properties:
 *               workspace_id:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               background:
 *                 type: string
 *               allowed_card_types:
 *                 type: array
 *                 items:
 *                   type: string
 *               is_public:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Board created
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get('workspace_id');

    // Get owned boards
    let ownedBoards: BoardRow[];
    if (workspaceId) {
      ownedBoards = await query<BoardRow>(
        `SELECT b.* FROM boards b
         JOIN workspaces w ON w.id = b.workspace_id
         WHERE w.user_id = :userId AND b.workspace_id = :workspaceId
         ORDER BY b.created_at`,
        { userId, workspaceId }
      );
    } else {
      ownedBoards = await query<BoardRow>(
        `SELECT b.* FROM boards b
         JOIN workspaces w ON w.id = b.workspace_id
         WHERE w.user_id = :userId
         ORDER BY b.created_at`,
        { userId }
      );
    }

    // Get shared boards
    const sharedBoards = await query<SharedBoardRow>(
      `SELECT b.*, bs.role, w.name as workspace_name, u.name as owner_name
       FROM boards b
       JOIN board_shares bs ON bs.board_id = b.id
       JOIN workspaces w ON w.id = b.workspace_id
       JOIN users u ON u.id = w.user_id
       WHERE bs.user_id = :userId
       ORDER BY b.created_at`,
      { userId }
    );

    const formatBoard = (b: BoardRow, role: string = 'owner') => ({
      id: b.id,
      workspace_id: b.workspace_id,
      name: b.name,
      description: b.description,
      background: b.background,
      allowed_card_types: b.allowed_card_types ? JSON.parse(b.allowed_card_types) : null,
      is_public: Boolean(b.is_public),
      role,
      created_at: b.created_at,
      updated_at: b.updated_at,
    });

    const data = [
      ...ownedBoards.map(b => formatBoard(b, 'owner')),
      ...sharedBoards.map(b => formatBoard(b, b.role)),
    ];

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET /api/v1/boards error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = CreateBoardSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { workspace_id, name, description, background, allowed_card_types, is_public } = validation.data;

    // Verify workspace ownership
    const workspace = await queryOne<{ id: string }>(
      'SELECT id FROM workspaces WHERE id = :workspaceId AND user_id = :userId',
      { workspaceId: workspace_id, userId }
    );
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found or access denied' }, { status: 403 });
    }

    const id = generateId();
    const now = new Date().toISOString();

    await execute(
      `INSERT INTO boards (id, workspace_id, name, description, background, allowed_card_types, is_public, created_at, updated_at)
       VALUES (:id, :workspaceId, :name, :description, :background, :allowedCardTypes, :isPublic, :createdAt, :updatedAt)`,
      {
        id,
        workspaceId: workspace_id,
        name,
        description: description || null,
        background: background || null,
        allowedCardTypes: allowed_card_types ? JSON.stringify(allowed_card_types) : null,
        isPublic: is_public ? 1 : 0,
        createdAt: now,
        updatedAt: now,
      }
    );

    return NextResponse.json({
      data: {
        id,
        workspace_id,
        name,
        description: description || null,
        background: background || null,
        allowed_card_types: allowed_card_types || null,
        is_public: is_public || false,
        role: 'owner',
        created_at: now,
        updated_at: now,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/v1/boards error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
