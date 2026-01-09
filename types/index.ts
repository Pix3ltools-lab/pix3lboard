// Data types
export type { Workspace } from './workspace';
export type { Board } from './board';
export type { List } from './list';
export type { Card, CardType } from './card';

// UI types
export type { Toast, ToastType, ModalType, ConfirmDialogData, StorageInfo } from './ui';

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
