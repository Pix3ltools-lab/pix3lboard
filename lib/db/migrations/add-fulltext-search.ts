/**
 * Migration: Add FTS5 full-text search tables
 * Run with: npx tsx lib/db/migrations/add-fulltext-search.ts
 */

import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
  process.exit(1);
}

const client = createClient({ url, authToken });

async function migrate() {
  console.log('Running migration: add-fulltext-search\n');

  // Step 1: Create FTS5 virtual tables
  console.log('Creating FTS5 virtual tables...');

  // Cards FTS table - standalone mode (no content= option) required for
  // manual upsert pattern (DELETE WHERE card_id + INSERT). The content table
  // mode causes "no such column: T.card_id" because FTS5 looks for a column
  // named card_id in the source table (cards), which only has id.
  await client.execute(`
    CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
      card_id UNINDEXED,
      title,
      description
    )
  `);
  console.log('  ✓ Created: cards_fts');

  try {
    // Comments FTS table
    await client.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS comments_fts USING fts5(
        comment_id UNINDEXED,
        card_id UNINDEXED,
        content
      )
    `);
    console.log('  ✓ Created: comments_fts');
  } catch (error) {
    console.error('Error creating comments_fts:', error);
    process.exit(1);
  }

  // Step 2: Populate FTS tables with existing data
  console.log('\nPopulating FTS tables with existing data...');

  // Populate cards_fts
  const cardsResult = await client.execute(`
    SELECT id, title, description FROM cards WHERE is_archived = 0
  `);

  let cardCount = 0;
  for (const card of cardsResult.rows) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO cards_fts (card_id, title, description) VALUES (?, ?, ?)`,
      args: [card.id as string, card.title as string || '', card.description as string || '']
    });
    cardCount++;
  }
  console.log(`  ✓ Indexed ${cardCount} cards`);

  // Populate comments_fts
  const commentsResult = await client.execute(`
    SELECT id, card_id, content FROM comments
  `);

  let commentCount = 0;
  for (const comment of commentsResult.rows) {
    await client.execute({
      sql: `INSERT OR REPLACE INTO comments_fts (comment_id, card_id, content) VALUES (?, ?, ?)`,
      args: [comment.id as string, comment.card_id as string, comment.content as string || '']
    });
    commentCount++;
  }
  console.log(`  ✓ Indexed ${commentCount} comments`);

  // NOTE: FTS triggers are NOT created. They would cause the same
  // "no such column: T.card_id" error. Manual sync via fts.ts is used instead.
  //
  // To manually re-sync FTS tables, run:
  // - DELETE FROM cards_fts; INSERT INTO cards_fts SELECT id, title, COALESCE(description, '') FROM cards WHERE is_archived = 0;
  // - DELETE FROM comments_fts; INSERT INTO comments_fts SELECT id, card_id, COALESCE(content, '') FROM comments;

  console.log('\n✓ Migration complete!');
  console.log('\nNote: FTS triggers are disabled due to Turso compatibility issues.');
  console.log('FTS tables can be re-synced manually if search results become stale.');
}

migrate().catch(console.error);
