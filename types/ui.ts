export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // milliseconds, default 3000
}

export type ModalType = 'workspace' | 'board' | 'card' | 'confirm' | null;

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export interface StorageInfo {
  bytes: number;
  mb: number;
  percentage: number;
}
