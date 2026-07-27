import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2, XCircle, Clock, Fingerprint, Calendar,
  Users, Menu as MenuIcon, Activity as ActivityIcon, Shield
} from 'lucide-react';
import { Skeleton, CardSkeleton } from '../components/Skeleton';

export function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
        <CardSkeleton lines={2} />
      </div>
      <CardSkeleton lines={5} />
    </div>
  );

  const todayLogs = data?.todayLogs || [];
  const weekLogs = data?.weekLogs || [];
  const todayIn = todayLogs.find(l => l.type === 'in' && l.status === 'success');
  const todayOut = todayLogs.find(l => l.type === 'out' && l.status === 'success');

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold">Selamat datang, {user?.full_name || user?.email} 👋</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Admin stats */}
      {user?.role === 'admin' && data?.adminStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total User" value={data.adminStats.totalUsers || 0} color="blue" />
          <StatCard icon={MenuIcon} label="Total Menu" value={data.adminStats.totalMenus || 0} color="purple" />
          <StatCard icon={Shield} label="Auto Presensi Aktif" value={data.adminStats.activeAutoPresensi || 0} color="green" />
          <StatCard icon={ActivityIcon} label="Aktivitas Hari Ini" value={data.adminStats.todayActivity || 0} color="orange" />
        </div>
      )}

      {/* Today's presensi status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${todayIn ? 'bg-green-100 dark:bg-green-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <Fingerprint className={`w-5 h-5 ${todayIn ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`} />
            </div>
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Presensi Masuk</div>
              <div className="font-semibold">{todayIn ? 'Sudah Masuk' : 'Belum Masuk'}</div>
            </div>
          </div>
          {todayIn && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              <Clock className="w-4 h-4 inline mr-1" />
              {new Date(todayIn.executed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${todayOut ? 'bg-green-100 dark:bg-green-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <CheckCircle2 className={`w-5 h-5 ${todayOut ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`} />
            </div>
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Presensi Keluar</div>
              <div className="font-semibold">{todayOut ? 'Sudah Keluar' : 'Belum Keluar'}</div>
            </div>
          </div>
          {todayOut && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              <Clock className="w-4 h-4 inline mr-1" />
              {new Date(todayOut.executed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>

      {/* Auto presensi status */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${data?.settings?.enabled ? 'bg-green-100 dark:bg-green-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <Clock className={`w-5 h-5 ${data?.settings?.enabled ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`} />
            </div>
            <div>
              <div className="font-semibold">Auto Presensi</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {data?.settings?.enabled
                  ? `Aktif — Masuk: ${data.settings.check_in_time}, Keluar: ${data.settings.check_out_time}`
                  : 'Tidak aktif'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity (7 days) */}
      <div className="card">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Riwayat 7 Hari Terakhir
          </h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {weekLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">Belum ada riwayat presensi</div>
          ) : (
            weekLogs.slice(0, 10).map(log => (
              <div key={log.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  log.status === 'success' ? 'bg-green-100 dark:bg-green-900/40' : log.status === 'skipped' ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-red-100 dark:bg-red-900/40'
                }`}>
                  {log.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    : log.status === 'skipped' ? <Clock className="w-4 h-4 text-amber-600" />
                    : <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    Presensi {log.type === 'in' ? 'Masuk' : 'Keluar'}
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      log.status === 'success' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' :
                      log.status === 'skipped' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{log.message}</div>
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  {new Date(log.executed_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
    green: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    orange: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400',
  };
  return (
    <div className="card p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
