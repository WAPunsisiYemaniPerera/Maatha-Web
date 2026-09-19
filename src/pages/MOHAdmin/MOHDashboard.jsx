import React, { useEffect, useState } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import MOHLayout from '../../components/MOHLayout';
import { DISTRICTS, getMohAreas, findDistrictByMohArea } from '../../data/sriLankaLocations';

const MOHDashboard = () => {
  const [counts, setCounts] = useState({ midwives: 0, mothers: 0, highRisk: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [district, setDistrict] = useState('Colombo');
  const [mohArea, setMohArea] = useState('Colombo');

  // Load logged-in admin's assigned MOH area
  useEffect(() => {
    const fetchAdminProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, "moh_admins", user.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            const adminDistrict = data.district || findDistrictByMohArea(data.mohArea) || 'Colombo';
            const adminMoh = data.mohArea || 'Colombo';
            setDistrict(adminDistrict);
            setMohArea(adminMoh);
          }
        } catch (err) {
          console.error("Error fetching admin area:", err);
        }
      }
    };
    fetchAdminProfile();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const midwifeQuery = query(collection(db, "midwives"), where("mohArea", "==", mohArea));
        const midwifeSnap = await getDocs(midwifeQuery);
        
        const motherQuery = query(collection(db, "mothers"), where("mohArea", "==", mohArea));
        const motherSnap = await getDocs(motherQuery);
        
        const highRiskCount = motherSnap.docs.filter(d => d.data().riskStatus === 'High-Risk').length;

        setCounts({
          midwives: midwifeSnap.size,
          mothers: motherSnap.size,
          highRisk: highRiskCount
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
      }
    };

    fetchStats();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [mohArea]);

  const handleDistrictChange = (e) => {
    const newDistrict = e.target.value;
    setDistrict(newDistrict);
    const mohs = getMohAreas(newDistrict);
    if (mohs.length > 0) {
      setMohArea(mohs[0]);
    }
  };

  const totalMothers = counts.mothers || 1; 
  const highRiskPercentage = counts.mothers > 0 ? (counts.highRisk / totalMothers) * 100 : 0;
  const availableMohAreas = getMohAreas(district);

  return (
    <MOHLayout>
      {/* Header - Date & Time & Area Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border-b border-green-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">MOH පාලන පුවරුව</h1>
          <div className="text-[11px] font-black text-green-600 uppercase tracking-widest mt-1">
            MOH Area: {mohArea} ({district}) | Administrator Dashboard
          </div>
        </div>

        {/* Dynamic District & MOH Area Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5">දිස්ත්‍රික්කය</label>
            <select
              value={district}
              onChange={handleDistrictChange}
              className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-green-500 outline-none"
            >
              {DISTRICTS.map(dist => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-black text-gray-400 uppercase mb-0.5">MOH ප්‍රදේශය</label>
            <select
              value={mohArea}
              onChange={(e) => setMohArea(e.target.value)}
              className="p-1.5 bg-green-50 border border-green-200 rounded-lg text-xs font-bold text-green-800 focus:ring-2 focus:ring-green-500 outline-none"
            >
              {availableMohAreas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div className="text-right pl-4 border-l border-gray-100 hidden sm:block">
            <p className="text-xs font-bold text-green-700">{currentTime.toLocaleDateString('si-LK')}</p>
            <p className="text-lg font-black text-slate-700 tracking-tighter">{currentTime.toLocaleTimeString('si-LK')}</p>
          </div>
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
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Staff & Patient Overview ({mohArea})</p>
          
          <div className="flex items-end space-x-12 h-48 border-l border-b p-4">
            <Bar height={(counts.midwives / (counts.mothers || 10)) * 100} label="නිලධාරීන්" color="bg-blue-500" count={counts.midwives} />
            <Bar height={counts.mothers > 0 ? 80 : 5} label="මව්වරුන්" color="bg-green-500" count={counts.mothers} />
            <Bar height={(counts.highRisk / (counts.mothers || 10)) * 100} label="අවදානම්" color="bg-red-500" count={counts.highRisk} />
          </div>
        </div>

        {/* Simple Pie Chart Representation */}
        <div className="bg-white p-8 rounded-2xl shadow-sm flex flex-col items-center justify-center">
          <h2 className="text-lg font-bold text-gray-800 mb-1 self-start">අවදානම් ප්‍රතිශතය</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 self-start">Risk Distribution ({mohArea})</p>
          
          <div className="relative w-40 h-40 rounded-full border-8 border-gray-100 flex items-center justify-center" 
               style={{ background: `conic-gradient(#ef4444 ${highRiskPercentage}%, #f3f4f6 0)` }}>
            <div className="absolute inset-2 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
              <span className="text-2xl font-black text-slate-800">{Math.round(highRiskPercentage)}%</span>
              <span className="text-[8px] font-bold text-gray-400 uppercase">High Risk</span>
            </div>
          </div>
          <div className="mt-6 flex space-x-4">
             <div className="flex items-center text-[10px] font-bold text-gray-600 uppercase"><span className="w-3 h-3 bg-red-500 rounded-sm mr-2"></span> High Risk ({counts.highRisk})</div>
             <div className="flex items-center text-[10px] font-bold text-gray-600 uppercase"><span className="w-3 h-3 bg-gray-200 rounded-sm mr-2"></span> Normal ({counts.mothers - counts.highRisk})</div>
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