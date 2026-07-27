import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { Bell, CheckCheck, Trash2, X, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

const TYPE_ICONS = {
  success: { icon: CheckCircle2, class: 'text-green-500' },
  error: { icon: XCircle, class: 'text-red-500' },
  warning: { icon: AlertTriangle, class: 'text-amber-500' },
  info: { icon: Info, class: 'text-blue-500' },
  presensi: { icon: Bell, class: 'text-purple-500' },
};

function renderIcon(type) {
  const cfg = TYPE_ICONS[type] || TYPE_ICONS.info;
  const Icon = cfg.icon;
  return <Icon className={`w-4 h-4 ${cfg.class}`} />;
}

export function NotificationBell() {
  const { success, error } = useToast();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  const loadUnread = () => {
    api.getUnreadCount().then(r => setUnread(r.count || 0)).catch(() => {});
  };

  const loadAll = () => {
    api.getNotifications().then(r => setNotifications(r.notifications || [])).catch(() => {});
  };

  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) loadAll();
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleRead = async (id) => {
    try { await api.markNotificationRead(id); loadAll(); loadUnread(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const handleReadAll = async () => {
    try { await api.markAllNotificationsRead(); success('Semua notifikasi ditandai dibaca'); loadAll(); loadUnread(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Hapus notifikasi?', type: 'danger', confirmText: 'Hapus' });
    if (!ok) return;
    try { await api.deleteNotification(id); success('Dihapus'); loadAll(); loadUnread(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
        title="Notifikasi"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Notifikasi</h3>
            <div className="flex gap-1">
              {unread > 0 && (
                <button onClick={handleReadAll} title="Tandai semua dibaca" className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                  <CheckCheck className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Tidak ada notifikasi
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-3 flex gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer ${!n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                    onClick={() => !n.is_read && handleRead(n.id)}
                  >
                    <div className={`flex-shrink-0 mt-0.5 ${TYPE_ICONS[n.type]?.class || TYPE_ICONS.info.class}`}>
                      {renderIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{n.title}</div>
                      {n.message && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</div>}
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                        {new Date(n.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }} className="flex-shrink-0 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                      <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
