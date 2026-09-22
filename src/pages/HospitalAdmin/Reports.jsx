import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import HospitalLayout from '../../components/HospitalLayout';
import { isHighRiskMother } from '../../utils/securityValidators';

const Reports = () => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hospitalName, setHospitalName] = useState('General Hospital Colombo'); 

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      let currentHosp = "General Hospital Colombo";
      const user = auth.currentUser;
      
      if (user) {
        try {
          const adminDoc = await getDoc(doc(db, "hospital_admins", user.uid));
          if (adminDoc.exists() && adminDoc.data().hospitalName) {
            currentHosp = adminDoc.data().hospitalName;
          } else {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().hospitalName) {
              currentHosp = userDoc.data().hospitalName;
            }
          }
        } catch (err) {
          console.error("Report hospital fetch error:", err);
        }
      }
      setHospitalName(currentHosp);

      try {
        const q = query(collection(db, "mothers"), where("hospitalName", "==", currentHosp));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReportData(data);
      } catch (err) {
        console.error("Report error:", err);
      }
      setLoading(false);
    };
    fetchReportData();
  }, []);

  const downloadCSV = () => {
    const headers = ["Name,NIC,Risk Status,Blood Group,EDD,Midwife,Area\n"];
    const rows = reportData.map(m => `"${m.fullName || ''}","${m.nic || ''}","${isHighRiskMother(m) ? 'High-Risk' : 'Normal'}","${m.bloodGroup || '—'}","${m.edd || '—'}","${m.midwifeName || ''}","${m.serviceArea || m.mohArea || ''}"\n`);
    const blob = new Blob([...headers, ...rows], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${hospitalName.replace(/\s+/g, '_')}_Maternal_Report_${new Date().toLocaleDateString()}.csv`;
    a.click();
  };

  const highRiskCount = reportData.filter(m => isHighRiskMother(m)).length;

  return (
    <HospitalLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">වෛද්‍ය වාර්තා සහ දත්ත විශ්ලේෂණය</h1>
          <p className="text-xs text-teal-600 font-bold uppercase tracking-wider mt-1">{hospitalName} - Clinical Reports</p>
        </div>
        <button onClick={downloadCSV} className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-6 py-3 rounded-2xl font-bold shadow-md shadow-teal-600/20 text-xs uppercase tracking-wider transition-all flex items-center gap-2 active:scale-95">
          <span>📥</span> CSV වාර්තාව බාගත කරන්න
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryBox label="මුළු ඇතුළත් කිරීම්" count={reportData.length} />
        <SummaryBox label="අධි-අවදානම් අවස්ථා" count={highRiskCount} alert={highRiskCount > 0} />
        <SummaryBox label="සාමාන්‍ය අවස්ථා" count={reportData.length - highRiskCount} />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-3"></div>
          <p className="text-slate-400 text-xs font-bold">වාර්තා දත්ත ලබාගනිමින් පවතී...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-4">මවගේ නම</th>
                <th className="p-4">හැඳුනුම්පත</th>
                <th className="p-4">රුධිර ගණය</th>
                <th className="p-4">තත්ත්වය</th>
                <th className="p-4">ප්‍රදේශය</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {reportData.length > 0 ? (
                reportData.map((m, idx) => (
                  <tr key={idx} className="hover:bg-teal-50/30 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{m.fullName}</td>
                    <td className="p-4 text-slate-500 font-mono font-semibold">{m.nic || '—'}</td>
                    <td className="p-4 font-bold text-slate-700">{m.bloodGroup || '—'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase ${
                        isHighRiskMother(m) ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-700'
                      }`}>
                        {isHighRiskMother(m) ? 'High-Risk' : 'Normal'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600">{m.serviceArea || m.mohArea || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-slate-400 italic">
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