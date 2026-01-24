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
  expectedUpdatedAt?: string; // For conflict detection on updates
}

export interface SyncPayload {
  changes: SyncChange[];
  clientVersion: number;
}

export interface SyncConflict {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  clientUpdatedAt: string;
  serverUpdatedAt: string;
  serverData: Partial<Workspace | Board | List | Card>;
  pendingChange: SyncChange;
}

export interface SyncResult {
  success: boolean;
  appliedCount: number;
  failedChanges?: Array<{
    change: SyncChange;
    error: string;
  }>;
  conflicts?: SyncConflict[];
  serverVersion: number;
}
