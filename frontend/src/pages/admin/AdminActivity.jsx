import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Activity, Loader2 } from 'lucide-react';

export function AdminActivity() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterUser, _setFilterUser] = useState('');

  const load = (p = 1, uid = filterUser) => {
    setLoading(true);
    api.getActivityLogs(p, 50, uid || undefined).then(r => {
      setLogs(r.logs || []);
      setTotalPages(r.pagination?.total_pages || 1);
      setPage(p);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Aktivitas User</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Log semua aktivitas pengguna aplikasi</p>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500"><Loader2 className="w-6 h-6 mx-auto animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
            Belum ada aktivitas
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Waktu</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">User</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Aksi</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Detail</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3">{log.user?.email || log.user_id?.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{log.action}</code>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs">{log.ip_address || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => load(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              ← Sebelumnya
            </button>
            <span className="text-sm text-slate-500 dark:text-slate-400">Hal {page} / {totalPages}</span>
            <button
              onClick={() => load(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              Berikutnya →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
