import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { MapPicker } from '../components/MapPicker';
import { Clock, Save, Loader2, CheckCircle2, MapPin, Shuffle, Map, Navigation } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export function AutoPresensi() {
  const { error } = useToast();
  const [settings, setSettings] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getPresensiSettings(),
      api.getLocations(),
    ]).then(([r1, r2]) => {
      setSettings(r1.settings);
      setLocations(r2.locations || []);
    }).finally(() => setLoading(false));
  }, []);

  const update = (field, value) => setSettings(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const r = await api.updatePresensiSettings(settings);
      setSettings(r.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      error('Gagal menyimpan: ' + (err.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) { error('Geolocation tidak didukung browser ini'); return; }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update('latitude', pos.coords.latitude);
        update('longitude', pos.coords.longitude);
        setDetecting(false);
      },
      (err) => {
        error('Gagal deteksi GPS: ' + err.message);
        setDetecting(false);
      },
      { enableHighAccuracy: true }
    );
  };

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

  const defaults = {
    enabled: false, check_in_time: '08:00', check_out_time: '16:00',
    latitude: -6.2088, longitude: 106.8456, timezone: 'Asia/Jakarta',
    work_days: [1, 2, 3, 4, 5], force_mode: true,
    check_in_random: 0, check_out_random: 0, location_mode: 'primary',
  };
  const s = { ...defaults, ...settings };
  const hasLocations = locations.length > 0;

  const days = [
    { val: 0, label: 'Min' }, { val: 1, label: 'Sen' }, { val: 2, label: 'Sel' },
    { val: 3, label: 'Rab' }, { val: 4, label: 'Kam' }, { val: 5, label: 'Jum' }, { val: 6, label: 'Sab' },
  ];

  const toggleDay = (val) => {
    const days = s.work_days || [];
    update('work_days', days.includes(val) ? days.filter(d => d !== val) : [...days, val].sort());
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Auto Presensi</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Atur presensi otomatis harian dengan random range & lokasi</p>
      </div>

      {/* Enable toggle */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className={`w-5 h-5 ${s.enabled ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`} />
          <div>
            <div className="font-medium">Status Auto Presensi</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{s.enabled ? 'Aktif' : 'Tidak aktif'}</div>
          </div>
        </div>
        <button
          onClick={() => update('enabled', !s.enabled)}
          className={`relative w-12 h-6 rounded-full transition-colors ${s.enabled ? 'bg-green-600' : 'bg-slate-300'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${s.enabled ? 'translate-x-6' : ''}`} />
        </button>
      </div>

      {/* Time settings + random range */}
      <div className="card p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Clock className="w-4 h-4" /> Waktu Presensi & Random Range</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Jam Masuk</label>
            <input
              type="time"
              value={s.check_in_time}
              onChange={e => update('check_in_time', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Jam Keluar</label>
            <input
              type="time"
              value={s.check_out_time}
              onChange={e => update('check_out_time', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
              <Shuffle className="w-3 h-3" /> Random Masuk (± menit)
            </label>
            <input
              type="number"
              min="0"
              max="60"
              value={s.check_in_random}
              onChange={e => update('check_in_random', parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">0 = exact time, 15 = 07:45–08:15</p>
          </div>
          <div>
            <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1">
              <Shuffle className="w-3 h-3" /> Random Keluar (± menit)
            </label>
            <input
              type="number"
              min="0"
              max="60"
              value={s.check_out_random}
              onChange={e => update('check_out_random', parseInt(e.target.value, 10) || 0)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">0 = exact time, 10 = 15:50–16:10</p>
          </div>
        </div>
      </div>

      {/* Work days */}
      <div className="card p-4">
        <h3 className="font-semibold mb-3">Hari Kerja</h3>
        <div className="flex gap-2 flex-wrap">
          {days.map(d => (
            <button
              key={d.val}
              onClick={() => toggleDay(d.val)}
              className={`w-12 h-12 rounded-lg font-medium text-sm transition-colors ${
                (s.work_days || []).includes(d.val)
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Lokasi — 3 options */}
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><Map className="w-4 h-4" /> Mode Lokasi</h3>
        <div className="grid grid-cols-3 gap-3">
          {/* Primary — disabled (abu-abu) jika no locations */}
          <button
            onClick={() => hasLocations && update('location_mode', 'primary')}
            disabled={!hasLocations}
            className={`p-3 rounded-lg border-2 text-left transition-colors ${
              !hasLocations
                ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 opacity-50 cursor-not-allowed'
                : s.location_mode === 'primary'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <MapPin className={`w-4 h-4 mb-1 ${hasLocations ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <div className="text-sm font-medium">Primary</div>
            <div className="text-xs text-slate-400 dark:text-slate-500">Lokasi primary</div>
          </button>
          {/* Random — disabled (abu-abu) jika no locations */}
          <button
            onClick={() => hasLocations && update('location_mode', 'random')}
            disabled={!hasLocations}
            className={`p-3 rounded-lg border-2 text-left transition-colors ${
              !hasLocations
                ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 opacity-50 cursor-not-allowed'
                : s.location_mode === 'random'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <Shuffle className={`w-4 h-4 mb-1 ${hasLocations ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`} />
            <div className="text-sm font-medium">Random</div>
            <div className="text-xs text-slate-400 dark:text-slate-500">Acak dari saved</div>
          </button>
          {/* Tunjuk di Map — selalu aktif */}
          <button
            onClick={() => update('location_mode', 'map')}
            className={`p-3 rounded-lg border-2 text-left transition-colors ${
              s.location_mode === 'map'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <Map className="w-4 h-4 mb-1 text-green-600 dark:text-green-400" />
            <div className="text-sm font-medium">Tunjuk di Map</div>
            <div className="text-xs text-slate-400 dark:text-slate-500">Klik map atau GPS</div>
          </button>
        </div>
        {!hasLocations && (
          <p className="text-xs text-amber-600">
            Belum ada saved locations. Tambah di <a href="/saved-locations" className="underline font-medium">halaman Saved Locations</a> atau gunakan Tunjuk di Map.
          </p>
        )}
        {hasLocations && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Kelola saved locations di <a href="/saved-locations" className="text-blue-500 hover:underline">halaman Saved Locations</a>
          </p>
        )}
      </div>

      {/* Map picker — muncul jika mode = map ATAU tidak ada saved locations */}
      {(s.location_mode === 'map' || !hasLocations) && (
        <div className="card p-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> Lokasi di Map</h3>
          <MapPicker
            initialLat={s.latitude}
            initialLng={s.longitude}
            onChange={(lat, lng) => { update('latitude', lat); update('longitude', lng); }}
            radius={100}
            height="250px"
          />
          <button
            onClick={handleDetectGPS}
            disabled={detecting}
            className="mt-3 flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg font-medium disabled:opacity-50"
          >
            {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
            Get Koordinat Sekarang (GPS)
          </button>
        </div>
      )}

      {/* Advanced */}
      <div className="card p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={s.force_mode}
            onChange={e => update('force_mode', e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <div>
            <div className="font-medium text-sm">Force Mode</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">IPv4, bypass TLS fingerprinting, HTTP/1.1 forced</div>
          </div>
        </label>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Pengaturan
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Tersimpan
          </span>
        )}
      </div>
    </div>
  );
}
