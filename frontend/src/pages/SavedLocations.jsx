import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { MapPicker } from '../components/MapPicker';
import { MapPin, Plus, Edit2, Trash2, Star, X, Loader2, Navigation } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

export function SavedLocations() {
  const { error } = useToast();
  const confirm = useConfirm();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', latitude: -6.2088, longitude: 106.8456, address: '', is_primary: false });
  const [detecting, setDetecting] = useState(false);

  const load = () => {
    setLoading(true);
    api.getLocations().then(r => setLocations(r.locations || [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.updateLocation(editing.id, form);
      } else {
        await api.createLocation(form);
      }
      setShowForm(false);
      setEditing(null);
      setForm({ name: '', latitude: -6.2088, longitude: 106.8456, address: '', is_primary: false });
      load();
    } catch (err) {
      error('Gagal: ' + (err.data?.error || err.message));
    }
  };

  const handleEdit = (loc) => {
    setEditing(loc);
    setForm({ name: loc.name, latitude: loc.latitude, longitude: loc.longitude, address: loc.address || '', is_primary: loc.is_primary });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const ok = await confirm({ title: 'Hapus lokasi?', type: 'danger', confirmText: 'Hapus' }); if (!ok) return;
    try { await api.deleteLocation(id); load(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  const handleSetPrimary = async (id) => {
    try { await api.setPrimaryLocation(id); load(); }
    catch (err) { error('Gagal: ' + (err.data?.error || err.message)); }
  };

  // GPS detect — set form coords
  const detectGPS = () => {
    if (!navigator.geolocation) { error('Geolocation tidak didukung browser ini'); return; }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
        setDetecting(false);
      },
      (err) => {
        error('Gagal deteksi GPS: ' + err.message);
        setDetecting(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Saved Locations</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kelola lokasi presensi (primary + random mode)</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ name: '', latitude: -6.2088, longitude: 106.8456, address: '', is_primary: false }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Tambah Lokasi
        </button>
      </div>

      {/* Locations list */}
      <div className="grid gap-3">
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400 dark:text-slate-500" /></div>
        ) : locations.length === 0 ? (
          <div className="card p-8 text-center text-slate-400 dark:text-slate-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
            Belum ada lokasi tersimpan
          </div>
        ) : (
          locations.map(loc => (
            <div key={loc.id} className="card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${loc.is_primary ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-blue-100 dark:bg-blue-900/40'}`}>
                {loc.is_primary ? <Star className="w-5 h-5 text-amber-600 fill-amber-500" /> : <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium flex items-center gap-2">
                  {loc.name}
                  {loc.is_primary && <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full">Primary</span>}
                </div>
                <div className="text-sm text-slate-400 dark:text-slate-500">{loc.address || '—'}</div>
                <div className="text-xs font-mono text-slate-400 dark:text-slate-500">{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</div>
              </div>
              <div className="flex items-center gap-1">
                {!loc.is_primary && (
                  <button onClick={() => handleSetPrimary(loc.id)} className="p-1.5 hover:bg-amber-50 dark:bg-amber-900/30 rounded" title="Set Primary">
                    <Star className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  </button>
                )}
                <button onClick={() => handleEdit(loc)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" /></button>
                <button onClick={() => handleDelete(loc.id)} className="p-1.5 hover:bg-red-50 dark:bg-red-900/30 dark:hover:bg-red-900/30 rounded"><Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{editing ? 'Edit Lokasi' : 'Tambah Lokasi'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Nama Lokasi</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="contoh: Kantor Pusat, Rumah, Kantor Cabang"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Alamat (opsional)</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Alamat lengkap"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Pilih Lokasi di Map</label>
                <MapPicker
                  initialLat={form.latitude}
                  initialLng={form.longitude}
                  onChange={(lat, lng) => setForm(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                  height="300px"
                />
              </div>
              {/* GPS detect button */}
              <button
                type="button"
                onClick={detectGPS}
                disabled={detecting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                Get Koordinat Sekarang (GPS)
              </button>
              <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
                <MapPin className="w-4 h-4" />
                <span className="font-mono">{form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={e => setForm({ ...form, is_primary: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Jadikan Primary Location</span>
              </label>
              <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium">Simpan</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
