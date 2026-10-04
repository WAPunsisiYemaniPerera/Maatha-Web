import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import MOHLayout from '../../components/MOHLayout';
import { Package, TrendingUp, AlertTriangle, FileSpreadsheet, Search, RefreshCw, Layers } from 'lucide-react';

const MOHThriposhaManagement = () => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mohArea, setMohArea] = useState('Colombo');

  // Load Admin Profile
  useEffect(() => {
    const fetchAdmin = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, "moh_admins", user.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data?.mohArea) setMohArea(data.mohArea);
          }
        } catch (err) {
          console.error("Error loading MOH profile:", err);
        }
      }
    };
    fetchAdmin();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'thriposha_records'), orderBy('issuedDate', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetched = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecords(fetched);
      setFilteredRecords(fetched);
    } catch (err) {
      console.error("Error fetching Thriposha records: ", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRecords(records);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredRecords(
        records.filter(r =>
          (r.motherName && r.motherName.toLowerCase().includes(lower)) ||
          (r.motherNIC && r.motherNIC.toLowerCase().includes(lower)) ||
          (r.batchNumber && r.batchNumber.toLowerCase().includes(lower)) ||
          (r.reason && r.reason.toLowerCase().includes(lower))
        )
      );
    }
  }, [searchTerm, records]);

  const totalPackets = records.reduce((sum, r) => sum + (Number(r.packetsQuantity) || 0), 0);
  const totalWeightKg = (totalPackets * 0.75).toFixed(1);

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert("වාර්තාව බාගත කිරීමට දත්ත නොමැත (No records to export).");
      return;
    }

    try {
      const headers = ['Mother Name', 'Mother NIC', 'Packets Quantity', 'Total Weight (g)', 'Batch Number', 'Reason', 'Issued Date'];
      const rows = filteredRecords.map(rec => {
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
      link.setAttribute('download', `MOH_Thriposha_Distribution_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export CSV Error:", e);
      alert("CSV ගොනුව බාගත කිරීමේදී දෝෂයක් සිදු විය.");
    }
  };

  const formatIssuedDate = (dateVal) => {
    if (!dateVal) return '-';
    if (typeof dateVal.toDate === 'function') {
      return new Date(dateVal.toDate()).toLocaleDateString('si-LK');
    }
    if (dateVal.seconds) {
      return new Date(dateVal.seconds * 1000).toLocaleDateString('si-LK');
    }
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('si-LK');
  };

  return (
    <MOHLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Title Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <Package className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black text-emerald-950">ත්‍රිපෝෂ බෙදාහැරීම් කළමනාකරණය</h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              MOH Regional Thriposha Stock, Allocation & Beneficiary Tracking ({mohArea})
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              onClick={fetchRecords}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition shadow-sm"
              title="නැවත පූරණය කරන්න"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={handleExportCSV}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-200 active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel / CSV වාර්තාව ලබාගන්න</span>
            </button>
          </div>
        </div>

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="p-3.5 bg-emerald-50 text-emerald-700 rounded-2xl">
              <Package className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">මුළු නිකුත් කළ පැකට් ගණන</p>
              <h3 className="text-2xl font-black text-slate-800">{loading ? '...' : totalPackets} <span className="text-sm font-bold text-slate-500">පැකට්</span></h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Total Distributed Packets</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-teal-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="p-3.5 bg-teal-50 text-teal-700 rounded-2xl">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">මුළු බර (Total Weight)</p>
              <h3 className="text-2xl font-black text-slate-800">{loading ? '...' : totalWeightKg} <span className="text-sm font-bold text-slate-500">Kg</span></h3>
              <p className="text-[11px] text-teal-600 font-semibold mt-0.5">750g Per Certified Packet</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="p-3.5 bg-amber-50 text-amber-700 rounded-2xl">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">MOH ගබඩා තොගය</p>
              <h3 className="text-2xl font-black text-amber-600">450 <span className="text-sm font-bold text-amber-700">පැකට්</span></h3>
              <span className="inline-block mt-0.5 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md">ප්‍රමාණවත් (In Stock)</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="මවගේ නම, NIC හෝ Batch අංකය සොයන්න..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          <div className="text-xs text-slate-500 font-semibold self-end sm:self-center">
            ප්‍රතිඵල: <span className="font-bold text-slate-800">{filteredRecords.length}</span> / {records.length}
          </div>
        </div>

        {/* Distribution Data Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-800 text-sm">මෑතකදී නිකුත් කළ ත්‍රිපෝෂ ලේඛනය</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recent Thriposha Distribution Log</p>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
              <p className="text-xs font-bold text-slate-600">ත්‍රිපෝෂ දත්ත පූරණය වෙමින් පවතී... (Loading Thriposha Data)</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-16 text-center text-slate-400 space-y-2">
              <Layers className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-bold">
                {searchTerm ? 'සෙවීමට අදාළ කිසිදු ත්‍රිපෝෂ වාර්තාවක් හමු නොවීය.' : 'තවමත් ත්‍රිපෝෂ බෙදාහැරීම් වාර්තා කිසිවක් ඇතුළත් කර නොමැත.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">මවගේ නම (Mother Name)</th>
                    <th className="p-4">ජා.හැ.අ (NIC)</th>
                    <th className="p-4">පැකට් ගණන (Qty)</th>
                    <th className="p-4">Batch අංකය</th>
                    <th className="p-4">හේතුව (Eligibility)</th>
                    <th className="p-4 text-right">නිකුත් කළ දිනය</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredRecords.map(rec => (
                    <tr key={rec.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="p-4 font-bold text-slate-900">{rec.motherName || '—'}</td>
                      <td className="p-4 font-mono font-semibold text-slate-700">{rec.motherNIC || '—'}</td>
                      <td className="p-4 font-bold text-emerald-800">
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200">
                          {rec.packetsQuantity || 0} පැකට් {rec.totalWeightGrams ? `(${rec.totalWeightGrams}g)` : `(${Number(rec.packetsQuantity || 0) * 750}g)`}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-blue-700">{rec.batchNumber || '—'}</td>
                      <td className="p-4 text-slate-700">{rec.reason || 'පෝෂණ අවශ්‍යතාවය'}</td>
                      <td className="p-4 text-right font-semibold text-slate-800">{formatIssuedDate(rec.issuedDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MOHLayout>
  );
};

export default MOHThriposhaManagement;
