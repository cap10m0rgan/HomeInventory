import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: 'narrow' | 'default' | 'wide';
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, children, width = 'default', footer }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className={`modal ${width === 'wide' ? 'wide' : width === 'narrow' ? 'narrow' : ''}`}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.18, ease: [0.2, 0.7, 0.3, 1] }}
          >
            <div className="modal-header">
              <h2>{title}</h2>
              <button className="x" onClick={onClose} aria-label="Close">
                &times;
              </button>
            </div>
            {children}
            {footer}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
