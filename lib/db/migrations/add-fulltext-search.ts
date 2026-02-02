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

  try {
    // Cards FTS table
    await client.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
        card_id UNINDEXED,
        title,
        description,
        content='cards',
        content_rowid='rowid'
      )
    `);
    console.log('  ✓ Created: cards_fts');
  } catch (error) {
    // FTS5 might not support content= syntax in Turso, try alternative
    console.log('  → Trying alternative FTS5 syntax...');
    await client.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS cards_fts USING fts5(
        card_id UNINDEXED,
        title,
        description
      )
    `);
    console.log('  ✓ Created: cards_fts (standalone)');
  }

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

  // Step 3: Create triggers to keep FTS in sync
  console.log('\nCreating triggers for automatic sync...');

  // Card triggers
  const cardTriggers = [
    {
      name: 'cards_fts_insert',
      sql: `
        CREATE TRIGGER IF NOT EXISTS cards_fts_insert AFTER INSERT ON cards BEGIN
          INSERT INTO cards_fts (card_id, title, description)
          VALUES (NEW.id, NEW.title, COALESCE(NEW.description, ''));
        END
      `
    },
    {
      name: 'cards_fts_update',
      sql: `
        CREATE TRIGGER IF NOT EXISTS cards_fts_update AFTER UPDATE ON cards BEGIN
          DELETE FROM cards_fts WHERE card_id = OLD.id;
          INSERT INTO cards_fts (card_id, title, description)
          VALUES (NEW.id, NEW.title, COALESCE(NEW.description, ''));
        END
      `
    },
    {
      name: 'cards_fts_delete',
      sql: `
        CREATE TRIGGER IF NOT EXISTS cards_fts_delete AFTER DELETE ON cards BEGIN
          DELETE FROM cards_fts WHERE card_id = OLD.id;
        END
      `
    }
  ];

  for (const trigger of cardTriggers) {
    try {
      await client.execute(trigger.sql);
      console.log(`  ✓ Created: ${trigger.name}`);
    } catch (error) {
      console.error(`  ✗ Error creating ${trigger.name}:`, error);
    }
  }

  // Comment triggers
  const commentTriggers = [
    {
      name: 'comments_fts_insert',
      sql: `
        CREATE TRIGGER IF NOT EXISTS comments_fts_insert AFTER INSERT ON comments BEGIN
          INSERT INTO comments_fts (comment_id, card_id, content)
          VALUES (NEW.id, NEW.card_id, COALESCE(NEW.content, ''));
        END
      `
    },
    {
      name: 'comments_fts_update',
      sql: `
        CREATE TRIGGER IF NOT EXISTS comments_fts_update AFTER UPDATE ON comments BEGIN
          DELETE FROM comments_fts WHERE comment_id = OLD.id;
          INSERT INTO comments_fts (comment_id, card_id, content)
          VALUES (NEW.id, NEW.card_id, COALESCE(NEW.content, ''));
        END
      `
    },
    {
      name: 'comments_fts_delete',
      sql: `
        CREATE TRIGGER IF NOT EXISTS comments_fts_delete AFTER DELETE ON comments BEGIN
          DELETE FROM comments_fts WHERE comment_id = OLD.id;
        END
      `
    }
  ];

  for (const trigger of commentTriggers) {
    try {
      await client.execute(trigger.sql);
      console.log(`  ✓ Created: ${trigger.name}`);
    } catch (error) {
      console.error(`  ✗ Error creating ${trigger.name}:`, error);
    }
  }

  console.log('\n✓ Migration complete!');
  console.log('\nNote: FTS5 tables will automatically stay in sync via triggers.');
}

migrate().catch(console.error);
