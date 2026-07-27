import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const VARIANTS = {
  success: { icon: CheckCircle2, classes: 'bg-green-600 border-green-700' },
  error:   { icon: XCircle,     classes: 'bg-red-600 border-red-700' },
  warning: { icon: AlertCircle, classes: 'bg-amber-500 border-amber-600' },
  info:    { icon: Info,        classes: 'bg-blue-600 border-blue-700' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, variant = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, variant }]);
    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
    return id;
  }, [remove]);

  // Convenience helpers
  const api = {
    toast,
    success: (msg, d) => toast(msg, 'success', d),
    error:   (msg, d) => toast(msg, 'error',   d ?? 5000),
    warning: (msg, d) => toast(msg, 'warning', d),
    info:    (msg, d) => toast(msg, 'info',    d),
    remove,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Render container — fixed top-right, above everything */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => {
          const v = VARIANTS[t.variant] || VARIANTS.info;
          const Icon = v.icon;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3 rounded-lg shadow-lg border text-white text-sm ${v.classes}`}
              role="alert"
            >
              <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 break-words">{t.message}</div>
              <button
                onClick={() => remove(t.id)}
                className="p-0.5 hover:bg-white/20 rounded flex-shrink-0"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
