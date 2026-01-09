import { Card, List } from '@/types';

/**
 * Calculate position for a card between two other cards using fractional indexing
 * This avoids re-indexing the entire list
 */
export function calculateCardPosition(
  beforeCard: Card | null,
  afterCard: Card | null
): number {
  // At the end of the list
  if (!beforeCard && !afterCard) return 1000;

  // At the beginning
  if (!beforeCard && afterCard) return afterCard.position / 2;

  // At the end
  if (beforeCard && !afterCard) return beforeCard.position + 1000;

  // Between two cards (both exist)
  if (beforeCard && afterCard) {
    return (beforeCard.position + afterCard.position) / 2;
  }

  // Fallback (should never reach here)
  return 1000;
}

/**
 * Calculate position for a list between two other lists
 */
export function calculateListPosition(
  beforeList: List | null,
  afterList: List | null
): number {
  // At the end of the board
  if (!beforeList && !afterList) return 1000;

  // At the beginning
  if (!beforeList && afterList) return afterList.position / 2;

  // At the end
  if (beforeList && !afterList) return beforeList.position + 1000;

  // Between two lists (both exist)
  if (beforeList && afterList) {
    return (beforeList.position + afterList.position) / 2;
  }

  // Fallback (should never reach here)
  return 1000;
}

/**
 * Re-index all items with even spacing (1000, 2000, 3000, ...)
 * Use this when positions get too close or need normalization
 */
export function reindexPositions<T extends { position: number }>(
  items: T[]
): T[] {
  return items.map((item, index) => ({
    ...item,
    position: (index + 1) * 1000,
  }));
}
