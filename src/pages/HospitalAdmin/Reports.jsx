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
    const rows = reportData.map(m => `${m.fullName},${m.nic},${m.riskStatus},${m.midwifeName},${m.serviceArea}\n`);
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hospital_Report_${new Date().toLocaleDateString()}.csv`;
    a.click();
  };

  return (
    <HospitalLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">මාසික සාරාංශ වාර්තා</h2>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Hospital Monthly Medical Analytics</p>
        </div>
        <button 
          onClick={downloadCSV}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
        >
          වාර්තාව බාගත කරන්න (Download CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryBox label="මුළු ඇතුළත් කිරීම්" count={reportData.length} />
        <SummaryBox label="අධි-අවදානම් අවස්ථා" count={reportData.filter(m => m.riskStatus === 'High-Risk').length} />
        <SummaryBox label="ප්‍රසූත වාර්තා" count={reportData.filter(m => m.status === 'Post-natal').length} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase">
            <tr>
              <th className="p-4">මවගේ නම</th>
              <th className="p-4">හැඳුනුම්පත</th>
              <th className="p-4">තත්ත්වය</th>
              <th className="p-4">ප්‍රදේශය</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {reportData.map((m, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-bold text-gray-700">{m.fullName}</td>
                <td className="p-4 text-gray-500">{m.nic}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${m.riskStatus === 'High-Risk' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {m.riskStatus}
                  </span>
                </td>
                <td className="p-4 text-gray-500">{m.serviceArea}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </HospitalLayout>
  );
};

const SummaryBox = ({ label, count }) => (
  <div className="bg-white p-6 rounded-2xl border border-indigo-50 shadow-sm text-center">
    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">{label}</p>
    <p className="text-3xl font-black text-slate-800">{count}</p>
  </div>
);

export default Reports;