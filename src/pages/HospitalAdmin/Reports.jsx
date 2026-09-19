import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import HospitalLayout from '../../components/HospitalLayout';

const Reports = () => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const hospitalName = "General Hospital Colombo"; 

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const q = query(collection(db, "mothers"), where("hospitalName", "==", hospitalName));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => doc.data());
        setReportData(data);
      } catch (err) {
        console.error("Report error:", err);
      }
      setLoading(false);
    };
    fetchReportData();
  }, []);

  const downloadCSV = () => {
    const headers = ["Name,NIC,Risk Status,Midwife,Area\n"];
    const rows = reportData.map(m => `"${m.fullName || ''}","${m.nic || ''}","${m.riskStatus || 'Normal'}","${m.midwifeName || ''}","${m.serviceArea || ''}"\n`);
    const blob = new Blob([...headers, ...rows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hospital_Report_${new Date().toLocaleDateString()}.csv`;
    a.click();
  };

  const highRiskCount = reportData.filter(m => m.riskStatus === 'High-Risk').length;

  return (
    <HospitalLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">වාර්තා සහ දත්ත විශ්ලේෂණය</h1>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{hospitalName} - Reports</p>
        </div>
        <button onClick={downloadCSV} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-md text-sm transition-all flex items-center gap-2">
          <span>📥</span> CSV බාගත කරන්න
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryBox label="මුළු ඇතුළත් කිරීම්" count={reportData.length} />
        <SummaryBox label="අධි-අවදානම් අවස්ථා" count={highRiskCount} alert={highRiskCount > 0} />
        <SummaryBox label="සාමාන්‍ය අවස්ථා" count={reportData.length - highRiskCount} />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
          <p className="text-gray-400 text-xs font-bold">වාර්තා දත්ත ලබාගනිමින් පවතී...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase">
              <tr>
                <th className="p-4">මවගේ නම</th>
                <th className="p-4">හැඳුනුම්පත</th>
                <th className="p-4">තත්ත්වය</th>
                <th className="p-4">ප්‍රදේශය</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {reportData.length > 0 ? (
                reportData.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-gray-700">{m.fullName}</td>
                    <td className="p-4 text-gray-500 font-mono">{m.nic || '—'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${m.riskStatus === 'High-Risk' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {m.riskStatus || 'Normal'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">{m.serviceArea || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-12 text-center text-gray-400 italic">
                    කිසිදු වාර්තා දත්තයක් හමු නොවීය.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </HospitalLayout>
  );
};

const SummaryBox = ({ label, count, alert }) => (
  <div className={`bg-white p-6 rounded-2xl border shadow-sm text-center ${alert ? 'border-red-200 bg-red-50/20' : 'border-gray-100'}`}>
    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{label}</p>
    <p className={`text-3xl font-black ${alert ? 'text-red-600' : 'text-slate-800'}`}>{count}</p>
  </div>
);

export default Reports;