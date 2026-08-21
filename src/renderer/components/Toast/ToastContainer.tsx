import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  isError?: boolean;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto p-3 rounded-card border shadow-glass flex items-start space-x-2.5 text-xs text-text-primary transition-all animate-in slide-in-from-bottom-3 duration-200 ${
            t.isError
              ? 'bg-bg-surface border-status-error/40 text-status-error'
              : 'bg-bg-surface border-accent-emerald/40 text-text-primary'
          }`}
        >
          {t.isError ? (
            <AlertCircle className="w-4 h-4 text-status-error flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-accent-emerald flex-shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            <p className="font-medium leading-snug break-words">{t.message}</p>
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            className="text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
