import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Send, Save, Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

export function AdminTelegram() {
  const { success, error } = useToast();
  const confirm = useConfirm();
  const [botToken, setBotToken] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [botInfo, setBotInfo] = useState(null);
  const [webhookInfo, setWebhookInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getTelegramStatus().catch(() => ({})),
      api.getTelegramMe().catch(() => ({})),
      api.getTelegramWebhookInfo().catch(() => ({})),
    ]).then(([status, me, wh]) => {
      setEnabled(status.enabled || false);
      setBotInfo(me.result || null);
      setWebhookInfo(wh.result || null);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.saveTelegramSettings({ bot_token: botToken, enabled });
      success('Pengaturan Telegram disimpan');
      setBotToken('');
      load();
    } catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Telegram Bot</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Konfigurasi bot untuk notifikasi presensi</p>
      </div>

      {/* Bot status */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${botInfo ? 'bg-green-100 dark:bg-green-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
            {botInfo ? <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" /> : <XCircle className="w-5 h-5 text-slate-400" />}
          </div>
          <div>
            <div className="font-medium text-slate-900 dark:text-slate-100">{botInfo ? `@${botInfo.username}` : 'Bot belum terhubung'}</div>
            <div className="text-sm text-slate-400">{botInfo ? botInfo.first_name : 'Masukkan bot token untuk mulai'}</div>
          </div>
          {enabled && <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">AKTIF</span>}
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Bot Token</label>
            <input type="password" value={botToken} onChange={e => setBotToken(e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="input" />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Dapatkan token dari <a href="https://t.me/BotFather" target="_blank" rel="noopener" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">@BotFather <ExternalLink className="w-3 h-3" /></a>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setEnabled(!enabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${enabled ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-400">Aktifkan notifikasi Telegram</span>
          </div>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Pengaturan
          </button>
        </form>
      </div>

      {/* Webhook info */}
      {webhookInfo && (
        <div className="card p-5">
          <h3 className="font-semibold mb-3 text-slate-900 dark:text-slate-100">Webhook Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">URL:</span>
              <span className="text-slate-900 dark:text-slate-100 truncate max-w-xs">{webhookInfo.url || '(tidak set)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Pending updates:</span>
              <span className="text-slate-900 dark:text-slate-100">{webhookInfo.pending_update_count || 0}</span>
            </div>
            {webhookInfo.last_error_message && (
              <div className="text-red-500 text-xs mt-2">Error: {webhookInfo.last_error_message}</div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card p-5">
        <h3 className="font-semibold mb-3 text-slate-900 dark:text-slate-100">Cara Setup</h3>
        <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-400 list-decimal list-inside">
          <li>Buka <a href="https://t.me/BotFather" target="_blank" rel="noopener" className="text-blue-500 hover:underline">@BotFather</a> di Telegram</li>
          <li>Kirim <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">/newbot</code> → ikuti instruksi</li>
          <li>Copy bot token → paste di atas</li>
          <li>Aktifkan toggle, klik Simpan</li>
          <li>Buka bot Anda → kirim <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">/start</code></li>
          <li>Copy Chat ID yang dikirim bot → masukkan di Profil → Telegram</li>
        </ol>
      </div>
    </div>
  );
}
