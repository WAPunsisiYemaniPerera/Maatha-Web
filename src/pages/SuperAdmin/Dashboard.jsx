import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { findDistrictByMohArea } from '../../data/sriLankaLocations';

const Dashboard = () => {
  const [counts, setCounts] = useState({
    mothers: 0,
    mohAdmins: 0,
    hospitalAdmins: 0,
    midwives: 0,
    highRisk: 0,
    normalRisk: 0
  });

  const [districtData, setDistrictData] = useState([]);
  const [recentHighRisk, setRecentHighRisk] = useState([]);
  const [recentAdmins, setRecentAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch Mothers
        const mothersSnap = await getDocs(collection(db, "mothers"));
        const mothersList = mothersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch MOH Admins
        const mohSnap = await getDocs(collection(db, "moh_admins"));
        const mohList = mohSnap.docs.map(doc => ({ id: doc.id, role: 'MOH Admin', ...doc.data() }));

        // Fetch Hospital Admins
        const hospSnap = await getDocs(collection(db, "hospital_admins"));
        const hospList = hospSnap.docs.map(doc => ({ id: doc.id, role: 'Hospital Admin', ...doc.data() }));

        // Fetch Midwives
        const midSnap = await getDocs(collection(db, "midwives"));
        const midList = midSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Risk Counts
        const highRiskMothers = mothersList.filter(m => m.riskStatus === 'High-Risk');
        const normalRiskMothers = mothersList.filter(m => m.riskStatus !== 'High-Risk');

        setCounts({
          mothers: mothersList.length,
          mohAdmins: mohList.length,
          hospitalAdmins: hospList.length,
          midwives: midList.length,
          highRisk: highRiskMothers.length,
          normalRisk: normalRiskMothers.length
        });

        // Calculate District-wise distribution of mothers
        const districtCountMap = {};
        mothersList.forEach(m => {
          const dist = m.district || findDistrictByMohArea(m.mohArea) || 'Unknown';
          districtCountMap[dist] = (districtCountMap[dist] || 0) + 1;
        });

        // Top districts sorted
        const sortedDistricts = Object.entries(districtCountMap)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        // Fallback default districts if empty database
        if (sortedDistricts.length === 0) {
          setDistrictData([
            { name: 'Colombo', count: 0 },
            { name: 'Gampaha', count: 0 },
            { name: 'Kandy', count: 0 },
            { name: 'Galle', count: 0 },
            { name: 'Kurunegala', count: 0 }
          ]);
        } else {
          setDistrictData(sortedDistricts);
        }

        // Recent High Risk Cases (latest 5)
        setRecentHighRisk(highRiskMothers.slice(-5).reverse());

        // Recent Admins (combine latest MOH & Hospital admins)
        const combinedAdmins = [...mohList, ...hospList]
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 5);
        setRecentAdmins(combinedAdmins);

      } catch (error) {
        console.error("Dashboard data fetch error:", error);
      }
      setLoading(false);
    };

    fetchDashboardData();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalMothers = counts.mothers || 1;
  const highRiskPercent = counts.mothers > 0 ? Math.round((counts.highRisk / totalMothers) * 100) : 0;
  const maxDistrictCount = Math.max(...districtData.map(d => d.count), 1);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-32">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
          <p className="text-gray-500 font-bold text-sm">දත්ත ලබාගනිමින් පවතී... (Loading Command Center...)</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 pb-10">
        
        {/* 1. Hero Welcome & System Overview Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 rounded-3xl p-8 text-white shadow-xl border border-white/10">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 bg-blue-500/20 text-blue-300 text-xs font-bold px-3 py-1 rounded-full mb-3 border border-blue-400/20 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>පද්ධතිය සක්‍රීයයි • Live Cloud Connected</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-black tracking-tight">
                මාතා ජාතික පාලන පුවරුව
              </h1>
              <p className="text-slate-300 text-xs font-medium uppercase tracking-widest mt-1">
                National Maternal Health Management & Surveillance Dashboard
              </p>
            </div>

            {/* Live Clock & Date */}
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-right min-w-[200px]">
              <p className="text-xs font-bold text-blue-200">{currentTime.toLocaleDateString('si-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p className="text-2xl lg:text-3xl font-black text-white tracking-tight mt-0.5">{currentTime.toLocaleTimeString('si-LK')}</p>
              <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-1">
                26 Districts Connected
              </div>
            </div>
          </div>

          {/* Quick Action Shortcuts Bar */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/10">
            <Link 
              to="/super-admin/add-moh" 
              className="flex items-center space-x-3 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all duration-200 border border-white/5 active:scale-95 group"
            >
              <div className="p-2 rounded-lg bg-green-500/20 text-green-300 group-hover:bg-green-500 group-hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-tight">MOH Admin</div>
                <div className="text-[9px] text-slate-300 uppercase tracking-tighter">එක් කරන්න (Add)</div>
              </div>
            </Link>

            <Link 
              to="/super-admin/add-hospital" 
              className="flex items-center space-x-3 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all duration-200 border border-white/5 active:scale-95 group"
            >
              <div className="p-2 rounded-lg bg-yellow-500/20 text-yellow-300 group-hover:bg-yellow-500 group-hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-tight">රෝහල් Admin</div>
                <div className="text-[9px] text-slate-300 uppercase tracking-tighter">එක් කරන්න (Add)</div>
              </div>
            </Link>

            <Link 
              to="/super-admin/manage-mothers" 
              className="flex items-center space-x-3 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all duration-200 border border-white/5 active:scale-95 group"
            >
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-300 group-hover:bg-blue-500 group-hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-tight">මව්වරුන්</div>
                <div className="text-[9px] text-slate-300 uppercase tracking-tighter">කළමනාකරණය (Manage)</div>
              </div>
            </Link>

            <Link 
              to="/super-admin/manage-midwives" 
              className="flex items-center space-x-3 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all duration-200 border border-white/5 active:scale-95 group"
            >
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 group-hover:bg-purple-500 group-hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              </div>
              <div>
                <div className="text-xs font-bold text-white leading-tight">PHM නිලධාරීන්</div>
                <div className="text-[9px] text-slate-300 uppercase tracking-tighter">කළමනාකරණය (Manage)</div>
              </div>
            </Link>
          </div>
        </div>

        {/* 2. Key Performance Indicators (5 Stat Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {/* Card 1: Total Mothers */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-125"></div>
            <div className="flex justify-between items-start mb-3">
              <span className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Island-wide</span>
            </div>
            <p className="text-xs font-bold text-gray-500">ලියාපදිංචි මව්වරුන්</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Mothers</p>
            <p className="text-3xl font-black text-slate-900">{counts.mothers}</p>
            <div className="mt-2 text-[10px] font-bold text-gray-400 flex items-center justify-between">
              <span>සාමාන්‍ය: {counts.normalRisk}</span>
              <span className="text-red-500 font-bold">අවදානම්: {counts.highRisk}</span>
            </div>
          </div>

          {/* Card 2: High-Risk Mothers (Critical Alert) */}
          <div className="bg-gradient-to-br from-white to-red-50/50 p-6 rounded-2xl shadow-sm border-2 border-red-200 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="absolute top-2 right-2 flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span className="text-[9px] font-black uppercase tracking-wider text-red-600 bg-red-100 px-2 py-0.5 rounded-full">High Alert</span>
            </div>
            <div className="flex justify-between items-start mb-3">
              <span className="p-3 bg-red-100 text-red-600 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </span>
            </div>
            <p className="text-xs font-bold text-red-800">අධි-අවදානම් මව්වරුන්</p>
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">High-Risk Cases</p>
            <p className="text-3xl font-black text-red-600">{counts.highRisk}</p>
            <div className="mt-2 text-[10px] font-bold text-red-600">
              සමස්තයෙන් {highRiskPercent}% අවදානම් තත්ත්වයේ
            </div>
          </div>

          {/* Card 3: MOH Admins */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-3">
              <span className="p-3 bg-green-50 text-green-600 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Offices</span>
            </div>
            <p className="text-xs font-bold text-gray-500">MOH පාලකවරුන්</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">MOH Admins</p>
            <p className="text-3xl font-black text-slate-900">{counts.mohAdmins}</p>
            <div className="mt-2 text-[10px] font-bold text-green-600">
              ප්‍රාදේශීය සෞඛ්‍ය මධ්‍යස්ථාන
            </div>
          </div>

          {/* Card 4: Hospital Admins */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-3">
              <span className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Clinical</span>
            </div>
            <p className="text-xs font-bold text-gray-500">රෝහල් පාලකවරුන්</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Hospital Admins</p>
            <p className="text-3xl font-black text-slate-900">{counts.hospitalAdmins}</p>
            <div className="mt-2 text-[10px] font-bold text-amber-600">
              සම්බන්ධිත රෝහල් ජාලය
            </div>
          </div>

          {/* Card 5: Midwives / PHMs */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-3">
              <span className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">Field Force</span>
            </div>
            <p className="text-xs font-bold text-gray-500">පවුල් සෞඛ්‍ය නිලධාරීන්</p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">PHM Midwives</p>
            <p className="text-3xl font-black text-slate-900">{counts.midwives}</p>
            <div className="mt-2 text-[10px] font-bold text-purple-600">
              ක්ෂේත්‍ර නිලධාරිනියන්
            </div>
          </div>
        </div>

        {/* 3. Analytics & Visual Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart 1: District Distribution (2 Cols) */}
          <div className="lg:col-span-2 bg-white p-7 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-lg font-bold text-gray-800">දිස්ත්‍රික්ක අනුව මව්වරුන්ගේ ව්‍යාප්තිය</h2>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Top Regions</span>
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Maternal Population by District</p>
            </div>

            {/* Horizontal Bar Chart representation */}
            <div className="space-y-4 my-2">
              {districtData.map((d, index) => {
                const percentage = maxDistrictCount > 0 ? (d.count / maxDistrictCount) * 100 : 0;
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-700">{d.name}</span>
                      <span className="text-slate-900 font-extrabold">{d.count} <span className="text-gray-400 text-[10px] font-normal">මව්වරුන්</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.max(percentage, 4)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500 mt-4">
              <span>සම්පූර්ණ දිස්ත්‍රික්ක ආවරණය: 26</span>
              <Link to="/super-admin/manage-mothers" className="text-blue-600 font-bold hover:underline">
                සියලු දිස්ත්‍රික්ක නිරීක්ෂණය කරන්න &rarr;
              </Link>
            </div>
          </div>

          {/* Chart 2: Maternal Risk Donut / Radial Breakdown (1 Col) */}
          <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between items-center text-center">
            <div className="w-full text-left mb-4">
              <h2 className="text-lg font-bold text-gray-800">අවදානම් විශ්ලේෂණය</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Maternal Risk Categorization</p>
            </div>

            {/* Donut Chart */}
            <div className="relative w-44 h-44 my-3 flex items-center justify-center">
              <div 
                className="w-full h-full rounded-full transition-all duration-1000 shadow-inner"
                style={{
                  background: counts.mothers > 0 
                    ? `conic-gradient(#ef4444 0% ${highRiskPercent}%, #10b981 ${highRiskPercent}% 100%)`
                    : '#e2e8f0'
                }}
              ></div>
              <div className="absolute inset-4 bg-white rounded-full flex flex-col items-center justify-center shadow-md">
                <span className="text-3xl font-black text-slate-800">{highRiskPercent}%</span>
                <span className="text-[9px] font-black text-red-500 uppercase tracking-tight">High-Risk</span>
              </div>
            </div>

            {/* Legend & Stats */}
            <div className="w-full grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 text-left">
              <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span className="text-[10px] font-black text-red-700 uppercase">අධි-අවදානම්</span>
                </div>
                <div className="text-lg font-black text-red-600">{counts.highRisk}</div>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] font-black text-emerald-700 uppercase">සාමාන්‍ය</span>
                </div>
                <div className="text-lg font-black text-emerald-600">{counts.normalRisk}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Live Data Feeds (Recent High-Risk & Recent Admins) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Recent High-Risk Alerts Table */}
          <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-red-100 text-red-600 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  </span>
                  <h2 className="text-base font-bold text-gray-800">ක්ෂණික අධීක්ෂණ අවදානම් මව්වරුන්</h2>
                </div>
                <Link to="/super-admin/manage-mothers" className="text-xs font-bold text-blue-600 hover:underline">
                  සියල්ල බලන්න
                </Link>
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Recent High-Risk Mother Registrations</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-gray-500 font-bold uppercase text-[9px] border-b">
                    <th className="p-2.5">මවගේ නම (Mother)</th>
                    <th className="p-2.5">දිස්ත්‍රික්කය</th>
                    <th className="p-2.5">MOH ප්‍රදේශය</th>
                    <th className="p-2.5 text-center">තත්ත්වය</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentHighRisk.length > 0 ? recentHighRisk.map((m) => (
                    <tr key={m.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="p-2.5 font-bold text-gray-800">
                        <div>{m.fullName}</div>
                        <div className="text-[9px] text-gray-400 font-mono">NIC: {m.nic || '—'}</div>
                      </td>
                      <td className="p-2.5 text-gray-600">{m.district || findDistrictByMohArea(m.mohArea) || '—'}</td>
                      <td className="p-2.5 text-blue-600 font-medium">{m.mohArea || '—'}</td>
                      <td className="p-2.5 text-center">
                        <span className="bg-red-100 text-red-600 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
                          High-Risk
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="p-6 text-center text-gray-400 italic">
                        දැනට අධි-අවදානම් මව්වරුන් ලියාපදිංචි වී නොමැත.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Administrators Onboarded */}
          <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  </span>
                  <h2 className="text-base font-bold text-gray-800">නවතම ලියාපදිංචි පරිපාලකවරුන්</h2>
                </div>
                <div className="flex space-x-2 text-xs font-bold">
                  <Link to="/super-admin/add-moh" className="text-green-600 hover:underline">MOH</Link>
                  <span>•</span>
                  <Link to="/super-admin/add-hospital" className="text-amber-600 hover:underline">Hospital</Link>
                </div>
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Latest System Administrators</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-gray-500 font-bold uppercase text-[9px] border-b">
                    <th className="p-2.5">නම (Name)</th>
                    <th className="p-2.5">භූමිකාව (Role)</th>
                    <th className="p-2.5">දිස්ත්‍රික්කය / ප්‍රදේශය</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentAdmins.length > 0 ? recentAdmins.map((admin, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 font-bold text-gray-800">
                        <div>{admin.fullName}</div>
                        <div className="text-[9px] text-gray-400 font-mono">{admin.email}</div>
                      </td>
                      <td className="p-2.5">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                          admin.role === 'MOH Admin' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {admin.role}
                        </span>
                      </td>
                      <td className="p-2.5 text-gray-600">
                        {admin.hospitalName ? `${admin.hospitalName} (${admin.district})` : `${admin.mohArea} (${admin.district})`}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" className="p-6 text-center text-gray-400 italic">
                        දැනට අමතර පරිපාලකවරුන් ලියාපදිංචි වී නොමැත.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </AdminLayout>
  );
};

export default Dashboard;