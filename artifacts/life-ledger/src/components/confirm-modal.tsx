import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-200 flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={e => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-start gap-4 mb-5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${destructive ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground leading-tight">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{message}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 px-4 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-xl font-medium transition-colors cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold transition-colors cursor-pointer ${
                  destructive
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
