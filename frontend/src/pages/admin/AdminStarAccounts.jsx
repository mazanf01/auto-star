import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Loader2, Eye, EyeOff, KeyRound, Trash2, RefreshCw, User, Shield, X, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

export function AdminStarAccounts() {
  const { success, error } = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null); // user_id yang di-expand
  const [showPasswords, setShowPasswords] = useState({}); // credId → bool
  const [checking, setChecking] = useState(null); // credId yang sedang check session
  const [sessionResult, setSessionResult] = useState({}); // credId → result
  const [modalUser, setModalUser] = useState(null); // user untuk modal popup

  const load = () => {
    setLoading(true);
    api.getAdminStarAccounts().then(r => setUsers(r.users || [])).catch(err => error('Gagal: ' + (err.data?.error || err.message))).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const togglePassword = (credId) => setShowPasswords(prev => ({ ...prev, [credId]: !prev[credId] }));

  const handleCheckSession = async (credId) => {
    setChecking(credId);
    try {
      const r = await api.checkStarSession(credId);
      setSessionResult(prev => ({ ...prev, [credId]: r }));
      if (r.ok) success(`Session OK: ${r.username}`);
      else error(`Gagal: ${r.error || r.status}`);
    } catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
    finally { setChecking(null); }
  };

  const handleDelete = async (credId, username) => {
    const ok = await confirm({ title: 'Hapus akun STAR?', text: username, type: 'danger', confirmText: 'Hapus' });
    if (!ok) return;
    try { await api.deleteStarAccountAdmin(credId); success('Dihapus'); load(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const totalAccounts = users.reduce((sum, u) => sum + u.star_account_count, 0);
  const usersWithAccounts = users.filter(u => u.star_account_count > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Akun STAR ASN</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {totalAccounts} akun di {usersWithAccounts.length} user. Klik user untuk expand.
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* User list */}
      <div className="card overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {usersWithAccounts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500">
              <KeyRound className="w-12 h-12 mx-auto mb-2 opacity-50" />
              Belum ada akun STAR ASN tersimpan
            </div>
          ) : (
            users.filter(u => u.star_account_count > 0).map(u => (
              <div key={u.id}>
                {/* User header */}
                <button
                  onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                    {u.email?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{u.full_name || u.email}</div>
                    <div className="text-xs text-slate-400">{u.email}</div>
                  </div>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    {u.star_account_count} akun
                  </span>
                </button>

                {/* Expanded accounts */}
                {expanded === u.id && (
                  <div className="bg-slate-50 dark:bg-slate-800/30 p-3 space-y-2">
                    {u.star_accounts.map(acct => (
                      <div key={acct.id} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-2 h-2 rounded-full ${acct.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                          <span className="font-medium text-sm text-slate-900 dark:text-slate-100">{acct.username}</span>
                          {acct.label && <span className="text-xs text-slate-400">· {acct.label}</span>}
                          {acct.is_active && <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded">AKTIF</span>}
                        </div>

                        {/* Password row */}
                        <div className="flex items-center gap-2 mb-2">
                          <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                          <code className="text-xs text-slate-600 dark:text-slate-400 flex-1 font-mono">
                            {showPasswords[acct.id] ? acct.password : '•'.repeat(Math.min(acct.password.length, 20))}
                          </code>
                          <button onClick={() => togglePassword(acct.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                            {showPasswords[acct.id] ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                          </button>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handleCheckSession(acct.id)}
                            disabled={checking === acct.id}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 disabled:opacity-50"
                          >
                            {checking === acct.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
                            Check Session
                          </button>
                          <button
                            onClick={() => setModalUser({ ...u, selectedAccount: acct })}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200"
                          >
                            <ExternalLink className="w-3 h-3" /> Detail
                          </button>
                          <button
                            onClick={() => handleDelete(acct.id, acct.username)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded hover:bg-red-200"
                          >
                            <Trash2 className="w-3 h-3" /> Hapus
                          </button>
                        </div>

                        {/* Session result */}
                        {sessionResult[acct.id] && (
                          <div className={`mt-2 p-2 rounded text-xs ${sessionResult[acct.id].ok ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                            <div className="flex items-center gap-1 mb-1">
                              {sessionResult[acct.id].ok ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <XCircle className="w-3 h-3 text-red-600" />}
                              <span className="font-medium">{sessionResult[acct.id].ok ? `Login: ${sessionResult[acct.id].login_mode}` : 'Login Gagal'}</span>
                            </div>
                            {sessionResult[acct.id].error && <div className="text-red-600 dark:text-red-400">{sessionResult[acct.id].error}</div>}
                            {sessionResult[acct.id].identity && (
                              <div className="mt-1 space-y-0.5">
                                {sessionResult[acct.id].identity.nama && <div>Nama: {sessionResult[acct.id].identity.nama}</div>}
                                {sessionResult[acct.id].identity.nip && <div>NIP: {sessionResult[acct.id].identity.nip}</div>}
                                {sessionResult[acct.id].identity.unit_kerja && <div>Unit: {sessionResult[acct.id].identity.unit_kerja}</div>}
                                {sessionResult[acct.id].identity.jabatan && <div>Jabatan: {sessionResult[acct.id].identity.jabatan}</div>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal popup for user + account detail */}
      {modalUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalUser(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header gradient */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-5 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white text-xl font-bold">
                    {modalUser.email?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{modalUser.full_name || modalUser.email}</h3>
                    <p className="text-sm text-white/80">{modalUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setModalUser(null)} className="text-white/80 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Account info */}
              <div>
                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Akun STAR ASN</h4>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-2">
                  <InfoRow label="Username" value={modalUser.selectedAccount.username} />
                  <InfoRow label="Password" value={showPasswords[modalUser.selectedAccount.id] ? modalUser.selectedAccount.password : '••••••••••••'} action={
                    <button onClick={() => togglePassword(modalUser.selectedAccount.id)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
                      {showPasswords[modalUser.selectedAccount.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  } />
                  <InfoRow label="Label" value={modalUser.selectedAccount.label || '-'} />
                  <InfoRow label="Status" value={modalUser.selectedAccount.is_active ? 'AKTIF' : 'Nonaktif'} />
                  <InfoRow label="Saved" value={new Date(modalUser.selectedAccount.saved_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                </div>
              </div>

              {/* Session/Identity */}
              {sessionResult[modalUser.selectedAccount.id] && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Session & Identity</h4>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 space-y-2">
                    {(() => {
                      const r = sessionResult[modalUser.selectedAccount.id];
                      return (
                        <>
                          <InfoRow label="Login Status" value={r.ok ? `OK (${r.login_mode})` : 'Gagal'} />
                          {r.identity && typeof r.identity === 'object' && !r.identity.error && Object.entries(r.identity).map(([k, v]) => (
                            <InfoRow key={k} label={k} value={String(v)} />
                          ))}
                          {r.identity?.error && <InfoRow label="Error" value={r.identity.error} />}
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleCheckSession(modalUser.selectedAccount.id)}
                  disabled={checking === modalUser.selectedAccount.id}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {checking === modalUser.selectedAccount.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  Check Session & Identity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, action }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 w-24 flex-shrink-0">{label}</span>
      <code className="text-sm text-slate-900 dark:text-slate-100 flex-1 font-mono break-all">{value}</code>
      {action}
    </div>
  );
}
