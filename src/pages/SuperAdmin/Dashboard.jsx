import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import AdminLayout from '../../components/AdminLayout';

const Dashboard = () => {
  const [counts, setCounts] = useState({
    mothers: 0,
    mohAdmins: 0,
    hospitalAdmins: 0,
    midwives: 0,
    highRisk: 0
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchCounts = async () => {
      const collections = ["mothers", "moh_admins", "hospital_admins", "midwives"];
      const results = {};

      for (const col of collections) {
        const snapshot = await getDocs(collection(db, col));
        results[col] = snapshot.size; 
      }

      const mothersSnap = await getDocs(collection(db, "mothers"));
      const highRiskCount = mothersSnap.docs.filter(doc => doc.data().riskStatus === 'High-Risk').length;

      setCounts({
        mothers: results["mothers"] || 0,
        mohAdmins: results["moh_admins"] || 0,
        hospitalAdmins: results["hospital_admins"] || 0,
        midwives: results["midwives"] || 0,
        highRisk: highRiskCount
      });
    };

    fetchCounts();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const chartData = [
    { label: 'මව්වරුන්', subLabel: 'Mothers', value: counts.mothers, color: 'bg-blue-500' },
    { label: 'MOH පාලක', subLabel: 'MOH Admins', value: counts.mohAdmins, color: 'bg-green-500' },
    { label: 'රෝහල් පාලක', subLabel: 'Hospital Admins', value: counts.hospitalAdmins, color: 'bg-yellow-500' },
    { label: 'නිලධාරීන්', subLabel: 'Midwives', value: counts.midwives, color: 'bg-purple-500' },
  ];

  const maxValue = Math.max(...chartData.map(d => d.value));
  const chartHeightLimit = maxValue > 0 ? maxValue * 1.2 : 10; 

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-sm border-b">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">පද්ධති සාරාංශය</h1>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">System Summary / Dashboard</div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-blue-600">{currentTime.toLocaleDateString('si-LK')}</p>
          <p className="text-2xl font-bold text-gray-700">{currentTime.toLocaleTimeString('si-LK')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10">
        <StatCard title="මුළු මව්වරුන්" subTitle="Total Mothers" count={counts.mothers} color="border-blue-500" />
        <StatCard title="MOH පාලකවරු" subTitle="MOH Admins" count={counts.mohAdmins} color="border-green-500" />
        <StatCard title="රෝහල් පාලකවරු" subTitle="Hospital Admins" count={counts.hospitalAdmins} color="border-yellow-500" />
        <StatCard title="අධි-අවදානම්" subTitle="High-Risk Cases" count={counts.highRisk} color="border-red-500" />
        <StatCard title="නිලධාරීන්" subTitle="Midwives / PHMs" count={counts.midwives} color="border-purple-500" />
      </div>

      <div className="bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-800">පරිශීලක දත්ත විශ්ලේෂණය</h2>
        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-6">User Data Analysis</div>
        
        <div className="flex items-end space-x-8 h-64 border-l border-b p-4 relative">
          {chartData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center group relative h-full justify-end">
              <div 
                className={`${data.color} w-full rounded-t-md transition-all duration-700 ease-out hover:opacity-80 relative`}
                style={{ height: `${(data.value / chartHeightLimit) * 100}%`, minHeight: data.value > 0 ? '4px' : '0px' }}
              >
                <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 block text-center text-xs font-bold text-white bg-black rounded px-2 py-1 shadow-lg z-20">
                  {data.value}
                </span>
              </div>
              <div className="text-center mt-2">
                <p className="text-[12px] font-bold text-gray-700 whitespace-nowrap leading-tight">{data.label}</p>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{data.subLabel}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

const StatCard = ({ title, subTitle, count, color }) => (
  <div className={`bg-white p-5 rounded-lg shadow border-l-4 ${color}`}>
    <p className="text-gray-600 text-[13px] font-bold leading-tight">{title}</p>
    <p className="text-gray-400 text-[10px] font-black uppercase tracking-tight mb-1">{subTitle}</p>
    <p className="text-2xl font-black text-gray-800">{count}</p>
  </div>
);

export default Dashboard;