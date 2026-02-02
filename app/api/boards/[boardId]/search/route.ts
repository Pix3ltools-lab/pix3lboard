import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/auth';
import { query } from '@/lib/db/turso';
import { getBoardRole, canView } from '@/lib/auth/permissions';

export const dynamic = 'force-dynamic';

interface CardSearchResult {
  card_id: string;
  title: string;
  description: string | null;
  list_id: string;
  list_name: string;
  match_type: 'title' | 'description' | 'comment';
  snippet: string;
}

// GET /api/boards/[boardId]/search?q=query - Search cards and comments in a board
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { boardId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get('q')?.trim();

    if (!searchQuery || searchQuery.length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
    }

    // Check user has access to this board
    const role = await getBoardRole(payload.userId, boardId);
    if (!canView(role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Prepare FTS5 query - escape special characters and add prefix matching
    const ftsQuery = searchQuery
      .replace(/['"]/g, '')  // Remove quotes
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => `"${term}"*`)  // Add prefix matching
      .join(' ');

    const results: CardSearchResult[] = [];

    // Search in cards (title and description)
    try {
      const cardResults = await query<{
        card_id: string;
        title: string;
        description: string | null;
        list_id: string;
        list_name: string;
      }>(
        `SELECT DISTINCT
           cf.card_id,
           c.title,
           c.description,
           c.list_id,
           l.name as list_name
         FROM cards_fts cf
         JOIN cards c ON c.id = cf.card_id
         JOIN lists l ON l.id = c.list_id
         WHERE l.board_id = :boardId
           AND c.is_archived = 0
           AND cards_fts MATCH :query
         LIMIT 50`,
        { boardId, query: ftsQuery }
      );

      for (const row of cardResults) {
        const lowerQuery = searchQuery.toLowerCase();
        const matchInTitle = row.title.toLowerCase().includes(lowerQuery);
        const matchInDesc = row.description?.toLowerCase().includes(lowerQuery);

        results.push({
          card_id: row.card_id,
          title: row.title,
          description: row.description,
          list_id: row.list_id,
          list_name: row.list_name,
          match_type: matchInTitle ? 'title' : 'description',
          snippet: matchInTitle ? row.title : (row.description?.substring(0, 150) || ''),
        });
      }
    } catch {
      // FTS5 tables might not exist yet, fall back to LIKE query
      const cardResults = await query<{
        card_id: string;
        title: string;
        description: string | null;
        list_id: string;
        list_name: string;
      }>(
        `SELECT DISTINCT
           c.id as card_id,
           c.title,
           c.description,
           c.list_id,
           l.name as list_name
         FROM cards c
         JOIN lists l ON l.id = c.list_id
         WHERE l.board_id = :boardId
           AND c.is_archived = 0
           AND (c.title LIKE :likeQuery OR c.description LIKE :likeQuery)
         LIMIT 50`,
        { boardId, likeQuery: `%${searchQuery}%` }
      );

      for (const row of cardResults) {
        const lowerQuery = searchQuery.toLowerCase();
        const matchInTitle = row.title.toLowerCase().includes(lowerQuery);

        results.push({
          card_id: row.card_id,
          title: row.title,
          description: row.description,
          list_id: row.list_id,
          list_name: row.list_name,
          match_type: matchInTitle ? 'title' : 'description',
          snippet: matchInTitle ? row.title : (row.description?.substring(0, 150) || ''),
        });
      }
    }

    // Search in comments
    try {
      const commentResults = await query<{
        card_id: string;
        card_title: string;
        card_description: string | null;
        list_id: string;
        list_name: string;
        comment_content: string;
      }>(
        `SELECT DISTINCT
           cf.card_id,
           c.title as card_title,
           c.description as card_description,
           c.list_id,
           l.name as list_name,
           cm.content as comment_content
         FROM comments_fts cf
         JOIN comments cm ON cm.id = cf.comment_id
         JOIN cards c ON c.id = cf.card_id
         JOIN lists l ON l.id = c.list_id
         WHERE l.board_id = :boardId
           AND c.is_archived = 0
           AND comments_fts MATCH :query
         LIMIT 50`,
        { boardId, query: ftsQuery }
      );

      for (const row of commentResults) {
        // Avoid duplicates if card was already found
        if (!results.some(r => r.card_id === row.card_id && r.match_type === 'comment')) {
          results.push({
            card_id: row.card_id,
            title: row.card_title,
            description: row.card_description,
            list_id: row.list_id,
            list_name: row.list_name,
            match_type: 'comment',
            snippet: row.comment_content.substring(0, 150),
          });
        }
      }
    } catch {
      // FTS5 tables might not exist, fall back to LIKE query for comments
      const commentResults = await query<{
        card_id: string;
        card_title: string;
        card_description: string | null;
        list_id: string;
        list_name: string;
        comment_content: string;
      }>(
        `SELECT DISTINCT
           c.id as card_id,
           c.title as card_title,
           c.description as card_description,
           c.list_id,
           l.name as list_name,
           cm.content as comment_content
         FROM comments cm
         JOIN cards c ON c.id = cm.card_id
         JOIN lists l ON l.id = c.list_id
         WHERE l.board_id = :boardId
           AND c.is_archived = 0
           AND cm.content LIKE :likeQuery
         LIMIT 50`,
        { boardId, likeQuery: `%${searchQuery}%` }
      );

      for (const row of commentResults) {
        if (!results.some(r => r.card_id === row.card_id && r.match_type === 'comment')) {
          results.push({
            card_id: row.card_id,
            title: row.card_title,
            description: row.card_description,
            list_id: row.list_id,
            list_name: row.list_name,
            match_type: 'comment',
            snippet: row.comment_content.substring(0, 150),
          });
        }
      }
    }

    // Deduplicate by card_id, keeping best match type (title > description > comment)
    const uniqueResults = new Map<string, CardSearchResult>();
    const priority = { title: 0, description: 1, comment: 2 };

    for (const result of results) {
      const existing = uniqueResults.get(result.card_id);
      if (!existing || priority[result.match_type] < priority[existing.match_type]) {
        uniqueResults.set(result.card_id, result);
      }
    }

    return NextResponse.json({
      results: Array.from(uniqueResults.values()),
      query: searchQuery,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
