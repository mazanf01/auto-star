import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { Lock, Loader2, Smartphone, Trash2, Star, Plus, X, Shield, Send } from 'lucide-react';

export function Profile() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const confirm = useConfirm();
  const [pwd, setPwd] = useState({ current_password: '', new_password: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  // Sessions (Phase 4)
  const [sessions, setSessions] = useState([]);

  // Multi-account STAR ASN (Phase 4)
  const [accounts, setAccounts] = useState([]);
  const [showAcctForm, setShowAcctForm] = useState(false);
  const [acctForm, setAcctForm] = useState({ star_username: '', star_password: '', label: '' });

  const loadSessions = () => api.getSessions().then(r => setSessions(r.sessions || [])).catch(() => {});
  const loadAccounts = () => api.getStarCredentials().then(r => { setAccounts(r.credentials || []); }).catch(() => {});

  useEffect(() => { loadSessions(); loadAccounts(); }, []);

  const handlePwd = async (e) => {
    e.preventDefault();
    setSavingPwd(true);
    try {
      await api.changePassword(pwd.current_password, pwd.new_password);
      success('Password berhasil diubah');
      setPwd({ current_password: '', new_password: '' });
    } catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
    finally { setSavingPwd(false); }
  };

  // Session management
  const handleRevokeSession = async (id) => {
    const ok = await confirm({ title: 'Revoke session?', text: 'Device ini akan di-logout', type: 'danger', confirmText: 'Revoke' });
    if (!ok) return;
    try { await api.revokeSession(id); success('Session direvoke'); loadSessions(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const handleRevokeAll = async () => {
    const ok = await confirm({ title: 'Revoke semua session lain?', text: 'Semua device lain akan di-logout', type: 'danger', confirmText: 'Revoke All' });
    if (!ok) return;
    try { await api.revokeAllOtherSessions(); success('Session lain direvoke'); loadSessions(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  // Multi-account
  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      await api.saveStarCredentials(acctForm.star_username, acctForm.star_password, acctForm.label);
      success('Akun STAR ASN ditambahkan');
      setShowAcctForm(false);
      setAcctForm({ star_username: '', star_password: '', label: '' });
      loadAccounts();
    } catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const handleActivateAccount = async (id) => {
    try { await api.activateStarAccount(id); success('Akun diaktifkan'); loadAccounts(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const handleDeleteAccount = async (id, username) => {
    const ok = await confirm({ title: 'Hapus akun STAR ASN?', text: username, type: 'danger', confirmText: 'Hapus' });
    if (!ok) return;
    try { await api.deleteStarAccount(id); success('Akun dihapus'); loadAccounts(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profil</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kelola informasi akun Anda</p>
      </div>

      {/* Info */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{user?.full_name || user?.email}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</div>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Multi-account STAR ASN (Phase 4) */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100"><Shield className="w-4 h-4" /> Akun STAR ASN</h3>
          <button onClick={() => setShowAcctForm(!showAcctForm)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>

        {showAcctForm && (
          <form onSubmit={handleAddAccount} className="space-y-3 mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Tambah Akun BARU</span>
              <button type="button" onClick={() => setShowAcctForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <input type="text" placeholder="Username STAR ASN" value={acctForm.star_username}
              onChange={e => setAcctForm({ ...acctForm, star_username: e.target.value })}
              className="input" required />
            <input type="password" placeholder="Password STAR ASN" value={acctForm.star_password}
              onChange={e => setAcctForm({ ...acctForm, star_password: e.target.value })}
              className="input" required />
            <input type="text" placeholder="Label (opsional, cth: Akun Utama)" value={acctForm.label}
              onChange={e => setAcctForm({ ...acctForm, label: e.target.value })}
              className="input" />
            <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm">Simpan & Aktifkan</button>
          </form>
        )}

        {accounts.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">Belum ada akun STAR ASN. Klik "Tambah" untuk menambahkan.</p>
        ) : (
          <div className="space-y-2">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${a.is_active ? 'bg-green-100 dark:bg-green-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <Star className={`w-4 h-4 ${a.is_active ? 'text-green-600 dark:text-green-400 fill-green-600 dark:fill-green-400' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{a.star_username}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{a.label || 'Tanpa label'} · {a.is_active ? 'AKTIF' : 'Nonaktif'}</div>
                </div>
                {!a.is_active && (
                  <button onClick={() => handleActivateAccount(a.id)} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/60">Aktifkan</button>
                )}
                <button onClick={() => handleDeleteAccount(a.id, a.star_username)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Management (Phase 4) */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100"><Smartphone className="w-4 h-4" /> Sesi Aktif</h3>
          {sessions.length > 1 && (
            <button onClick={handleRevokeAll} className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded hover:bg-red-200">Revoke Lainnya</button>
          )}
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">Tidak ada sesi aktif tercatat</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <Smartphone className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {s.device_info || 'Device'} {i === 0 && <span className="text-xs text-green-600 dark:text-green-400">(Saat ini)</span>}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    {s.ip_address || '-'} · Last active: {new Date(s.last_active).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {i !== 0 && (
                  <button onClick={() => handleRevokeSession(s.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change password */}
      <form onSubmit={handlePwd} className="card p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100"><Lock className="w-4 h-4" /> Ubah Password</h3>
        <div>
          <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Password Saat Ini</label>
          <input type="password" value={pwd.current_password}
            onChange={e => setPwd({ ...pwd, current_password: e.target.value })}
            className="input" required />
        </div>
        <div>
          <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Password Baru</label>
          <input type="password" value={pwd.new_password}
            onChange={e => setPwd({ ...pwd, new_password: e.target.value })}
            className="input" required />
        </div>
        <button type="submit" disabled={savingPwd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
          {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          Ubah Password
        </button>
      </form>

      {/* Telegram Notification */}
      <TelegramSection user={user} success={success} error={error} />
    </div>
  );
}

function TelegramSection({ user, success, error }) {
  const [status, setStatus] = useState(null);
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  const load = () => {
    setLoading(true);
    api.getTelegramStatus().then(r => {
      setStatus(r);
      setChatId(r.chatId ? String(r.chatId) : '');
    }).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSaveChatId = async (e) => {
    e.preventDefault();
    if (!chatId) return;
    try {
      await api.setTelegramChatId(chatId);
      success('Telegram Chat ID disimpan');
      load();
    } catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await api.testTelegram();
      success('Test notifikasi Telegram terkirim!');
    } catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
    finally { setTesting(false); }
  };

  if (loading) return null;

  const configured = status?.configured;
  const enabled = status?.enabled;

  return (
    <div className="card p-6">
      <h3 className="font-semibold flex items-center gap-2 mb-4 text-slate-900 dark:text-slate-100">
        <Send className="w-4 h-4" /> Notifikasi Telegram
      </h3>

      {!configured ? (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            ⚠️ Telegram Bot belum dikonfigurasi admin. Hubungi admin untuk setup bot token terlebih dahulu.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className={`px-2 py-0.5 rounded-full text-xs ${enabled ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
              {enabled ? 'AKTIF' : 'NONAKTIF'}
            </span>
            <span className="text-slate-500 dark:text-slate-400">Bot terhubung</span>
          </div>

          <form onSubmit={handleSaveChatId} className="space-y-3">
            <div>
              <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Telegram Chat ID</label>
              <input type="text" value={chatId} onChange={e => setChatId(e.target.value)}
                placeholder="contoh: 123456789"
                className="input" />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Buka Telegram → kirim /start ke bot Anda → dapatkan Chat ID
              </p>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
                Simpan Chat ID
              </button>
              {chatId && (
                <button type="button" onClick={handleTest} disabled={testing}
                  className="flex items-center gap-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium disabled:opacity-50">
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Test Kirim
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
