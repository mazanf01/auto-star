import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Loader2, RotateCcw, Save, Zap, Shield, Clock, Bell, Server, Eye, EyeOff, KeyRound, CheckCircle2, XCircle } from 'lucide-react';

const PRESETS = {
  gentle: {
    label: '🐢 Gentle',
    desc: 'Santai, retry pelan, tidak agresif',
    settings: {
      presensi_max_retries: 2, presensi_retry_delay_ms: 10000, presensi_retry_backoff: true,
      presensi_retry_backoff_multiplier: 2, presensi_retry_max_delay_ms: 30000,
      star_login_max_retries: 2, star_login_retry_delay_ms: 5000,
      presensi_jitter_min_ms: 1000, presensi_jitter_max_ms: 5000,
      notify_on_success: true, notify_on_failure: true, notify_on_skipped: false,
      notify_on_holiday: true, notify_on_weekend: false, notify_on_no_credentials: true,
    },
  },
  balanced: {
    label: '⚖️ Balanced',
    desc: 'Default, seimbang antara cepat & stabil',
    settings: {
      presensi_max_retries: 3, presensi_retry_delay_ms: 5000, presensi_retry_backoff: true,
      presensi_retry_backoff_multiplier: 2, presensi_retry_max_delay_ms: 30000,
      star_login_max_retries: 3, star_login_retry_delay_ms: 3000,
      presensi_jitter_min_ms: 0, presensi_jitter_max_ms: 0,
      notify_on_success: true, notify_on_failure: true, notify_on_skipped: true,
      notify_on_holiday: true, notify_on_weekend: true, notify_on_no_credentials: true,
    },
  },
  aggressive: {
    label: '🚀 Aggressive',
    desc: 'Cepat, retry agresif, banyak notif',
    settings: {
      presensi_max_retries: 5, presensi_retry_delay_ms: 2000, presensi_retry_backoff: true,
      presensi_retry_backoff_multiplier: 1.5, presensi_retry_max_delay_ms: 15000,
      star_login_max_retries: 5, star_login_retry_delay_ms: 2000,
      presensi_jitter_min_ms: 0, presensi_jitter_max_ms: 1000,
      notify_on_success: true, notify_on_failure: true, notify_on_skipped: true,
      notify_on_holiday: true, notify_on_weekend: true, notify_on_no_credentials: true,
    },
  },
};

