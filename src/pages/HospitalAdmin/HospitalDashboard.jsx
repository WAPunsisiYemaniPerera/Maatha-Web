import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import HospitalLayout from '../../components/HospitalLayout';

const HospitalDashboard = () => {
  const [stats, setStats] = useState({ admitted: 0, highRisk: 0 });
  const hospitalName = "General Hospital Colombo"; // පසුව Auth හරහා ලබාගත හැක

  useEffect(() => {
    const fetchStats = async () => {
      // මෙහිදී රෝහලට ඇතුළත් වූ (Admitted) මව්වරුන් පමණක් පෙරා ගත හැක
      const q = query(collection(db, "mothers"), where("hospitalName", "==", hospitalName));
      const snap = await getDocs(q);
      const highRisk = snap.docs.filter(d => d.data().riskStatus === 'High-Risk').length;

      setStats({ admitted: snap.size, highRisk: highRisk });
    };
    fetchStats();
  }, [hospitalName]);

  return (
    <HospitalLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">රෝහල් පද්ධති සාරාංශය</h1>
        <div className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mt-1">
          {hospitalName} | Hospital Overview
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border-l-8 border-indigo-500">
          <p className="text-gray-500 text-xs font-bold uppercase">ඇතුළත් කරගත් මව්වරුන්</p>
          <p className="text-[10px] font-black text-gray-300 uppercase mb-2">Total Admitted Mothers</p>
          <p className="text-4xl font-black text-slate-800">{stats.admitted}</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border-l-8 border-red-500">
          <p className="text-gray-500 text-xs font-bold uppercase">දැනට සිටින අධි-අවදානම් මව්වරුන්</p>
          <p className="text-[10px] font-black text-gray-300 uppercase mb-2">Current High-Risk Cases</p>
          <p className="text-4xl font-black text-slate-800">{stats.highRisk}</p>
        </div>
      </div>
    </HospitalLayout>
  );
};

export default HospitalDashboard;