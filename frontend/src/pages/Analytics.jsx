import { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  TrendingUp, CheckCircle2, Clock, XCircle, Flame, Calendar,
  ChevronLeft, ChevronRight, X, Activity, Zap, Target, Award, User
} from 'lucide-react';
import { Skeleton, CardSkeleton } from '../components/Skeleton';

export function Analytics() {
  const { error } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [selectedDay, setSelectedDay] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Calendar state
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // WIB helpers — avoid UTC drift across 00:00–07:00 WIB
  const wibNow = useMemo(() => {
    const now = new Date();
    // Compute WIB "now" by shifting display to Asia/Jakarta
    const wib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    return wib;
  }, []);
  const wibDateStr = (d) => {
    // YYYY-MM-DD in Asia/Jakarta
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  const todayWIB = wibDateStr(wibNow);

  useEffect(() => {
    setLoading(true);
    api.getAnalytics(days)
      .then(setData)
      .catch(err => error('Gagal: ' + (err.data?.error || err.message)))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [data]);

  const stats = data?.stats || {};
  const daily = data?.daily || [];

  // Map daily data by date for quick lookup
  const dailyMap = useMemo(() => {
    const m = {};
    daily.forEach(d => { m[d.date] = d; });
    return m;
  }, [daily]);

  // Bar chart data (last N days, padded)
  const chartData = useMemo(() => {
    const result = [];
    const now = wibNow;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = wibDateStr(d);
      const entry = dailyMap[dateStr];
      result.push({
        date: dateStr,
        status: entry?.status || 'none',
        checkIn: entry?.checkIn || null,
        checkOut: entry?.checkOut || null,
        account: entry?.account || null,
        dayLabel: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        isToday: i === 0,
      });
    }
    return result;
  }, [dailyMap, days, wibNow]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = (firstDay.getDay() + 6) % 7; // Mon=0

    const cells = [];
    // Previous month padding
    for (let i = 0; i < startWeekday; i++) cells.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const entry = dailyMap[dateStr];
      cells.push({
        day: d,
        date: dateStr,
        status: entry?.status || 'none',
        checkIn: entry?.checkIn || null,
        checkOut: entry?.checkOut || null,
        account: entry?.account || null,
        isToday: dateStr === todayWIB,
        isFuture: new Date(dateStr + 'T00:00:00+07:00') > wibNow,
      });
    }
    return cells;
  }, [calYear, calMonth, dailyMap, todayWIB, wibNow]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  };

  // Intensity colors (0-4 levels)
  const intensity = (status) => {
    if (status === 'complete') return 4;
    if (status === 'partial') return 3;
    if (status === 'failed') return 1;
    return 0;
  };

  const intensityBg = (level) => {
    if (level === 4) return 'bg-emerald-500';
    if (level === 3) return 'bg-amber-500';
    if (level === 1) return 'bg-red-400';
    return 'bg-slate-200 dark:bg-slate-800';
  };

  const intensityOpacity = (level) => {
    if (level === 0) return 'opacity-30';
    return 'opacity-100';
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <CardSkeleton lines={1} /><CardSkeleton lines={1} /><CardSkeleton lines={1} /><CardSkeleton lines={1} /><CardSkeleton lines={1} />
      </div>
      <CardSkeleton lines={8} />
    </div>
  );

  return (
    <div className={`space-y-6 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Analytics Presensi
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Statistik presensi {days} hari terakhir · {stats.total || 0} hari kerja
          </p>
        </div>
        <select value={days} onChange={e => setDays(parseInt(e.target.value, 10))} className="input w-32">
          <option value={7}>7 hari</option>
          <option value={30}>30 hari</option>
          <option value={90}>90 hari</option>
        </select>
      </div>

      {/* Animated Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={TrendingUp} label="Success Rate" value={`${stats.successRate || 0}%`}
          color="from-blue-500 to-cyan-500" delay={0}
          sub={`${stats.complete || 0}/${stats.total || 0} hari`}
        />
        <StatCard
          icon={CheckCircle2} label="Lengkap" value={stats.complete || 0}
          color="from-emerald-500 to-green-500" delay={100}
          sub="masuk + pulang"
        />
        <StatCard
          icon={Clock} label="Rata-rata Masuk" value={stats.avgCheckIn || '-'}
          color="from-amber-500 to-orange-500" delay={200}
          sub="WIB"
        />
        <StatCard
          icon={Flame} label="Streak" value={`${stats.streak || 0} hari`}
          color="from-orange-500 to-red-500" delay={300}
          sub="beruntun"
        />
        <StatCard
          icon={Calendar} label="Hari Kerja" value={stats.total || 0}
          color="from-purple-500 to-pink-500" delay={400}
          sub={`${(days - (stats.total || 0))} absen`}
        />
      </div>

      {/* Animated Bar Chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Activity className="w-5 h-5 text-blue-500" />
            Grafik Presensi {days} Hari
          </h3>
          <div className="flex gap-2 text-xs">
            <LegendDot color="bg-emerald-500" label="Lengkap" />
            <LegendDot color="bg-amber-500" label="Sebagian" />
            <LegendDot color="bg-red-400" label="Gagal" />
            <LegendDot color="bg-slate-300 dark:bg-slate-700" label="Kosong" />
          </div>
        </div>

        {chartData.length === 0 ? (
          <div className="text-center text-slate-400 py-12">Belum ada data</div>
        ) : (
          <div className="relative">
            <div className="flex items-end gap-px h-48 overflow-x-auto pb-2">
              {chartData.map((d, i) => {
                const level = intensity(d.status);
                const height = level === 4 ? '100%' : level === 3 ? '65%' : level === 1 ? '30%' : '6%';
                const bg = level === 4 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                          : level === 3 ? 'bg-gradient-to-t from-amber-600 to-amber-400'
                          : level === 1 ? 'bg-gradient-to-t from-red-500 to-red-300'
                          : 'bg-slate-200 dark:bg-slate-800';
                return (
                  <div
                    key={i}
                    className="flex-1 min-w-[4px] relative group cursor-pointer"
                    style={{ height: '100%' }}
                    onMouseEnter={() => setHoveredBar(i)}
                    onMouseLeave={() => setHoveredBar(null)}
                    onClick={() => d.status !== 'none' && setSelectedDay(d)}
                  >
                    {/* Tooltip */}
                    {hoveredBar === i && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-20 shadow-xl">
                        <div className="font-bold">{d.date}</div>
                        <div className="text-slate-300 capitalize">{d.status === 'none' ? 'Tidak ada' : d.status}</div>
                        {d.account && <div className="text-slate-300">Akun: {d.account}</div>}
                        {d.checkIn && <div>Masuk: {new Date(d.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}</div>}
                        {d.checkOut && <div>Pulang: {new Date(d.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}</div>}
                        <div className={`mt-1 px-1.5 py-0.5 rounded text-[10px] ${
                          d.status === 'complete' ? 'bg-emerald-500' : d.status === 'partial' ? 'bg-amber-500' : d.status === 'failed' ? 'bg-red-500' : 'bg-slate-500'
                        }`}>Klik detail</div>
                      </div>
                    )}
                    {/* Bar */}
                    <div
                      className={`w-full ${bg} rounded-t transition-all duration-300 ease-out ${d.isToday ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900' : ''}`}
                      style={{
                        height,
                        transitionDelay: `${i * 8}ms`,
                        transform: mounted ? 'scaleY(1)' : 'scaleY(0)',
                        transformOrigin: 'bottom',
                      }}
                    />
                    {d.isToday && (
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-blue-500 font-bold whitespace-nowrap">Hari ini</div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* X axis labels */}
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>{chartData[0]?.date || ''}</span>
              <span>{chartData[Math.floor(chartData.length / 2)]?.date || ''}</span>
              <span>{chartData[chartData.length - 1]?.date || ''}</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Heatmap Calendar */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Calendar className="w-5 h-5 text-purple-500" />
            Kalender Presensi
          </h3>
          {/* Month/Year picker */}
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <select
              value={calMonth}
              onChange={e => setCalMonth(parseInt(e.target.value, 10))}
              className="input w-28 text-sm py-1"
            >
              {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <input
              type="number"
              value={calYear}
              onChange={e => setCalYear(parseInt(e.target.value, 10) || today.getFullYear())}
              className="input w-20 text-sm py-1"
            />
            <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((d, i) => {
            if (!d) return <div key={i} />;
            const level = intensity(d.status);
            const bg = intensityBg(level);
            const opacity = intensityOpacity(level);
            return (
              <button
                key={i}
                onClick={() => d.status !== 'none' && setSelectedDay(d)}
                disabled={d.isFuture || d.status === 'none'}
                className={`aspect-square flex items-center justify-center text-xs rounded-lg relative group transition-all duration-200 hover:scale-110 hover:z-10 ${bg} ${opacity} ${
                  d.isToday ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-slate-900' : ''
                } ${d.isFuture ? 'opacity-20 cursor-not-allowed' : d.status !== 'none' ? 'cursor-pointer' : 'cursor-default'}`}
                style={{
                  transform: mounted ? 'scale(1)' : 'scale(0.8)',
                  opacity: mounted ? (d.isFuture ? 0.2 : (level === 0 ? 0.3 : 1)) : 0,
                  transition: 'all 0.3s ease-out',
                  transitionDelay: `${i * 15}ms`,
                }}
              >
                <span className={`relative z-10 font-medium ${
                  level >= 3 ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                }`}>{d.day}</span>

                {/* Account badge */}
                {d.account && level > 0 && (
                  <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-blue-400 ring-1 ring-white/50" title={d.account} />
                )}

                {/* Intensity indicator dots */}
                {level > 0 && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {d.checkIn && <div className={`w-1 h-1 rounded-full ${level >= 3 ? 'bg-white' : 'bg-emerald-400'}`} />}
                    {d.checkOut && <div className={`w-1 h-1 rounded-full ${level >= 3 ? 'bg-white' : 'bg-emerald-400'}`} />}
                  </div>
                )}

                {/* Hover tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                  <div className="font-bold">{d.date}</div>
                  <div className="text-slate-300 capitalize">{d.status === 'none' ? 'Tidak ada data' : d.status}</div>
                  {d.account && <div className="text-slate-300">Akun: {d.account}</div>}
                  {d.checkIn && <div>Masuk: {new Date(d.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}</div>}
                  {d.checkOut && <div>Pulang: {new Date(d.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}</div>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
          <span className="text-slate-400">Intensitas:</span>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-800 opacity-30" />
            <span>Kosong</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-red-400" />
            <span>Gagal</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-amber-500" />
            <span>Sebagian</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-emerald-500" />
            <span>Lengkap</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <div className="w-1 h-1 rounded-full bg-emerald-400" />
            <span className="text-slate-400">= ada absen</span>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'scaleIn 0.2s ease-out' }}
          >
            {/* Gradient header */}
            <div className={`p-5 bg-gradient-to-r ${
              selectedDay.status === 'complete' ? 'from-emerald-500 to-green-600' :
              selectedDay.status === 'partial' ? 'from-amber-500 to-orange-600' :
              'from-red-500 to-rose-600'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white/80 text-sm">Detail Presensi</div>
                  <div className="text-white text-xl font-bold">
                    {new Date(selectedDay.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <button onClick={() => setSelectedDay(null)} className="text-white/80 hover:text-white p-1">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                {selectedDay.status === 'complete' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {selectedDay.status === 'partial' && <Clock className="w-5 h-5 text-amber-500" />}
                {selectedDay.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
                <span className="font-semibold capitalize text-slate-900 dark:text-slate-100">{selectedDay.status}</span>
              </div>

              {/* Account */}
              {selectedDay.account && (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Akun STAR</span>
                  </div>
                  <span className="font-bold text-blue-700 dark:text-blue-300 text-sm">{selectedDay.account}</span>
                </div>
              )}

              {/* Times */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Masuk</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedDay.checkIn
                      ? new Date(selectedDay.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB'
                      : 'Tidak ada'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Pulang</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedDay.checkOut
                      ? new Date(selectedDay.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB'
                      : 'Tidak ada'}
                  </span>
                </div>
              </div>

              {/* Duration */}
              {selectedDay.checkIn && selectedDay.checkOut && (
                <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">Durasi Kerja</span>
                  </div>
                  <span className="font-bold text-purple-700 dark:text-purple-300">
                    {(() => {
                      const diff = new Date(selectedDay.checkOut) - new Date(selectedDay.checkIn);
                      const h = Math.floor(diff / 3600000);
                      const m = Math.floor((diff % 3600000) / 60000);
                      return `${h}j ${m}m`;
                    })()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, delay, sub }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`card p-4 transition-all duration-500 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-2 shadow-lg`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      {sub && <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
      <span className={`w-2.5 h-2.5 rounded ${color}`} /> {label}
    </span>
  );
}
