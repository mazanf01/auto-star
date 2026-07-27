import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { CheckCircle2, XCircle, Clock, History } from 'lucide-react';

export function PresensiLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = (p = 1) => {
    setLoading(true);
    api.getPresensiLogs(p, 50).then(r => {
      setLogs(r.logs || []);
      setTotalPages(r.pagination?.total_pages || 1);
      setPage(p);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Riwayat Presensi</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Log eksekusi presensi otomatis & manual</p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">Memuat...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
            Belum ada riwayat
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Waktu</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Tipe</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Pesan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {new Date(log.executed_at).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.type === 'in' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                      }`}>
                        {log.type === 'in' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {log.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                          : log.status === 'skipped' ? <Clock className="w-4 h-4 text-amber-600" />
                          : <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                        <span className={
                          log.status === 'success' ? 'text-green-700 dark:text-green-300' :
                          log.status === 'skipped' ? 'text-amber-700 dark:text-amber-300' : 'text-red-700 dark:text-red-300'
                        }>{log.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{log.message}</td>
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
