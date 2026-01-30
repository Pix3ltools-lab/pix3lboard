import { BoardRole } from '@/types/board';
import { queryOne } from '@/lib/db/turso';

/**
 * Permission matrix for board roles.
 * Each role has specific capabilities:
 * - owner: Full control (manage board settings, shares, lists, cards, comments)
 * - editor: Can edit cards and lists, add comments, but cannot manage board settings
 * - commenter: Can only view and add comments
 * - viewer: Read-only access
 */
export const PERMISSIONS = {
  owner: {
    manageBoard: true,
    manageLists: true,
    editCards: true,
    comment: true,
    view: true,
  },
  editor: {
    manageBoard: false,
    manageLists: true,
    editCards: true,
    comment: true,
    view: true,
  },
  commenter: {
    manageBoard: false,
    manageLists: false,
    editCards: false,
    comment: true,
    view: true,
  },
  viewer: {
    manageBoard: false,
    manageLists: false,
    editCards: false,
    comment: false,
    view: true,
  },
} as const;

/**
 * Check if a role can manage board settings (name, description, shares, delete)
 */
export function canManageBoard(role: BoardRole | null): boolean {
  if (!role) return false;
  return PERMISSIONS[role].manageBoard;
}

/**
 * Check if a role can manage lists (create, update, delete, reorder)
 */
export function canManageLists(role: BoardRole | null): boolean {
  if (!role) return false;
  return PERMISSIONS[role].manageLists;
}

/**
 * Check if a role can edit cards (create, update, delete, move)
 */
export function canEditCards(role: BoardRole | null): boolean {
  if (!role) return false;
  return PERMISSIONS[role].editCards;
}

/**
 * Check if a role can add comments
 */
export function canComment(role: BoardRole | null): boolean {
  if (!role) return false;
  return PERMISSIONS[role].comment;
}

/**
 * Check if a role can view the board
 */
export function canView(role: BoardRole | null): boolean {
  if (!role) return false;
  return PERMISSIONS[role].view;
}

/**
 * Role labels for UI display
 */
export const ROLE_LABELS: Record<BoardRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  commenter: 'Commenter',
  viewer: 'Viewer',
};

/**
 * Role descriptions for UI tooltips/help
 */
export const ROLE_DESCRIPTIONS: Record<BoardRole, string> = {
  owner: 'Full access: can edit board settings, lists, cards, and manage sharing',
  editor: 'Can create and edit lists and cards, add comments',
  commenter: 'Can view and add comments only',
  viewer: 'Read-only access',
};

/**
 * Get the user's role for a specific board.
 * Returns 'owner' if user owns the workspace, otherwise checks board_shares.
 */
export async function getBoardRole(userId: string, boardId: string): Promise<BoardRole | null> {
  // First check if user is the workspace owner
  const ownerCheck = await queryOne<{ id: string }>(
    `SELECT b.id FROM boards b
     JOIN workspaces w ON w.id = b.workspace_id
     WHERE b.id = :boardId AND w.user_id = :userId`,
    { boardId, userId }
  );

  if (ownerCheck) {
    return 'owner';
  }

  // Check board_shares for shared access
  const share = await queryOne<{ role: string }>(
    `SELECT role FROM board_shares
     WHERE board_id = :boardId AND user_id = :userId`,
    { boardId, userId }
  );

  if (share) {
    // Validate that the role is a valid BoardRole
    const validRoles: BoardRole[] = ['owner', 'editor', 'commenter', 'viewer'];
    if (validRoles.includes(share.role as BoardRole)) {
      return share.role as BoardRole;
    }
  }

  return null;
}

/**
 * Get the user's role for a board via a list ID.
 */
export async function getBoardRoleByListId(userId: string, listId: string): Promise<BoardRole | null> {
  const result = await queryOne<{ board_id: string }>(
    'SELECT board_id FROM lists WHERE id = :listId',
    { listId }
  );
  if (!result) return null;
  return getBoardRole(userId, result.board_id);
}

/**
 * Get the user's role for a board via a card ID.
 */
export async function getBoardRoleByCardId(userId: string, cardId: string): Promise<BoardRole | null> {
  const result = await queryOne<{ board_id: string }>(
    `SELECT l.board_id FROM cards c
     JOIN lists l ON l.id = c.list_id
     WHERE c.id = :cardId`,
    { cardId }
  );
  if (!result) return null;
  return getBoardRole(userId, result.board_id);
}
