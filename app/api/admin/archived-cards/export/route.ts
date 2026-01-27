import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserById } from '@/lib/auth/auth';
import { query } from '@/lib/db/turso';

export const dynamic = 'force-dynamic';

interface ArchivedCardRow {
  id: string;
  title: string;
  description: string | null;
  position: number;
  type: string | null;
  prompt: string | null;
  rating: number | null;
  ai_tool: string | null;
  tags: string | null;
  due_date: string | null;
  responsible: string | null;
  responsible_user_id: string | null;
  responsible_user_name: string | null;
  responsible_user_email: string | null;
  job_number: string | null;
  thumbnail: string | null;
  checklist: string | null;
  created_at: string;
  updated_at: string;
  list_name: string;
  board_name: string;
  workspace_name: string;
}

interface CommentRow {
  id: string;
  card_id: string;
  content: string;
  created_at: string;
  user_email: string;
  user_name: string | null;
}

interface ExportedComment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

interface ExportedCard {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  workspaceName: string;
  boardName: string;
  listName: string;
  tags: string[];
  checklist: Array<{ text: string; completed: boolean }>;
  dueDate: string | null;
  responsible: string | null;
  jobNumber: string | null;
  prompt: string | null;
  rating: number | null;
  aiTool: string | null;
  thumbnail: string | null;
  createdAt: string;
  archivedAt: string;
  comments: ExportedComment[];
}

// GET /api/admin/archived-cards/export - Download archived cards as JSON
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const currentUser = await getUserById(payload.userId);
    if (!currentUser || !currentUser.is_admin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all archived cards with board and list info
    const archivedCards = await query<ArchivedCardRow>(`
      SELECT
        c.id, c.title, c.description, c.position, c.type, c.prompt, c.rating,
        c.ai_tool, c.tags, c.due_date, c.responsible, c.responsible_user_id,
        c.job_number, c.thumbnail, c.checklist, c.created_at, c.updated_at,
        u.name as responsible_user_name, u.email as responsible_user_email,
        l.name as list_name,
        b.name as board_name,
        w.name as workspace_name
      FROM cards c
      JOIN lists l ON l.id = c.list_id
      JOIN boards b ON b.id = l.board_id
      JOIN workspaces w ON w.id = b.workspace_id
      LEFT JOIN users u ON u.id = c.responsible_user_id
      WHERE c.is_archived = 1
      ORDER BY c.updated_at DESC
    `);

    if (archivedCards.length === 0) {
      // Return empty export
      const emptyExport = {
        exportDate: new Date().toISOString(),
        exportedBy: currentUser.email,
        totalCards: 0,
        totalComments: 0,
        cards: [],
      };

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `pix3lboard-archived-cards-${timestamp}.json`;

      return new NextResponse(JSON.stringify(emptyExport, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Get card IDs for comments query
    const cardIds = archivedCards.map(c => c.id);

    // Get all comments for archived cards
    const placeholders = cardIds.map((_, i) => `:cardId${i}`).join(', ');
    const params: Record<string, string> = {};
    cardIds.forEach((id, i) => {
      params[`cardId${i}`] = id;
    });

    const comments = await query<CommentRow>(`
      SELECT
        c.id, c.card_id, c.content, c.created_at,
        u.email as user_email, u.name as user_name
      FROM comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.card_id IN (${placeholders})
      ORDER BY c.created_at ASC
    `, params);

    // Group comments by card_id
    const commentsByCardId = new Map<string, ExportedComment[]>();
    for (const comment of comments) {
      const authorName = comment.user_name || comment.user_email.split('@')[0];
      const exportedComment: ExportedComment = {
        id: comment.id,
        author: `${authorName} (${comment.user_email})`,
        content: comment.content,
        createdAt: comment.created_at,
      };

      const existing = commentsByCardId.get(comment.card_id) || [];
      existing.push(exportedComment);
      commentsByCardId.set(comment.card_id, existing);
    }

    // Build export data
    const exportedCards: ExportedCard[] = archivedCards.map(card => {
      // Parse JSON fields safely
      let tags: string[] = [];
      let checklist: Array<{ text: string; completed: boolean }> = [];

      try {
        if (card.tags) {
          tags = JSON.parse(card.tags);
        }
      } catch {
        tags = [];
      }

      try {
        if (card.checklist) {
          checklist = JSON.parse(card.checklist);
        }
      } catch {
        checklist = [];
      }

      // Build responsible field: prefer linked user, fallback to legacy text
      let responsible: string | null = null;
      if (card.responsible_user_id && card.responsible_user_name) {
        responsible = `${card.responsible_user_name} (${card.responsible_user_email})`;
      } else if (card.responsible) {
        responsible = card.responsible;
      }

      return {
        id: card.id,
        title: card.title,
        description: card.description,
        type: card.type,
        workspaceName: card.workspace_name,
        boardName: card.board_name,
        listName: card.list_name,
        tags,
        checklist,
        dueDate: card.due_date,
        responsible,
        jobNumber: card.job_number,
        prompt: card.prompt,
        rating: card.rating,
        aiTool: card.ai_tool,
        thumbnail: card.thumbnail,
        createdAt: card.created_at,
        archivedAt: card.updated_at,
        comments: commentsByCardId.get(card.id) || [],
      };
    });

    const exportData = {
      exportDate: new Date().toISOString(),
      exportedBy: currentUser.email,
      totalCards: exportedCards.length,
      totalComments: comments.length,
      cards: exportedCards,
    };

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `pix3lboard-archived-cards-${timestamp}.json`;

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Archived cards export error:', error);
    return NextResponse.json({ error: 'Failed to export archived cards' }, { status: 500 });
  }
}
