'use client';

import { useUI } from '@/lib/context/UIContext';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog() {
  const { confirmDialog, closeConfirmDialog } = useUI();

  if (!confirmDialog) return null;

  const handleConfirm = () => {
    confirmDialog.onConfirm();
    closeConfirmDialog();
  };

  const handleCancel = () => {
    if (confirmDialog.onCancel) {
      confirmDialog.onCancel();
    }
    closeConfirmDialog();
  };

  // Map variant to Button variant
  const buttonVariant = confirmDialog.variant === 'warning' || confirmDialog.variant === 'info'
    ? 'primary'
    : 'danger';

  return (
    <Modal
      isOpen={true}
      onClose={handleCancel}
      size="sm"
      showCloseButton={false}
    >
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-accent-danger/10 mb-4">
          <AlertTriangle className="h-6 w-6 text-accent-danger" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          {confirmDialog.title}
        </h3>

        {/* Message */}
        <p className="text-sm text-text-secondary mb-6">
          {confirmDialog.message}
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Button variant="ghost" onClick={handleCancel}>
            {confirmDialog.cancelText || 'Cancel'}
          </Button>
          <Button
            variant={buttonVariant}
            onClick={handleConfirm}
          >
            {confirmDialog.confirmText || 'Confirm'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
