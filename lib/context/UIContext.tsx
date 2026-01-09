'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Toast, ToastType, ModalType, ConfirmDialogData } from '@/types';
import { generateId } from '@/lib/utils/id';
import { TOAST_DURATION, TOAST_DURATION_ERROR } from '@/lib/constants';

interface UIContextType {
  // Modal state
  activeModal: ModalType;
  modalData: unknown;
  openModal: (modal: ModalType, data?: unknown) => void;
  closeModal: () => void;

  // Toast state
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;

  // Confirm dialog state
  confirmDialog: ConfirmDialogData | null;
  showConfirmDialog: (data: ConfirmDialogData) => void;
  closeConfirmDialog: () => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  // Modal state
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<unknown>(null);

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogData | null>(null);

  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Modal functions
  const openModal = useCallback((modal: ModalType, data?: unknown) => {
    setActiveModal(modal);
    setModalData(data || null);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalData(null);
  }, []);

  // Toast functions
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = generateId();
    const duration = type === 'error' ? TOAST_DURATION_ERROR : TOAST_DURATION;

    const toast: Toast = {
      id,
      message,
      type,
      duration,
    };

    setToasts((prev) => [...prev, toast]);

    // Auto-remove after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Confirm dialog functions
  const showConfirmDialog = useCallback((data: ConfirmDialogData) => {
    setConfirmDialog(data);
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialog(null);
  }, []);

  const value: UIContextType = {
    activeModal,
    modalData,
    openModal,
    closeModal,
    toasts,
    showToast,
    removeToast,
    confirmDialog,
    showConfirmDialog,
    closeConfirmDialog,
    isLoading,
    setIsLoading,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
}
