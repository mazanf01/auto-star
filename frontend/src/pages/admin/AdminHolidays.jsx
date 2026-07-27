import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { Plus, Edit2, Trash2, X, Calendar } from 'lucide-react';
import { Skeleton } from '../../components/Skeleton';

export function AdminHolidays() {
  const { success, error } = useToast();
  const confirm = useConfirm();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', date: '', type: 'custom' });

  const load = () => {
    setLoading(true);
    api.getHolidays(year).then(r => setHolidays(r.holidays || [])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [year]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.updateHoliday(editing.id, form);
      else await api.createHoliday(form);
      success(editing ? 'Libur diperbarui' : 'Libur ditambahkan');
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', date: '', type: 'custom' });
      load();
    } catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const handleEdit = (h) => {
    setEditing(h);
    setForm({ name: h.name, date: h.date, type: h.type });
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    const ok = await confirm({ title: 'Hapus libur?', text: name, type: 'danger', confirmText: 'Hapus' });
    if (!ok) return;
    try { await api.deleteHoliday(id); success('Libur dihapus'); load(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const typeColors = {
    national: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    religious: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    custom: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Kalender Libur</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Auto-skip presensi di hari libur</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="number" value={year} onChange={e => setYear(parseInt(e.target.value, 10))}
            className="input w-24" />
          <button onClick={() => { setEditing(null); setForm({ name: '', date: '', type: 'custom' }); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-4"><Skeleton lines={8} /></div>
      ) : holidays.length === 0 ? (
        <div className="card p-8 text-center text-slate-400 dark:text-slate-500">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Tidak ada hari libur di tahun {year}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {holidays.map(h => (
              <div key={h.id} className="p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-900 dark:text-slate-100">{h.name}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">
                    {new Date(h.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${typeColors[h.type] || typeColors.custom}`}>{h.type}</span>
                <button onClick={() => handleEdit(h)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" /></button>
                <button onClick={() => handleDelete(h.id, h.name)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">{editing ? 'Edit Libur' : 'Tambah Libur'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-sm block mb-1 text-slate-700 dark:text-slate-300">Nama Libur</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input" required />
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-700 dark:text-slate-300">Tanggal</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  className="input" required />
              </div>
              <div>
                <label className="text-sm block mb-1 text-slate-700 dark:text-slate-300">Tipe</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input">
                  <option value="national">Nasional</option>
                  <option value="religious">Keagamaan</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Simpan</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
