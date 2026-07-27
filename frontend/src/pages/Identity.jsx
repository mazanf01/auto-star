import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { UserCircle, AlertCircle } from 'lucide-react';

export function Identity() {
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getIdentity().then(r => setIdentity(r.identity)).catch(e => setError(e.data?.error || e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

  if (error) return (
    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-red-900">{error}</div>
    </div>
  );

  const fields = [
    ['Nama', identity?.nama],
    ['NIP/NRP', identity?.nip],
    ['Tipe Pegawai', identity?.tipe],
    ['Status Kepegawaian', identity?.status],
    ['Pangkat/Golongan', identity?.pangkat],
    ['Jabatan', identity?.jabatan],
    ['Bagian', identity?.bagian],
    ['Unit Kerja', identity?.unitKerja],
    ['Tingkatan', identity?.tingkatan],
    ['Kelas Jabatan', identity?.kelasJabatan],
    ['Tunjangan Kinerja', identity?.tunjanganKinerja ? `Rp ${identity.tunjanganKinerja}` : null],
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Identitas Pegawai</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Data identitas dari STAR ASN</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <UserCircle className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-xl font-bold">{identity?.nama || '-'}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{identity?.nip || '-'}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(([label, value]) => (
            <div key={label} className="border-b border-slate-100 pb-2">
              <div className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</div>
              <div className="font-medium mt-0.5">{value || '-'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
