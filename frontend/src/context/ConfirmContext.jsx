import { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Info, CheckCircle2, XCircle, X } from 'lucide-react';

const ConfirmContext = createContext(null);
export const useConfirm = () => useContext(ConfirmContext);

const ICONS = {
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
  danger: XCircle,
};

const ICON_STYLES = {
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
  info: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  success: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
  danger: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
};

/**
 * SweetAlert-style confirmation dialog.
 * Usage:
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: 'Hapus?', text: 'Tidak bisa diundo', type: 'danger' });
 *   if (!ok) return;
 *
 *   // Quick alert (no cancel button):
 *   await confirm({ title: 'Info', text: 'Pilih tahun dan periode', type: 'info', cancelText: null });
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { title, text, type, confirmText, cancelText, resolve }

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setState({
        title: opts.title || 'Konfirmasi',
        text: opts.text || '',
        type: opts.type || 'warning',
        confirmText: opts.confirmText || 'OK',
        cancelText: opts.cancelText === undefined ? 'Batal' : opts.cancelText,
        resolve,
      });
    });
  }, []);

  const handle = (val) => {
    state?.resolve(val);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          onClick={() => handle(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${ICON_STYLES[state.type]}`}>
                {(() => {
                  const Icon = ICONS[state.type] || AlertTriangle;
                  return <Icon className="w-7 h-7" />;
                })()}
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-bold text-center text-slate-900 dark:text-slate-100 mb-2">
              {state.title}
            </h3>

            {/* Text */}
            {state.text && (
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
                {state.text}
              </p>
            )}

            {/* Buttons */}
            <div className={`flex gap-3 ${state.cancelText ? '' : ''}`}>
              {state.cancelText && (
                <button
                  onClick={() => handle(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-sm transition-colors"
                >
                  {state.cancelText}
                </button>
              )}
              <button
                onClick={() => handle(true)}
                className={`flex-1 py-2.5 px-4 text-white rounded-lg font-medium text-sm transition-colors ${
                  state.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : state.type === 'success'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
