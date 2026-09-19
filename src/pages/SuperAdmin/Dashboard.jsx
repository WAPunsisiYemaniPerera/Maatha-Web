import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { findDistrictByMohArea } from '../../data/sriLankaLocations';
import { safeRenderText } from '../../utils/securityValidators';

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
        const mothersList = mothersSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            fullName: safeRenderText(data.fullName, ''),
            nic: safeRenderText(data.nic, ''),
            riskStatus: safeRenderText(data.riskStatus, 'Normal'),
            district: safeRenderText(data.district, ''),
            mohArea: safeRenderText(data.mohArea, '')
          };
        });
        
        // Fetch MOH Admins
        const mohSnap = await getDocs(collection(db, "moh_admins"));
        const mohList = mohSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            role: 'MOH Admin',
            ...data,
            fullName: safeRenderText(data.fullName, ''),
            email: safeRenderText(data.email, ''),
            mohArea: safeRenderText(data.mohArea, ''),
            district: safeRenderText(data.district, '')
          };
        });

        // Fetch Hospital Admins
        const hospSnap = await getDocs(collection(db, "hospital_admins"));
        const hospList = hospSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            role: 'Hospital Admin',
            ...data,
            fullName: safeRenderText(data.adminName || data.fullName, ''),
            email: safeRenderText(data.email, ''),
            hospitalName: safeRenderText(data.hospitalName, ''),
            district: safeRenderText(data.district, '')
          };
        });

        // Fetch Midwives
        const midSnap = await getDocs(collection(db, "midwives"));
        const midList = midSnap.docs.map(d => ({ id: d.id, ...d.data() }));

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
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-blue-900 font-bold text-base">දත්ත ලබාගනිමින් පවතී... (Loading Command Center...)</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 pb-10 max-w-7xl mx-auto">
        
        {/* 1. Hero Welcome & System Overview Banner (Blue & White Theme) */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 rounded-3xl p-6 sm:p-8 lg:p-10 text-white shadow-2xl border border-blue-800/40">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 bg-blue-500/20 text-blue-200 text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full mb-3 border border-blue-400/30 backdrop-blur-md">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>පද්ධතිය සක්‍රීයයි • Live Cloud Connected</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                මාතා ජාතික පාලන පුවරුව
              </h1>
              <p className="text-blue-100/80 text-xs sm:text-sm font-medium uppercase tracking-widest mt-2">
                National Maternal Health Management & Oversight Command Center
              </p>
            </div>

            {/* Live Clock & Date */}
            <div className="bg-white/10 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/15 text-left md:text-right w-full md:w-auto shadow-inner">
              <p className="text-xs sm:text-sm font-bold text-blue-200">{currentTime.toLocaleDateString('si-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mt-1 font-mono">{currentTime.toLocaleTimeString('si-LK')}</p>
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-widest mt-1">
                26 Districts Connected
              </div>
            </div>
          </div>

          {/* Quick Action Shortcuts Bar */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-8 pt-6 border-t border-white/10">
            <Link 
              to="/super-admin/add-moh" 
              className="flex items-center space-x-3.5 bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl transition-all duration-200 border border-white/10 active:scale-95 group"
            >
              <div className="p-2.5 rounded-xl bg-blue-500/30 text-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-white leading-tight">MOH Admin</div>
                <div className="text-[11px] text-blue-200 uppercase tracking-wide">කළමනාකරණය</div>
              </div>
            </Link>

            <Link 
              to="/super-admin/add-hospital" 
              className="flex items-center space-x-3.5 bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl transition-all duration-200 border border-white/10 active:scale-95 group"
            >
              <div className="p-2.5 rounded-xl bg-blue-500/30 text-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-white leading-tight">රෝහල් Admin</div>
                <div className="text-[11px] text-blue-200 uppercase tracking-wide">කළමනාකරණය</div>
              </div>
            </Link>

            <Link 
              to="/super-admin/manage-midwives" 
              className="flex items-center space-x-3.5 bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl transition-all duration-200 border border-white/10 active:scale-95 group"
            >
              <div className="p-2.5 rounded-xl bg-blue-500/30 text-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-white leading-tight">PHM නිලධාරීන්</div>
                <div className="text-[11px] text-blue-200 uppercase tracking-wide">නාමාවලිය</div>
              </div>
            </Link>

            <Link 
              to="/super-admin/manage-mothers" 
              className="flex items-center space-x-3.5 bg-white/10 hover:bg-white/20 p-3.5 rounded-2xl transition-all duration-200 border border-white/10 active:scale-95 group"
            >
              <div className="p-2.5 rounded-xl bg-blue-500/30 text-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-white leading-tight">මව්වරුන්</div>
                <div className="text-[11px] text-blue-200 uppercase tracking-wide">ලියාපදිංචි ලේඛනය</div>
              </div>
            </Link>
          </div>
        </div>

        {/* 2. Key Performance Indicators (5 Stat Cards - Blue & White Theme) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {/* Card 1: Total Mothers */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-3">
              <span className="p-3.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 text-2xl">
                🤰
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">Island-wide</span>
            </div>
            <p className="text-sm font-bold text-slate-700">ලියාපදිංචි මව්වරුන්</p>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Total Mothers</p>
            <p className="text-3xl sm:text-4xl font-black text-slate-900">{counts.mothers}</p>
            <div className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-slate-500 flex items-center justify-between">
              <span>සාමාන්‍ය: {counts.normalRisk}</span>
              <span className="text-red-600 font-bold">අවදානම්: {counts.highRisk}</span>
            </div>
          </div>

          {/* Card 2: High-Risk Mothers */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-red-200 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-3">
              <span className="p-3.5 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-2xl">
                🚨
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                High Alert
              </span>
            </div>
            <p className="text-sm font-bold text-red-800">අධි-අවදානම් මව්වරුන්</p>
            <p className="text-xs font-black text-red-400 uppercase tracking-wider mb-1">High-Risk Cases</p>
            <p className="text-3xl sm:text-4xl font-black text-red-600">{counts.highRisk}</p>
            <div className="mt-3 pt-2 border-t border-red-100 text-xs font-bold text-red-600">
              සමස්තයෙන් {highRiskPercent}% අවදානම් තත්ත්වයේ
            </div>
          </div>

          {/* Card 3: MOH Admins */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-3">
              <span className="p-3.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 text-2xl">
                🏛️
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">Offices</span>
            </div>
            <p className="text-sm font-bold text-slate-700">MOH පාලකවරුන්</p>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">MOH Admins</p>
            <p className="text-3xl sm:text-4xl font-black text-slate-900">{counts.mohAdmins}</p>
            <div className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-blue-700">
              ප්‍රාදේශීය සෞඛ්‍ය කාර්යාල
            </div>
          </div>

          {/* Card 4: Hospital Admins */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-3">
              <span className="p-3.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 text-2xl">
                🏥
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">Hospitals</span>
            </div>
            <p className="text-sm font-bold text-slate-700">රෝහල් පාලකවරුන්</p>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Hospital Admins</p>
            <p className="text-3xl sm:text-4xl font-black text-slate-900">{counts.hospitalAdmins}</p>
            <div className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-blue-700">
              සම්බන්ධිත රෝහල් ජාලය
            </div>
          </div>

          {/* Card 5: Midwives / PHMs */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-3">
              <span className="p-3.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 text-2xl">
                👩‍⚕️
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">Field Force</span>
            </div>
            <p className="text-sm font-bold text-slate-700">පවුල් සෞඛ්‍ය නිලධාරීන්</p>
            <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">PHM Midwives</p>
            <p className="text-3xl sm:text-4xl font-black text-slate-900">{counts.midwives}</p>
            <div className="mt-3 pt-2 border-t border-slate-100 text-xs font-bold text-blue-700">
              ක්ෂේත්‍ර නිලධාරිනියන්
            </div>
          </div>
        </div>

        {/* 3. Analytics & Visual Charts Grid (Blue & White Theme) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart 1: District Distribution */}
          <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-blue-100 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-xl font-bold text-slate-900">දිස්ත්‍රික්ක අනුව මව්වරුන්ගේ ව්‍යාප්තිය</h2>
                <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Top Regions</span>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Maternal Population by District</p>
            </div>

            {/* Horizontal Bar Chart representation */}
            <div className="space-y-4 my-2">
              {districtData.map((d, index) => {
                const percentage = maxDistrictCount > 0 ? (d.count / maxDistrictCount) * 100 : 0;
                return (
                  <div key={index} className="space-y-1.5">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-slate-800">{d.name}</span>
                      <span className="text-blue-900 font-extrabold">{d.count} <span className="text-slate-400 text-xs font-normal">මව්වරුන්</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.max(percentage, 4)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm text-slate-600 mt-4">
              <span className="font-medium">සම්පූර්ණ දිස්ත්‍රික්ක ආවරණය: 26</span>
              <Link to="/super-admin/manage-mothers" className="text-blue-700 font-bold hover:underline flex items-center gap-1">
                <span>සියලු දිස්ත්‍රික්ක නිරීක්ෂණය කරන්න</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>

          {/* Chart 2: Maternal Risk Donut / Radial Breakdown */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-blue-100 flex flex-col justify-between items-center text-center">
            <div className="w-full text-left mb-4">
              <h2 className="text-xl font-bold text-slate-900">අවදානම් විශ්ලේෂණය</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Maternal Risk Categorization</p>
            </div>

            {/* Donut Chart */}
            <div className="relative w-48 h-48 my-3 flex items-center justify-center">
              <div 
                className="w-full h-full rounded-full transition-all duration-1000 shadow-inner"
                style={{
                  background: counts.mothers > 0 
                    ? `conic-gradient(#ef4444 0% ${highRiskPercent}%, #2563eb ${highRiskPercent}% 100%)`
                    : '#e2e8f0'
                }}
              ></div>
              <div className="absolute inset-5 bg-white rounded-full flex flex-col items-center justify-center shadow-md">
                <span className="text-3xl sm:text-4xl font-black text-slate-900">{highRiskPercent}%</span>
                <span className="text-xs font-black text-red-600 uppercase tracking-tight">High-Risk</span>
              </div>
            </div>

            {/* Legend & Stats */}
            <div className="w-full grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-left">
              <div className="bg-red-50 p-3.5 rounded-2xl border border-red-100">
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <span className="text-xs font-black text-red-700 uppercase">අධි-අවදානම්</span>
                </div>
                <div className="text-xl font-black text-red-600">{counts.highRisk}</div>
              </div>

              <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-100">
                <div className="flex items-center space-x-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span className="text-xs font-black text-blue-700 uppercase">සාමාන්‍ය</span>
                </div>
                <div className="text-xl font-black text-blue-700">{counts.normalRisk}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Live Data Feeds (Recent High-Risk & Recent Admins) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Recent High-Risk Alerts Table */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-blue-100 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center space-x-2.5">
                  <span className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">ක්ෂණික අධීක්ෂණ අවදානම් මව්වරුන්</h2>
                </div>
                <Link to="/super-admin/manage-mothers" className="text-xs font-bold text-blue-700 hover:underline">
                  සියල්ල බලන්න &rarr;
                </Link>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Recent High-Risk Mother Registrations</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-xs border-b border-slate-100">
                    <th className="p-3">මවගේ නම (Mother)</th>
                    <th className="p-3">දිස්ත්‍රික්කය</th>
                    <th className="p-3">MOH ප්‍රදේශය</th>
                    <th className="p-3 text-center">තත්ත්වය</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentHighRisk.length > 0 ? recentHighRisk.map((m) => (
                    <tr key={m.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        <div>{m.fullName}</div>
                        <div className="text-xs text-slate-400 font-mono">NIC: {m.nic || '—'}</div>
                      </td>
                      <td className="p-3 text-slate-700">{m.district || findDistrictByMohArea(m.mohArea) || '—'}</td>
                      <td className="p-3 text-blue-700 font-semibold">{m.mohArea || '—'}</td>
                      <td className="p-3 text-center">
                        <span className="bg-red-100 text-red-700 font-black text-xs px-2.5 py-1 rounded-full uppercase border border-red-200">
                          High-Risk
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="p-6 text-center text-slate-400 italic">
                        දැනට අධි-අවදානම් මව්වරුන් ලියාපදිංචි වී නොමැත.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Administrators Onboarded */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-blue-100 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center space-x-2.5">
                  <span className="p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">නවතම ලියාපදිංචි පරිපාලකවරුන්</h2>
                </div>
                <div className="flex space-x-2 text-xs font-bold">
                  <Link to="/super-admin/add-moh" className="text-blue-700 hover:underline">MOH</Link>
                  <span>•</span>
                  <Link to="/super-admin/add-hospital" className="text-blue-700 hover:underline">Hospital</Link>
                </div>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Latest System Administrators</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-xs border-b border-slate-100">
                    <th className="p-3">නම (Name)</th>
                    <th className="p-3">භූමිකාව (Role)</th>
                    <th className="p-3">දිස්ත්‍රික්කය / ප්‍රදේශය</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentAdmins.length > 0 ? recentAdmins.map((admin, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-3 font-bold text-slate-900">
                        <div>{admin.fullName}</div>
                        <div className="text-xs text-slate-400 font-mono">{admin.email}</div>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-full uppercase border ${
                          admin.role === 'MOH Admin' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                          {admin.role}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">
                        {admin.hospitalName ? `${admin.hospitalName} (${admin.district})` : `${admin.mohArea} (${admin.district})`}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="3" className="p-6 text-center text-slate-400 italic">
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