import { useState } from 'react';
import { api } from '../lib/api';
import { Wallet, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const PERIODS = [
  { code: '1501_1402', label: '15 Jan - 14 Feb' },
  { code: '1502_1403', label: '15 Feb - 14 Mar' },
  { code: '1503_1404', label: '15 Mar - 14 Apr' },
  { code: '1504_1405', label: '15 Apr - 14 Mei' },
  { code: '1505_1406', label: '15 Mei - 14 Jun' },
  { code: '1506_1407', label: '15 Jun - 14 Jul' },
  { code: '1507_1408', label: '15 Jul - 14 Agu' },
  { code: '1508_1409', label: '15 Agu - 14 Sep' },
  { code: '1509_1410', label: '15 Sep - 14 Okt' },
  { code: '1510_1411', label: '15 Okt - 14 Nov' },
  { code: '1511_1412', label: '15 Nov - 14 Des' },
  { code: '1512_1401', label: '15 Des - 14 Jan' },
  { code: 'THR', label: 'THR' },
  { code: 'GAJI13', label: 'Gaji ke-13' },
];

export function Tunkin() {
  const { warning } = useToast();
  const [year, setYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetch = async () => {
    if (!year || !period) { warning('Pilih tahun dan periode'); return; }
    setLoading(true);
    setError('');
    setData(null);
    try {
      const r = await api.getTunjangan(year, period);
      setData(r);
    } catch (err) {
      setError(err.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tunjangan Kinerja</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Cek tunjangan kinerja per periode</p>
      </div>

      {/* Selectors */}
      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Tahun</label>
          <input
            type="number"
            value={year}
            onChange={e => setYear(parseInt(e.target.value, 10))}
            className="input w-24"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm text-slate-500 dark:text-slate-400 block mb-1">Periode</label>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="input"
          >
            <option value="">— Pilih Periode —</option>
            {PERIODS.map(p => (
              <option key={p.code} value={p.code}>{p.label} ({p.code})</option>
            ))}
          </select>
        </div>
        <button
          onClick={fetch}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
          Cek
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-900">{error}</div>
        </div>
      )}

      {/* Result */}
      {data && (
        <div className="space-y-4">
          {/* Summary */}
          {data.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4">
                <div className="text-sm text-slate-500 dark:text-slate-400">Total Tunjangan</div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">Rp {(data.summary.totalAllowance || 0).toLocaleString('id-ID')}</div>
              </div>
              <div className="card p-4">
                <div className="text-sm text-slate-500 dark:text-slate-400">Total Potongan</div>
                <div className="text-xl font-bold text-red-600 dark:text-red-400">Rp {(data.summary.totalDeduction || 0).toLocaleString('id-ID')}</div>
              </div>
              <div className="card p-4">
                <div className="text-sm text-slate-500 dark:text-slate-400">Diterima</div>
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">Rp {(data.summary.totalReceived || 0).toLocaleString('id-ID')}</div>
              </div>
              <div className="card p-4">
                <div className="text-sm text-slate-500 dark:text-slate-400">Hari Dihitung</div>
                <div className="text-xl font-bold">{data.summary.daysCount || 0} hari</div>
              </div>
            </div>
          )}

          {/* Logs table */}
          {data.logs && data.logs.length > 0 && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">No</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Tanggal</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Shift</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Masuk</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Pulang</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Potongan</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.logs.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{i + 1}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{item.date || '-'}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">
                          {item.schedule_source === 'shift' ? (item.shift_name || 'Shift') : 'Reguler'}
                        </td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{item.clock_in || '-'}</td>
                        <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{item.clock_out || '-'}</td>
                        <td className="px-3 py-2 text-right text-slate-900 dark:text-slate-100">
                          {item.deduction_amount ? `Rp ${item.deduction_amount}` : '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{item.deduction_reason || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
