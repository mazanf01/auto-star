import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Trash2, Power, X, Settings, Star } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';

export function AdminMenus() {
  const { success, error } = useToast();
  const confirm = useConfirm();
  const [menus, setMenus] = useState([]);
  const [users, setUsers] = useState([]);
  const [_loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', slug: '', icon: '', path: '', description: '', sort_order: 0, is_active: true, is_default_for_new: false });
  const [searchParams] = useSearchParams();
  const [selectedUser, setSelectedUser] = useState(searchParams.get('user') || '');
  const [userMenus, setUserMenus] = useState([]);

  const load = () => {
    setLoading(true);
    Promise.all([api.getAllMenus(), api.getUsers()])
      .then(([m, u]) => { setMenus(m.menus || []); setUsers(u.users || []); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Load user's menus when selected
  useEffect(() => {
    if (selectedUser) {
      api.getUserMenus(selectedUser).then(r => setUserMenus(r.menus || []));
    } else {
      setUserMenus([]);
    }
  }, [selectedUser]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.updateMenu(editing.id, form);
      else await api.createMenu(form);
      setShowForm(false);
      setEditing(null);
      success(editing ? 'Menu diperbarui' : 'Menu dibuat');
      setForm({ name: '', slug: '', icon: '', path: '', description: '', sort_order: 0, is_active: true, is_default_for_new: false });
      load();
    } catch (err) {
      error('Gagal: ' + (err.data?.error || err.message));
    }
  };

  const handleEdit = (m) => {
    setEditing(m);
    setForm({
      name: m.name,
      slug: m.slug,
      icon: m.icon || '',
      path: m.path || '',
      description: m.description || '',
      sort_order: m.sort_order,
      is_active: m.is_active,
      is_default_for_new: m.is_default_for_new || false,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Hapus menu?', text: 'Menu ini akan dihapus permanen', type: 'danger', confirmText: 'Hapus' }); if (!ok) return;
    try { await api.deleteMenu(id); success('Menu dihapus'); load(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const handleToggle = async (id) => {
    try { await api.toggleMenu(id); load(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const handleToggleDefault = async (id) => {
    try { await api.toggleMenuDefault(id); load(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const toggleUserMenu = async (menuId) => {
    const currentIds = userMenus.map(m => m.id);
    const newIds = currentIds.includes(menuId)
      ? currentIds.filter(id => id !== menuId)
      : [...currentIds, menuId];
    try {
      await api.assignUserMenus(selectedUser, newIds);
      api.getUserMenus(selectedUser).then(r => setUserMenus(r.menus || []));
    } catch (err) {
      error('Gagal: ' + (err.data?.error || err.message));
    }
  };

  const userMenuIds = new Set(userMenus.map(m => m.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Manajemen Menu</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kelola menu/fitur aplikasi dan hak akses user</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ name: '', slug: '', icon: '', path: '', description: '', sort_order: 0, is_active: true, is_default_for_new: false }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Tambah Menu
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Menus list */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100"><Settings className="w-4 h-4" /> Daftar Menu</h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {menus.map(m => (
              <div key={m.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800/50">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                    {m.is_default_for_new && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                    {m.name}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">/{m.slug} · {m.path}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${m.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                  {m.is_active ? 'Aktif' : 'Nonaktif'}
                </span>
                <button onClick={() => handleToggleDefault(m.id)} title="Toggle default untuk user baru" className={`p-1 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-800 rounded ${m.is_default_for_new ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`}>
                  <Star className={`w-4 h-4 ${m.is_default_for_new ? 'fill-amber-500' : ''}`} />
                </button>
                <button onClick={() => handleEdit(m)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-800 rounded"><Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" /></button>
                <button onClick={() => handleToggle(m.id)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:bg-slate-800 rounded"><Power className={`w-4 h-4 ${m.is_active ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-600'}`} /></button>
                <button onClick={() => handleDelete(m.id)} className="p-1 hover:bg-red-50 dark:bg-red-900/30 dark:hover:bg-red-900/30 rounded"><Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* User menu assignment */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">Atur Hak Akses User</h3>
            <select
              value={selectedUser}
              onChange={e => setSelectedUser(e.target.value)}
              className="input mt-2"
            >
              <option value="">— Pilih User —</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.email} ({u.role})</option>
              ))}
            </select>
          </div>
          {selectedUser ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
              {menus.map(m => (
                <label key={m.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userMenuIds.has(m.id)}
                    onChange={() => toggleUserMenu(m.id)}
                    className="w-4 h-4 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{m.name}</div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">/{m.slug}</div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">Pilih user untuk mengatur menu</div>
          )}
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{editing ? 'Edit Menu' : 'Tambah Menu'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-sm block mb-1 text-slate-700 dark:text-slate-300">Nama Menu</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input" required />
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-700 dark:text-slate-300">Slug</label>
                <input type="text" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })}
                  className="input" required />
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-700 dark:text-slate-300">Icon (lucide-react name)</label>
                <input type="text" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}
                  className="input" placeholder="LayoutDashboard" />
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-700 dark:text-slate-300">Path</label>
                <input type="text" value={form.path} onChange={e => setForm({ ...form, path: e.target.value })}
                  className="input" placeholder="/dashboard" />
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-700 dark:text-slate-300">Deskripsi</label>
                <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="input" />
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-700 dark:text-slate-300">Sort Order</label>
                <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value, 10) })}
                  className="input" />
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
                  <span className="text-sm">Aktif</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <input type="checkbox" checked={form.is_default_for_new} onChange={e => setForm({ ...form, is_default_for_new: e.target.checked })} />
                  <span className="text-sm flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500" /> Default untuk user baru
                  </span>
                </label>
              </div>
              <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Simpan</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
