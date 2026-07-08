import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Toast, ToastType } from '../types';

interface ToastContextValue {
  toasts: Toast[];
  showToast: (type: ToastType, title: string, detail?: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, title: string, detail?: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, title, detail }]);
  }, []);

  return <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>{children}</ToastContext.Provider>;
}

export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used within a ToastProvider');
  return ctx;
}
