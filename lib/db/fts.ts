/**
 * FTS (Full-Text Search) sync helpers
 *
 * These functions manually sync data to FTS5 tables since Turso/libSQL
 * has issues with automatic triggers on FTS5 virtual tables.
 * See: https://github.com/tursodatabase/libsql/issues/1811
 */

import { execute } from './turso';

/**
 * Sync a card to the FTS index
 * Call on CREATE and UPDATE card operations
 */
export async function syncCardToFts(
  cardId: string,
  title: string,
  description: string | null
): Promise<void> {
  try {
    // Delete existing entry first (upsert pattern)
    await execute(
      `DELETE FROM cards_fts WHERE card_id = :cardId`,
      { cardId }
    );

    // Insert new entry
    await execute(
      `INSERT INTO cards_fts (card_id, title, description) VALUES (:cardId, :title, :description)`,
      { cardId, title, description: description || '' }
    );
  } catch (error) {
    // Log but don't fail the main operation if FTS sync fails
    console.error('FTS sync error (card):', error);
  }
}

/**
 * Remove a card from the FTS index
 * Call on DELETE and ARCHIVE card operations
 */
export async function removeCardFromFts(cardId: string): Promise<void> {
  try {
    await execute(
      `DELETE FROM cards_fts WHERE card_id = :cardId`,
      { cardId }
    );
  } catch (error) {
    console.error('FTS remove error (card):', error);
  }
}

/**
 * Sync a comment to the FTS index
 * Call on CREATE comment operations
 */
export async function syncCommentToFts(
  commentId: string,
  cardId: string,
  content: string
): Promise<void> {
  try {
    // Delete existing entry first (upsert pattern)
    await execute(
      `DELETE FROM comments_fts WHERE comment_id = :commentId`,
      { commentId }
    );

    // Insert new entry
    await execute(
      `INSERT INTO comments_fts (comment_id, card_id, content) VALUES (:commentId, :cardId, :content)`,
      { commentId, cardId, content: content || '' }
    );
  } catch (error) {
    console.error('FTS sync error (comment):', error);
  }
}

/**
 * Remove a comment from the FTS index
 * Call on DELETE comment operations
 */
export async function removeCommentFromFts(commentId: string): Promise<void> {
  try {
    await execute(
      `DELETE FROM comments_fts WHERE comment_id = :commentId`,
      { commentId }
    );
  } catch (error) {
    console.error('FTS remove error (comment):', error);
  }
}
