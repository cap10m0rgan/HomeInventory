import { AnimatePresence, motion } from 'motion/react';
import { useToasts } from '../hooks/useToasts';
import type { ToastType } from '../types';

const ICONS: Record<ToastType, string> = { error: '⛔', success: '✅', warning: '⚠️', info: 'ℹ️' };

export function Toasts() {
  const { toasts, dismissToast } = useToasts();

  return (
    <div className="toast-stack">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            className={`toast ${t.type}`}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.18 }}
          >
            <span className="icon">{ICONS[t.type]}</span>
            <span className="body">
              <span className="title">{t.title}</span>
              {t.detail && <span className="detail">{t.detail}</span>}
            </span>
            <button className="dismiss" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
              &times;
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
