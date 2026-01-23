import type { Workspace, Board, List, Card } from './index';

export type EntityType = 'workspace' | 'board' | 'list' | 'card';

export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncChange {
  entityType: EntityType;
  entityId: string;
  operation: SyncOperation;
  parentId?: string; // workspaceId for boards, boardId for lists, listId for cards
  data?: Partial<Workspace | Board | List | Card>;
  timestamp: number;
}

export interface SyncPayload {
  changes: SyncChange[];
  clientVersion: number;
}

export interface SyncResult {
  success: boolean;
  appliedCount: number;
  failedChanges?: Array<{
    change: SyncChange;
    error: string;
  }>;
  serverVersion: number;
}
