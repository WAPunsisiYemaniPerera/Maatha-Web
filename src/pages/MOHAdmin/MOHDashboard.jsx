import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import MOHLayout from '../../components/MOHLayout';

const MOHDashboard = () => {
  const [counts, setCounts] = useState({ midwives: 0, mothers: 0, highRisk: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());
  const mohArea = "Colombo"; 

  useEffect(() => {
    const fetchStats = async () => {
      const midwifeQuery = query(collection(db, "midwives"), where("mohArea", "==", mohArea));
      const midwifeSnap = await getDocs(midwifeQuery);
      
      const motherQuery = query(collection(db, "mothers"), where("mohArea", "==", mohArea));
      const motherSnap = await getDocs(motherQuery);
      
      const highRiskCount = motherSnap.docs.filter(doc => doc.data().riskStatus === 'High-Risk').length;

      setCounts({
        midwives: midwifeSnap.size,
        mothers: motherSnap.size,
        highRisk: highRiskCount
      });
    };

    fetchStats();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [mohArea]);

  const totalMothers = counts.mothers || 1; 
  const highRiskPercentage = (counts.highRisk / totalMothers) * 100;

  return (
    <MOHLayout>
      {/* Header - Date & Time */}
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border-b border-green-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">MOH පාලන පුවරුව</h1>
          <div className="text-[11px] font-black text-green-600 uppercase tracking-widest mt-1">
            MOH Area: {mohArea} | Administrator Dashboard
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-green-700">{currentTime.toLocaleDateString('si-LK')}</p>
          <p className="text-2xl font-black text-slate-700 tracking-tighter">{currentTime.toLocaleTimeString('si-LK')}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="පවුල් සෞඛ්‍ය නිලධාරීන්" subTitle="Total Midwives" count={counts.midwives} color="border-blue-500" />
        <StatCard title="ලියාපදිංචි මව්වරුන්" subTitle="Registered Mothers" count={counts.mothers} color="border-green-500" />
        <StatCard title="අධි-අවදානම් මව්වරුන්" subTitle="High-Risk Mothers" count={counts.highRisk} color="border-red-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Simple Bar Chart */}
        <div className="bg-white p-8 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-1">සේවා නියුක්ති විශ්ලේෂණය</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Staff & Patient Overview</p>
          
          <div className="flex items-end space-x-12 h-48 border-l border-b p-4">
            <Bar height={(counts.midwives / (counts.mothers || 10)) * 100} label="නිලධාරීන්" color="bg-blue-500" count={counts.midwives} />
            <Bar height={80} label="මව්වරුන්" color="bg-green-500" count={counts.mothers} />
            <Bar height={(counts.highRisk / (counts.mothers || 10)) * 100} label="අවදානම්" color="bg-red-500" count={counts.highRisk} />
          </div>
        </div>

        {/* Simple Pie Chart Representation */}
        <div className="bg-white p-8 rounded-2xl shadow-sm flex flex-col items-center justify-center">
          <h2 className="text-lg font-bold text-gray-800 mb-1 self-start">අවදානම් ප්‍රතිශතය</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 self-start">Risk Distribution</p>
          
          <div className="relative w-40 h-40 rounded-full border-8 border-gray-100 flex items-center justify-center" 
               style={{ background: `conic-gradient(#ef4444 ${highRiskPercentage}%, #f3f4f6 0)` }}>
            <div className="absolute inset-2 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
              <span className="text-2xl font-black text-slate-800">{Math.round(highRiskPercentage)}%</span>
              <span className="text-[8px] font-bold text-gray-400 uppercase">High Risk</span>
            </div>
          </div>
          <div className="mt-6 flex space-x-4">
             <div className="flex items-center text-[10px] font-bold text-gray-600 uppercase"><span className="w-3 h-3 bg-red-500 rounded-sm mr-2"></span> High Risk</div>
             <div className="flex items-center text-[10px] font-bold text-gray-600 uppercase"><span className="w-3 h-3 bg-gray-200 rounded-sm mr-2"></span> Normal</div>
          </div>
        </div>
      </div>
    </MOHLayout>
  );
};

const StatCard = ({ title, subTitle, count, color }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border-l-4 ${color}`}>
    <p className="text-gray-600 text-[13px] font-bold">{title}</p>
    <p className="text-gray-400 text-[10px] font-black uppercase tracking-tight mb-2">{subTitle}</p>
    <p className="text-3xl font-black text-gray-800">{count}</p>
  </div>
);

const Bar = ({ height, label, color, count }) => (
  <div className="flex-1 flex flex-col items-center group h-full justify-end relative">
    <div className={`${color} w-full rounded-t-lg transition-all duration-700 hover:opacity-80 relative`} 
         style={{ height: `${Math.max(height, 5)}%` }}>
      <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg z-10">{count}</span>
    </div>
    <span className="text-[10px] font-bold text-gray-500 mt-2 whitespace-nowrap">{label}</span>
  </div>
);

export default MOHDashboard;