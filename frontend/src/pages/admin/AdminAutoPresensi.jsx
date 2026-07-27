import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export function AdminAutoPresensi() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getAllPresensiSettings().then(r => setSettings(r.settings || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Auto Presensi — Semua User</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Pantau pengaturan auto presensi seluruh user</p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500"><Loader2 className="w-6 h-6 mx-auto animate-spin" /></div>
        ) : settings.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-30" />
            Belum ada user yang mengatur auto presensi
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">User</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Jam Masuk</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Jam Keluar</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Hari Kerja</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-400">Lokasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {settings.map(s => {
                  const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.user?.email}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{s.user?.full_name || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        {s.enabled ? (
                          <span className="flex items-center gap-1 text-green-700 dark:text-green-300"><CheckCircle2 className="w-4 h-4" /> Aktif</span>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500"><XCircle className="w-4 h-4" /> Nonaktif</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">{s.check_in_time}</td>
                      <td className="px-4 py-3 font-mono">{s.check_out_time}</td>
                      <td className="px-4 py-3 text-xs">
                        {(s.work_days || []).map(d => dayLabels[d]).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {s.latitude?.toFixed(3)}, {s.longitude?.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
