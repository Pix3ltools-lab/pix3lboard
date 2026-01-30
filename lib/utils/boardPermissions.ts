import { BoardRole } from '@/types/board';

/**
 * Frontend permission helpers for board access control.
 * These mirror the backend permissions in lib/auth/permissions.ts
 */

export interface BoardPermissions {
  canManageBoard: boolean;  // Board settings, sharing, delete
  canManageLists: boolean;  // Create, edit, delete, reorder lists
  canEditCards: boolean;    // Create, edit, delete, move cards
  canComment: boolean;      // Add comments
  canView: boolean;         // View board
}

/**
 * Get permissions for a board based on the user's role.
 * If shareRole is undefined, user is the owner.
 */
export function getBoardPermissions(shareRole?: BoardRole): BoardPermissions {
  // If no shareRole, user is the workspace owner (full access)
  if (!shareRole) {
    return {
      canManageBoard: true,
      canManageLists: true,
      canEditCards: true,
      canComment: true,
      canView: true,
    };
  }

  switch (shareRole) {
    case 'owner':
      return {
        canManageBoard: true,
        canManageLists: true,
        canEditCards: true,
        canComment: true,
        canView: true,
      };
    case 'editor':
      return {
        canManageBoard: false,
        canManageLists: true,
        canEditCards: true,
        canComment: true,
        canView: true,
      };
    case 'commenter':
      return {
        canManageBoard: false,
        canManageLists: false,
        canEditCards: false,
        canComment: true,
        canView: true,
      };
    case 'viewer':
      return {
        canManageBoard: false,
        canManageLists: false,
        canEditCards: false,
        canComment: false,
        canView: true,
      };
    default:
      // Unknown role = read-only
      return {
        canManageBoard: false,
        canManageLists: false,
        canEditCards: false,
        canComment: false,
        canView: true,
      };
  }
}

/**
 * Check if user can drag and drop cards/lists
 */
export function canDragAndDrop(shareRole?: BoardRole): boolean {
  const perms = getBoardPermissions(shareRole);
  return perms.canEditCards;
}

/**
 * Check if user can add new cards
 */
export function canAddCards(shareRole?: BoardRole): boolean {
  const perms = getBoardPermissions(shareRole);
  return perms.canEditCards;
}

/**
 * Check if user can add new lists
 */
export function canAddLists(shareRole?: BoardRole): boolean {
  const perms = getBoardPermissions(shareRole);
  return perms.canManageLists;
}
