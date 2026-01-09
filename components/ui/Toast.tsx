'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { useUI } from '@/lib/context/UIContext';
import { Toast as ToastType } from '@/types';

function ToastItem({ toast }: { toast: ToastType }) {
  const { removeToast } = useUI();

  useEffect(() => {
    if (toast.duration) {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, removeToast]);

  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  };

  const styles = {
    success: 'bg-accent-success/10 border-accent-success text-accent-success',
    error: 'bg-accent-danger/10 border-accent-danger text-accent-danger',
    warning: 'bg-accent-warning/10 border-accent-warning text-accent-warning',
    info: 'bg-accent-secondary/10 border-accent-secondary text-accent-secondary',
  };

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg',
        'bg-bg-primary backdrop-blur-sm',
        'animate-in slide-in-from-top-5 fade-in',
        styles[toast.type]
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {icons[toast.type]}
      </div>
      <div className="flex-1 text-sm text-text-primary">
        {toast.message}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 p-0.5 rounded hover:bg-bg-secondary transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4 text-text-secondary" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useUI();

  if (toasts.length === 0) return null;

  const content = (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );

  return createPortal(content, document.body);
}
