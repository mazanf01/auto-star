import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { MapPicker } from '../components/MapPicker';
import { Fingerprint, LogOut, MapPin, Loader2, AlertCircle, KeyRound, CheckCircle2, Star, Navigation, X } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export function Presensi() {
  const { error: toastError } = useToast();
  const [cred, setCred] = useState(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [coords, setCoords] = useState({ lat: -6.2088, lng: 106.8456 });
  const [error, setError] = useState('');
  const [showCredForm, setShowCredForm] = useState(false);
  const [starCred, setStarCred] = useState({ username: '', password: '' });

  const [locSource, setLocSource] = useState('saved');
  const [locations, setLocations] = useState([]);
  const [selectedLocId, setSelectedLocId] = useState('');
  const [showNoLocModal, setShowNoLocModal] = useState(false);

  useEffect(() => {
    api.getStarCredentials().then(r => setCred(r.credential)).catch(() => {});
    api.getLocations().then(r => {
      const locs = r.locations || [];
      setLocations(locs);
      const primary = locs.find(l => l.is_primary) || locs[0];
      if (primary) {
        setSelectedLocId(primary.id);
        setCoords({ lat: primary.latitude, lng: primary.longitude });
        setLocSource('saved');
      } else {
        setLocSource('map');
        setShowNoLocModal(true);
      }
    }).catch(() => {
      setLocSource('map');
      setShowNoLocModal(true);
    });
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoadingStatus(true);
    try {
      const r = await api.getPresensiStatus();
      setStatus(r.status);
    } catch { /* no creds yet */ }
    setLoadingStatus(false);
  };

  const getLocation = () => {
    if (!navigator.geolocation) { toastError('Geolocation tidak didukung browser ini'); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocSource('map');
      },
      err => toastError('Gagal mendapatkan lokasi: ' + err.message),
      { enableHighAccuracy: true }
    );
  };

  const handleSelectLocation = (id) => {
    setSelectedLocId(id);
    const loc = locations.find(l => l.id === id);
    if (loc) setCoords({ lat: loc.latitude, lng: loc.longitude });
  };

  const handlePresensi = async (type) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const r = await api.doPresensi(type, coords.lat, coords.lng, 'Asia/Jakarta');
      setResult(r);
      loadStatus();
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCred = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.saveStarCredentials(starCred.username, starCred.password);
      const r = await api.getStarCredentials();
      setCred(r.credential);
      setShowCredForm(false);
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Presensi Manual</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Lakukan presensi masuk/keluar secara manual</p>
      </div>

      {/* Credential status */}
      {!cred ? (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-amber-900">Belum ada kredensial STAR ASN</div>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Simpan username & password STAR ASN untuk melakukan presensi</p>
              <button onClick={() => setShowCredForm(!showCredForm)} className="mt-2 text-sm text-amber-900 underline">
                {showCredForm ? 'Tutup' : 'Simpan kredensial →'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <div className="font-medium text-green-900">Kredensial tersimpan: {cred.star_username}</div>
              <button onClick={() => setShowCredForm(!showCredForm)} className="text-sm text-green-700 dark:text-green-300 underline">
                {showCredForm ? 'Tutup' : 'Ubah'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCredForm && (
        <form onSubmit={handleSaveCred} className="bg-white border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1">STAR ASN Username</label>
            <input
              type="text"
              value={starCred.username}
              onChange={e => setStarCred({ ...starCred, username: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">STAR ASN Password</label>
            <input
              type="password"
              value={starCred.password}
              onChange={e => setStarCred({ ...starCred, password: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      )}

      {/* ─── Location source selector ─── */}
      <div className="card p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Sumber Lokasi</h3>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setLocSource('saved')}
            disabled={locations.length === 0}
            className={`p-3 rounded-lg border-2 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              locSource === 'saved' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <Star className="w-4 h-4 mb-1 text-amber-500" />
            <div className="text-sm font-medium">Saved Location</div>
            <div className="text-xs text-slate-400 dark:text-slate-500">Pilih dari lokasi tersimpan</div>
          </button>
          <button
            onClick={() => setLocSource('map')}
            className={`p-3 rounded-lg border-2 text-left transition-colors ${
              locSource === 'map' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <MapPin className="w-4 h-4 mb-1 text-blue-600 dark:text-blue-400" />
            <div className="text-sm font-medium">Tunjuk di Map</div>
            <div className="text-xs text-slate-400 dark:text-slate-500">Klik map atau GPS</div>
          </button>
        </div>

        {/* Saved location dropdown */}
        {locSource === 'saved' && (
          <div className="space-y-3">
            {locations.length === 0 ? (
              <div className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                Belum ada saved locations. <a href="/saved-locations" className="text-blue-500 hover:underline">Tambah sekarang →</a>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Pilih Lokasi</label>
                  <select
                    value={selectedLocId}
                    onChange={e => handleSelectLocation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} {loc.is_primary ? '★' : ''} — {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <span className="font-mono">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Map picker */}
        {locSource === 'map' && (
          <div className="space-y-3">
            <MapPicker
              initialLat={coords.lat}
              initialLng={coords.lng}
              onChange={(lat, lng) => setCoords({ lat, lng })}
              height="300px"
            />
            <button
              onClick={getLocation}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg"
            >
              <Navigation className="w-4 h-4" /> Deteksi GPS
            </button>
          </div>
        )}
      </div>

      {/* Presensi status */}
      {loadingStatus && (
        <div className="card p-4 text-sm text-slate-400 dark:text-slate-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat status...
        </div>
      )}
      {status && (
        <div className="card p-4">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">Status Presensi Hari Ini</div>
          <pre className="text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg overflow-x-auto">{JSON.stringify(status, null, 2)}</pre>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-900">{error}</div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="font-medium text-green-900">Presensi berhasil</span>
          </div>
          <pre className="text-xs bg-white/50 dark:bg-slate-800/50 p-3 rounded-lg overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handlePresensi('in')}
          disabled={loading || !cred}
          className="flex flex-col items-center gap-2 py-6 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Fingerprint className="w-6 h-6" />}
          Presensi Masuk
        </button>
        <button
          onClick={() => handlePresensi('out')}
          disabled={loading || !cred}
          className="flex flex-col items-center gap-2 py-6 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogOut className="w-6 h-6" />}
          Presensi Keluar
        </button>
      </div>

      {/* Simple modal: warning belum ada saved locations */}
      {showNoLocModal && locations.length === 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNoLocModal(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white relative">
              <button onClick={() => setShowNoLocModal(false)} className="absolute top-4 right-4 text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-2">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg">Belum Ada Lokasi Tersimpan</h3>
            </div>
            <div className="p-5 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                Anda belum menambahkan lokasi presensi. Tambahkan lokasi di halaman Saved Locations.
              </p>
              <a
                href="/saved-locations"
                className="block w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm"
              >
                Ke Halaman Saved Locations →
              </a>
              <button
                onClick={() => setShowNoLocModal(false)}
                className="mt-2 w-full py-2 text-sm text-slate-400 hover:text-slate-600 dark:text-slate-400"
              >
                Nanti saja
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
