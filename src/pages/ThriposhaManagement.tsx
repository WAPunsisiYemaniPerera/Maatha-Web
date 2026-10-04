import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Package, TrendingUp, AlertTriangle, FileSpreadsheet } from 'lucide-react';

export interface ThriposhaRecord {
  id: string;
  motherName: string;
  motherNIC: string;
  packetsQuantity: number;
  totalWeightGrams: number;
  reason: string;
  batchNumber: string;
  issuedDate: any;
  nextDueDate: any;
}

export const ThriposhaManagement: React.FC = () => {
  const [records, setRecords] = useState<ThriposhaRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const q = query(collection(db, 'thriposha_records'), orderBy('issuedDate', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetched: ThriposhaRecord[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ThriposhaRecord));
        setRecords(fetched);
      } catch (err) {
        console.error("Error fetching Thriposha records: ", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  const totalPackets = records.reduce((sum, r) => sum + (Number(r.packetsQuantity) || 0), 0);
  const totalWeightKg = (totalPackets * 0.75).toFixed(1);

  const handleExportCSV = () => {
    if (records.length === 0) {
      alert("වාර්තාව බාගත කිරීමට දත්ත නොමැත (No records to export).");
      return;
    }

    try {
      const headers = ['Mother Name', 'Mother NIC', 'Packets Quantity', 'Total Weight (g)', 'Batch Number', 'Reason', 'Issued Date'];
      const rows = records.map(rec => {
        let dateStr = '-';
        if (rec.issuedDate?.toDate) {
          dateStr = new Date(rec.issuedDate.toDate()).toLocaleDateString();
        } else if (rec.issuedDate?.seconds) {
          dateStr = new Date(rec.issuedDate.seconds * 1000).toLocaleDateString();
        } else if (rec.issuedDate) {
          dateStr = new Date(rec.issuedDate).toLocaleDateString();
        }

        return [
          `"${(rec.motherName || '').replace(/"/g, '""')}"`,
          `"${(rec.motherNIC || '').replace(/"/g, '""')}"`,
          rec.packetsQuantity || 0,
          rec.totalWeightGrams || (Number(rec.packetsQuantity || 0) * 750),
          `"${(rec.batchNumber || '').replace(/"/g, '""')}"`,
          `"${(rec.reason || '').replace(/"/g, '""')}"`,
          `"${dateStr}"`
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Thriposha_Distribution_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export CSV Error:", e);
      alert("CSV ගොනුව බාගත කිරීමේදී දෝෂයක් සිදු විය.");
    }
  };

  const formatIssuedDate = (dateVal: any) => {
    if (!dateVal) return '-';
    if (typeof dateVal.toDate === 'function') {
      return new Date(dateVal.toDate()).toLocaleDateString();
    }
    if (dateVal.seconds) {
      return new Date(dateVal.seconds * 1000).toLocaleDateString();
    }
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-900">ත්‍රිපෝෂ බෙදාහැරීම් කළමනාකරණය</h1>
          <p className="text-sm text-slate-500">MOH Regional Thriposha Stock & Distribution Tracking</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition shadow-sm active:scale-95"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Excel / CSV වාර්තාව ලබාගන්න
        </button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Package className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">මුළු නිකුත් කළ පැකට් ගණන</p>
            <h3 className="text-2xl font-black text-slate-800">{loading ? '...' : totalPackets} පැකට්</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">මුළු බර (Total Weight)</p>
            <h3 className="text-2xl font-black text-slate-800">{loading ? '...' : totalWeightKg} Kg</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">MOH ගබඩා තොගය</p>
            <h3 className="text-2xl font-black text-amber-600">450 පැකට් (ප්‍රමාණවත්)</h3>
          </div>
        </div>
      </div>

      {/* Distribution Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-100/50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">මෑතකදී නිකුත් කළ ත්‍රිපෝෂ ලේඛනය</h3>
          <span className="text-xs text-slate-500 font-semibold">වාර්තා ගණන: {records.length}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p className="text-xs font-semibold">දත්ත පූරණය වෙමින් පවතී...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic text-xs">
            තවමත් ත්‍රිපෝෂ බෙදාහැරීම් වාර්තා කිසිවක් ඇතුළත් කර නොමැත. (No Thriposha records found)
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">මවගේ නම</th>
                  <th className="p-3">ජා.හැ.අ (NIC)</th>
                  <th className="p-3">පැකට් ගණන</th>
                  <th className="p-3">Batch අංකය</th>
                  <th className="p-3">හේතුව</th>
                  <th className="p-3">නිකුත් කළ දිනය</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-semibold text-slate-900">{rec.motherName || '—'}</td>
                    <td className="p-3 font-mono">{rec.motherNIC || '—'}</td>
                    <td className="p-3 font-bold text-emerald-800">
                      {rec.packetsQuantity || 0} පැකට් {rec.totalWeightGrams ? `(${rec.totalWeightGrams}g)` : `(${Number(rec.packetsQuantity || 0) * 750}g)`}
                    </td>
                    <td className="p-3 font-mono text-blue-700">{rec.batchNumber || '—'}</td>
                    <td className="p-3">{rec.reason || '—'}</td>
                    <td className="p-3">{formatIssuedDate(rec.issuedDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThriposhaManagement;
