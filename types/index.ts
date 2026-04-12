// Data types
export type { Workspace } from './workspace';
export type { Board } from './board';
export type { List } from './list';
export type { Card, CardType, BugSeverity, Priority, Effort, ChecklistItem } from './card';

// API types
export type { PaginatedResponse, WorkspaceSummary, BoardSummary, ListSummary } from './api';

// Sync types
export type { EntityType, SyncOperation, SyncChange, SyncPayload, SyncConflict, SyncResult } from './sync';

// UI types
export type { Toast, ToastType, ModalType, ConfirmDialogData, StorageInfo } from './ui';

// Notification types
export type { Notification, NotificationType } from './notification';

// Traceability types
export type { Requirement, TestCase, TestRun, RequirementPriority, RequirementStatus, TestType, TestResult } from './traceability';

// Import for use in interface
import type { Workspace } from './workspace';

// App data structure
export interface AppData {
  workspaces: Workspace[];
}

// Storage result
export interface StorageResult {
  success: boolean;
  size?: number;
  error?: string;
}
