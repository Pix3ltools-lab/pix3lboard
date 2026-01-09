import { AppData, Workspace, Board, List, Card } from '@/types';

/**
 * Validate that the imported data has correct structure
 */
export function validateAppData(data: unknown): data is AppData {
  if (!data || typeof data !== 'object') return false;

  const appData = data as Partial<AppData>;

  // Check workspaces array exists
  if (!Array.isArray(appData.workspaces)) return false;

  // Validate each workspace
  for (const workspace of appData.workspaces) {
    if (!validateWorkspace(workspace)) return false;
  }

  return true;
}

function validateWorkspace(workspace: unknown): workspace is Workspace {
  if (!workspace || typeof workspace !== 'object') return false;

  const ws = workspace as Partial<Workspace>;

  // Check required fields
  if (!ws.id || !ws.name || !ws.createdAt || !ws.updatedAt) return false;
  if (!Array.isArray(ws.boards)) return false;

  // Validate each board
  for (const board of ws.boards) {
    if (!validateBoard(board)) return false;
  }

  return true;
}

function validateBoard(board: unknown): board is Board {
  if (!board || typeof board !== 'object') return false;

  const b = board as Partial<Board>;

  // Check required fields
  if (!b.id || !b.workspaceId || !b.name || !b.createdAt || !b.updatedAt) {
    return false;
  }
  if (!Array.isArray(b.lists)) return false;

  // Validate each list
  for (const list of b.lists) {
    if (!validateList(list)) return false;
  }

  return true;
}

function validateList(list: unknown): list is List {
  if (!list || typeof list !== 'object') return false;

  const l = list as Partial<List>;

  // Check required fields
  if (!l.id || !l.boardId || !l.name || typeof l.position !== 'number') {
    return false;
  }
  if (!l.createdAt || !l.updatedAt) return false;
  if (!Array.isArray(l.cards)) return false;

  // Validate each card
  for (const card of l.cards) {
    if (!validateCard(card)) return false;
  }

  return true;
}

function validateCard(card: unknown): card is Card {
  if (!card || typeof card !== 'object') return false;

  const c = card as Partial<Card>;

  // Check required fields
  if (!c.id || !c.listId || !c.title || typeof c.position !== 'number') {
    return false;
  }
  if (!c.createdAt || !c.updatedAt) return false;

  // Validate optional arrays
  if (c.tags && !Array.isArray(c.tags)) return false;
  if (c.links && !Array.isArray(c.links)) return false;

  return true;
}
