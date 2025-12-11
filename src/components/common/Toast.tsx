import React, { useEffect } from 'react';
import { useStore } from '@/store';
import type { Toast as ToastType } from '@/types';

const ToastItem: React.FC<{ toast: ToastType }> = ({ toast }) => {
  const removeToast = useStore((state) => state.removeToast);

  useEffect(() => {
    const duration = toast.duration || 3000;
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  const typeClasses = {
    success: 'toast-success',
    error: 'toast-error',
    warning: 'toast-warning',
    info: 'toast-info',
  };

  return (
    <div className={`toast ${typeClasses[toast.type]} mb-2`}>
      <p className="text-sm font-medium">{toast.message}</p>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useStore((state) => state.ui.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
};
