import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Plus, Edit2, Trash2, Power, X, CheckSquare, Square, Menu } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { TableSkeleton } from '../../components/Skeleton';

export function AdminUsers() {
  const { success, error } = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'user', is_active: true });
  const [selected, setSelected] = useState(new Set());
  const [bulkMenuModal, setBulkMenuModal] = useState(false);
  const [allMenus, setAllMenus] = useState([]);
  const [bulkMenuSelection, setBulkMenuSelection] = useState(new Set());

  const load = () => {
    setLoading(true);
    api.getUsers().then(r => setUsers(r.users || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const updates = { ...form };
        if (!updates.password) delete updates.password;
        await api.updateUser(editing.id, updates);
      } else {
        await api.createUser(form);
      }
      setShowForm(false);
      setEditing(null);
      success(editing ? 'User diperbarui' : 'User dibuat');
      setForm({ email: '', password: '', full_name: '', role: 'user', is_active: true });
      load();
    } catch (err) {
      error('Gagal: ' + (err.data?.error || err.message));
    }
  };

  const handleEdit = (u) => {
    setEditing(u);
    setForm({ email: u.email, password: '', full_name: u.full_name || '', role: u.role, is_active: u.is_active });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Hapus user?', text: 'User ini akan dihapus permanen', type: 'danger', confirmText: 'Hapus' }); if (!ok) return;
    try {
      await api.deleteUser(id);
      success('User dihapus');
      load();
    } catch (err) {
      error('Gagal: ' + (err.data?.error || err.message));
    }
  };

  const handleToggle = async (id) => {
    try { await api.toggleUser(id); load(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  // ─── Bulk handlers (Phase 2 #3) ─────────────────────────────
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === users.length) setSelected(new Set());
    else setSelected(new Set(users.map(u => u.id)));
  };

  const bulkIds = () => Array.from(selected);

  const handleBulkActivate = async () => {
    if (!selected.size) return;
    try { await api.bulkActivateUsers(bulkIds()); success(`${selected.size} user diaktifkan`); setSelected(new Set()); load(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const handleBulkDeactivate = async () => {
    if (!selected.size) return;
    const ok = await confirm({ title: 'Nonaktifkan user?', text: `${selected.size} user akan dinonaktifkan`, type: 'warning', confirmText: 'Nonaktifkan' }); if (!ok) return;
    try { await api.bulkDeactivateUsers(bulkIds()); success(`${selected.size} user dinonaktifkan`); setSelected(new Set()); load(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const handleBulkDelete = async () => {
    if (!selected.size) return;
    const ok = await confirm({ title: 'Hapus user?', text: `${selected.size} user akan dihapus. Tidak bisa diundo!`, type: 'danger', confirmText: 'Hapus' }); if (!ok) return;
    try { await api.bulkDeleteUsers(bulkIds()); success(`${selected.size} user dihapus`); setSelected(new Set()); load(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const openBulkMenuModal = async () => {
    if (!selected.size) return;
    try {
      const r = await api.getAllMenus();
      setAllMenus(r.menus || []);
      setBulkMenuSelection(new Set());
      setBulkMenuModal(true);
    } catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const toggleBulkMenu = (mid) => {
    setBulkMenuSelection(prev => {
      const next = new Set(prev);
      if (next.has(mid)) next.delete(mid); else next.add(mid);
      return next;
    });
  };

  const handleBulkAssignMenus = async () => {
    if (!selected.size || !bulkMenuSelection.size) return;
    try {
      await api.bulkAssignMenus(bulkIds(), Array.from(bulkMenuSelection));
      setBulkMenuModal(false);
      setSelected(new Set());
      load();
    } catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manajemen User</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kelola akun pengguna aplikasi</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ email: '', password: '', full_name: '', role: 'user', is_active: true }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Tambah User
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{editing ? 'Edit User' : 'Tambah User'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-sm block mb-1 text-slate-700 dark:text-slate-300">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="input" required />
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-700 dark:text-slate-300">Password {editing && '(kosongkan jika tidak diubah)'}</label>
                <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input" required={!editing} />
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-700 dark:text-slate-300">Nama Lengkap</label>
                <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="input" />
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-700 dark:text-slate-300">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="input">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                <span className="text-sm">Aktif</span>
              </label>
              <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Simpan</button>
            </form>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-blue-900">{selected.size} user dipilih</span>
          <div className="flex-1" />
          <button onClick={handleBulkActivate} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">Aktifkan</button>
          <button onClick={handleBulkDeactivate} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium">Nonaktifkan</button>
          <button onClick={openBulkMenuModal} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"><Menu className="w-4 h-4" /> Assign Menu</button>
          <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">Hapus</button>
          <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium">Batal</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-4"><TableSkeleton rows={5} cols={5} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="table-head">
                <tr>
                  <th className="text-left px-4 py-3 font-medium w-10">
                    <button onClick={toggleSelectAll} title="Select all" className="p-0.5">
                      {selected.size === users.length && users.length > 0
                        ? <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        : <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Nama</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Menu Access</th>
                  <th className="text-right px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map(u => (
                  <tr key={u.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800/50 ${selected.has(u.id) ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleSelect(u.id)} className="p-0.5">
                        {selected.has(u.id)
                          ? <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          : <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{u.email}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{u.full_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${u.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/admin/menus?user=${u.id}`} className="text-blue-600 dark:text-blue-400 text-xs hover:underline">Atur Menu</a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(u)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-800 rounded"><Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" /></button>
                        <button onClick={() => handleToggle(u.id)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-800 rounded"><Power className={`w-4 h-4 ${u.is_active ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-600'}`} /></button>
                        <button onClick={() => handleDelete(u.id)} className="p-1.5 hover:bg-red-50 dark:bg-red-900/30 dark:hover:bg-red-900/30 rounded"><Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk assign menu modal */}
      {bulkMenuModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100"><Menu className="w-4 h-4" /> Assign Menu ke {selected.size} User</h3>
              <button onClick={() => setBulkMenuModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-800 rounded"><X className="w-4 h-4 text-slate-500 dark:text-slate-400" /></button>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {allMenus.map(m => (
                <label key={m.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800 rounded cursor-pointer text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={bulkMenuSelection.has(m.id)}
                    onChange={() => toggleBulkMenu(m.id)}
                  />
                  <span className="text-sm">{m.name}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">/{m.slug}</span>
                </label>
              ))}
            </div>
            <button
              onClick={handleBulkAssignMenus}
              disabled={!bulkMenuSelection.size}
              className="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium"
            >
              Assign {bulkMenuSelection.size} menu ke {selected.size} user
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