export function AdminSettings() {
  const { success, error } = useToast();
  const confirm = useConfirm();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.getPresensiConfig().then(r => setConfig(r.settings)).catch(err => error('Gagal: ' + (err.data?.error || err.message))).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const applyPreset = async (presetKey) => {
    const preset = PRESETS[presetKey];
    const ok = await confirm({ title: `Preset: ${preset.label}?`, text: preset.desc, type: 'info', confirmText: 'Terapkan' });
    if (!ok) return;
    setSaving(true);
    try {
      await api.savePresensiConfig(preset.settings);
      success(`Preset ${preset.label} diterapkan`);
      load();
    } catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
    finally { setSaving(false); }
  };

  const handleReset = async () => {
    const ok = await confirm({ title: 'Reset ke default?', text: 'Semua kembali ke nilai awal', type: 'warning', confirmText: 'Reset' });
    if (!ok) return;
    try { await api.resetPresensiConfig(); success('Reset ke default'); load(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));
  const updateKeywords = (text) => {
    const arr = text.split(',').map(s => s.trim()).filter(Boolean);
    update('presensi_already_done_keywords', arr);
  };

  if (loading || !config) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">System Config</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Atur behavior auto-presensi. Pilih preset atau custom.</p>
        </div>
        <button onClick={handleReset} className="flex items-center gap-1 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      {/* Quick Presets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(PRESETS).map(([key, p]) => (
          <button key={key} onClick={() => applyPreset(key)} disabled={saving}
            className="card p-5 text-left hover:ring-2 hover:ring-blue-500 transition-all disabled:opacity-50">
            <div className="text-2xl mb-2">{p.label}</div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{p.desc}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded">Retry: {p.settings.presensi_max_retries}x</span>
              <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded">Delay: {p.settings.presensi_retry_delay_ms}ms</span>
            </div>
          </button>
        ))}
      </div>

      {/* Toggle sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ToggleSection icon={Zap} title="Retry" config={config} update={update} fields={[
          { key: 'presensi_max_retries', label: 'Max Retry', type: 'number', suffix: 'x' },
          { key: 'presensi_retry_delay_ms', label: 'Delay Awal', type: 'number', suffix: 'ms' },
          { key: 'presensi_retry_backoff', label: 'Exponential Backoff', type: 'toggle' },
          { key: 'presensi_retry_backoff_multiplier', label: 'Backoff Multiplier', type: 'number', suffix: 'x' },
          { key: 'presensi_retry_max_delay_ms', label: 'Max Delay', type: 'number', suffix: 'ms' },
        ]} />
        <ToggleSection icon={Shield} title="Login" config={config} update={update} fields={[
          { key: 'star_login_max_retries', label: 'Max Login Retry', type: 'number', suffix: 'x' },
          { key: 'star_login_retry_delay_ms', label: 'Login Delay', type: 'number', suffix: 'ms' },
          { key: 'star_login_timeout_ms', label: 'Login Timeout', type: 'number', suffix: 'ms' },
          { key: 'star_session_reuse', label: 'Reuse Session', type: 'toggle' },
          { key: 'star_session_validate_before_use', label: 'Validate Session', type: 'toggle' },
        ]} />
        <ToggleSection icon={Bell} title="Notifikasi" config={config} update={update} fields={[
          { key: 'notify_on_success', label: 'Sukses', type: 'toggle' },
          { key: 'notify_on_failure', label: 'Gagal', type: 'toggle' },
          { key: 'notify_on_skipped', label: 'Sudah Absen', type: 'toggle' },
          { key: 'notify_on_holiday', label: 'Holiday', type: 'toggle' },
          { key: 'notify_on_weekend', label: 'Weekend', type: 'toggle' },
          { key: 'notify_on_no_credentials', label: 'No Akun', type: 'toggle' },
        ]} />
        <ToggleSection icon={Clock} title="Jitter & Checks" config={config} update={update} fields={[
          { key: 'presensi_jitter_min_ms', label: 'Jitter Min', type: 'number', suffix: 'ms' },
          { key: 'presensi_jitter_max_ms', label: 'Jitter Max', type: 'number', suffix: 'ms' },
          { key: 'presensi_check_already_done_local', label: 'Cek Already Done', type: 'toggle' },
          { key: 'presensi_check_holiday', label: 'Cek Holiday', type: 'toggle' },
          { key: 'presensi_check_workday', label: 'Cek Work Day', type: 'toggle' },
        ]} />
      </div>

      {/* Keywords */}
      <div className="card p-5">
        <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Already-Done Keywords</h3>
        <p className="text-xs text-slate-400 mb-2">Pisah dengan koma. Jika response STAR ASN mengandung kata ini → tidak retry, langsung skip.</p>
        <input type="text" value={(config.presensi_already_done_keywords || []).join(', ')} onChange={e => updateKeywords(e.target.value)}
          className="input" placeholder="sudah presensi, already, sudah absen" />
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button onClick={async () => {
          setSaving(true);
          try { await api.savePresensiConfig(config); success('Disimpan'); load(); }
          catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
          finally { setSaving(false); }
        }} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Simpan Perubahan
        </button>
      </div>
    </div>
  );
}

function ToggleSection({ icon: Icon, title, config, update, fields }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-100">
        <Icon className="w-4 h-4" /> {title}
      </h3>
      <div className="space-y-3">
        {fields.map(f => (
          <div key={f.key} className="flex items-center justify-between gap-3">
            <label className="text-sm text-slate-600 dark:text-slate-400">{f.label}</label>
            {f.type === 'toggle' ? (
              <button type="button" onClick={() => update(f.key, !config[f.key])}
                className={`relative w-11 h-6 rounded-full transition-colors ${config[f.key] ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${config[f.key] ? 'translate-x-5' : ''}`} />
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <input type="number" value={config[f.key] || 0} onChange={e => update(f.key, parseInt(e.target.value, 10) || 0)}
                  className="input w-24 text-right" />
                {f.suffix && <span className="text-xs text-slate-400">{f.suffix}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
