import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import MOHLayout from '../../components/MOHLayout';
import { DISTRICTS, getMohAreas, findDistrictByMohArea } from '../../data/sriLankaLocations';

const MOHDashboard = () => {
  const [adminProfile, setAdminProfile] = useState(null);
  const [district, setDistrict] = useState('Colombo');
  const [mohArea, setMohArea] = useState('Colombo');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    midwivesCount: 0,
    mothersCount: 0,
    highRiskCount: 0,
    upcomingDeliveries: 0,
    uniquePhmAreas: 0,
    midwivesList: [],
    highRiskMothers: [],
    mothersByMidwife: [],
    trimesterBreakdown: { t1: 0, t2: 0, t3: 0 }
  });

  // Load logged-in MOH Admin Profile
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
            setAdminProfile(data);
            setDistrict(adminDistrict);
            setMohArea(adminMoh);
          }
        } catch (err) {
          console.error("Error fetching admin profile:", err);
        }
      }
    };
    fetchAdminProfile();
  }, []);

  // Fetch all stats for the selected MOH Area
  useEffect(() => {
    const fetchAreaStats = async () => {
      setLoading(true);
      try {
        // Parallel batch fetch
        const [midwifeSnap, motherSnap, phmAreaSnap] = await Promise.all([
          getDocs(query(collection(db, "midwives"), where("mohArea", "==", mohArea))),
          getDocs(query(collection(db, "mothers"), where("mohArea", "==", mohArea))),
          getDocs(query(collection(db, "phm_areas"), where("mohArea", "==", mohArea)))
        ]);

        const midwives = midwifeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const mothers = motherSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const definedPhmAreas = phmAreaSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // High Risk Mothers
        const highRisk = mothers.filter(m => m.riskStatus === 'High-Risk');

        // Trimester breakdown & upcoming deliveries
        let t1 = 0; // 1-12 wks
        let t2 = 0; // 13-27 wks
        let t3 = 0; // 28+ wks
        let upcoming = 0;

        const now = new Date();
        const thirtyDaysAhead = new Date();
        thirtyDaysAhead.setDate(now.getDate() + 30);

        mothers.forEach(m => {
          const weeks = Number(m.gestationalAge || m.weeks || 0);
          if (weeks > 0 && weeks <= 12) t1++;
          else if (weeks > 12 && weeks <= 27) t2++;
          else if (weeks > 27) t3++;

          if (m.edd) {
            const eddDate = new Date(m.edd);
            if (!isNaN(eddDate) && eddDate >= now && eddDate <= thirtyDaysAhead) {
              upcoming++;
            }
          }
        });

        // Midwife workload distribution
        const midwifeWorkload = midwives.map(mw => {
          const count = mothers.filter(m => (m.midwifeName === mw.fullName || m.serviceArea === mw.serviceArea)).length;
          return {
            name: mw.fullName || mw.employeeId || 'PHM',
            area: mw.serviceArea || 'General',
            count: count
          };
        });

        const activeAreasCount = new Set(midwives.map(m => m.serviceArea).filter(Boolean)).size;
        const totalDefinedAreasCount = definedPhmAreas.length;

        setStats({
          midwivesCount: midwives.length,
          mothersCount: mothers.length,
          highRiskCount: highRisk.length,
          upcomingDeliveries: upcoming,
          uniquePhmAreas: totalDefinedAreasCount > 0 ? totalDefinedAreasCount : activeAreasCount,
          activePhmAreas: activeAreasCount,
          midwivesList: midwives.slice(0, 5),
          highRiskMothers: highRisk.slice(0, 5),
          mothersByMidwife: midwifeWorkload.slice(0, 6),
          trimesterBreakdown: { t1, t2, t3 }
        });
      } catch (err) {
        console.error("Error fetching MOH stats:", err);
      }
      setLoading(false);
    };

    fetchAreaStats();
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

  const availableMohAreas = getMohAreas(district);
  const totalMothers = stats.mothersCount || 1;
  const highRiskPercentage = stats.mothersCount > 0 ? Math.round((stats.highRiskCount / totalMothers) * 100) : 0;

  if (loading) {
    return (
      <MOHLayout>
        <div className="flex flex-col items-center justify-center py-32">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
          <p className="text-gray-500 font-bold text-sm">MOH දත්ත පද්ධතිය ලබාගනිමින් පවතී... (Loading MOH Command Center...)</p>
        </div>
      </MOHLayout>
    );
  }

  return (
    <MOHLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Executive Medical Officer Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white shadow-xl p-8 border border-emerald-700/30">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 rounded-full bg-teal-400/10 blur-2xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {adminProfile?.designation || 'Medical Officer of Health (MOH)'}
                </span>
                {adminProfile?.slmcNumber && (
                  <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-200 text-xs font-bold border border-teal-400/20 font-mono">
                    SLMC: {adminProfile.slmcNumber}
                  </span>
                )}
                {adminProfile?.nic && (
                  <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-200 text-xs font-bold border border-cyan-400/20 font-mono">
                    NIC: {adminProfile.nic}
                  </span>
                )}
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
                  {adminProfile?.fullName || 'Dr. Medical Officer of Health'}
                </h1>
                <p className="text-sm text-emerald-100/80 font-medium mt-1">
                  MOH Division: <strong className="text-white">{mohArea}</strong> | District: <strong className="text-white">{district}</strong>
                </p>
              </div>

              {adminProfile?.phone && (
                <div className="flex items-center gap-4 text-xs text-emerald-200/90 pt-1">
                  <span>📞 {adminProfile.phone}</span>
                  {adminProfile.officePhone && <span>🏢 {adminProfile.officePhone}</span>}
                  <span>✉️ {adminProfile.email}</span>
                </div>
              )}
            </div>

            {/* Right: Live Clock & Jurisdiction Switcher */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-inner">
              <div className="text-left lg:text-right">
                <div className="text-2xl font-black tracking-tight font-mono text-emerald-300">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
                <div className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">
                  {currentTime.toLocaleDateString('si-LK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              {/* Area Switcher Dropdown */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/10 w-full sm:w-auto">
                <select
                  value={district}
                  onChange={handleDistrictChange}
                  className="p-1.5 bg-slate-900/80 text-white border border-white/20 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-400 outline-none"
                >
                  {DISTRICTS.map(d => (
                    <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
                  ))}
                </select>

                <select
                  value={mohArea}
                  onChange={(e) => setMohArea(e.target.value)}
                  className="p-1.5 bg-emerald-950 text-emerald-200 border border-emerald-400/40 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-400 outline-none"
                >
                  {availableMohAreas.map(area => (
                    <option key={area} value={area} className="bg-slate-900 text-white">{area}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Link
            to="/moh-admin/add-midwife"
            className="group bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-emerald-500 hover:shadow-md transition-all flex items-center gap-3.5"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white text-emerald-600 flex items-center justify-center text-xl transition-all shadow-sm shrink-0">
              👩‍⚕️
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">නිලධාරිනියක් එක් කරන්න</div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Register Field PHM</div>
            </div>
          </Link>

          <Link
            to="/moh-admin/phm-areas"
            className="group bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-teal-500 hover:shadow-md transition-all flex items-center gap-3.5"
          >
            <div className="w-11 h-11 rounded-2xl bg-teal-50 group-hover:bg-teal-600 group-hover:text-white text-teal-600 flex items-center justify-center text-xl transition-all shadow-sm shrink-0">
              📍
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 group-hover:text-teal-700">PHM කොට්ඨාස</div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Manage PHM Divisions</div>
            </div>
          </Link>

          <Link
            to="/moh-admin/manage-midwives"
            className="group bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-emerald-500 hover:shadow-md transition-all flex items-center gap-3.5"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white text-emerald-600 flex items-center justify-center text-xl transition-all shadow-sm shrink-0">
              📋
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">නිලධාරීන් නාමාවලිය</div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Midwives Directory</div>
            </div>
          </Link>

          <Link
            to="/moh-admin/area-mothers"
            className="group bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-cyan-500 hover:shadow-md transition-all flex items-center gap-3.5"
          >
            <div className="w-11 h-11 rounded-2xl bg-cyan-50 group-hover:bg-cyan-600 group-hover:text-white text-cyan-600 flex items-center justify-center text-xl transition-all shadow-sm shrink-0">
              🤰
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 group-hover:text-cyan-700">ප්‍රදේශයේ මව්වරුන්</div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Maternal Registry</div>
            </div>
          </Link>

          <Link
            to="/moh-admin/reports"
            className="group bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-purple-500 hover:shadow-md transition-all flex items-center gap-3.5"
          >
            <div className="w-11 h-11 rounded-2xl bg-purple-50 group-hover:bg-purple-600 group-hover:text-white text-purple-600 flex items-center justify-center text-xl transition-all shadow-sm shrink-0">
              📄
            </div>
            <div>
              <div className="text-sm font-bold text-slate-800 group-hover:text-purple-700">නිල වාර්තා සහ PDF</div>
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">MOH Documents</div>
            </div>
          </Link>
        </div>

        {/* 5 KPI Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard
            icon="👩‍⚕️"
            title="පවුල් සෞඛ්‍ය නිලධාරීන්"
            sub="Field Midwives (PHM)"
            count={stats.midwivesCount}
            badge={`${stats.uniquePhmAreas} Divisions`}
            color="border-emerald-500"
            bgIcon="bg-emerald-50 text-emerald-600"
          />
          <KPICard
            icon="🤰"
            title="ලියාපදිංචි මව්වරුන්"
            sub="Area Mothers"
            count={stats.mothersCount}
            badge="Active Jurisdiction"
            color="border-blue-500"
            bgIcon="bg-blue-50 text-blue-600"
          />
          <KPICard
            icon="🚨"
            title="අධි-අවදානම් මව්වරුන්"
            sub="High-Risk Alerts"
            count={stats.highRiskCount}
            badge={`${highRiskPercentage}% of total`}
            color="border-red-500"
            bgIcon="bg-red-50 text-red-600"
            alert={stats.highRiskCount > 0}
          />
          <KPICard
            icon="👶"
            title="ඉදිරි ප්‍රසූති (දින 30)"
            sub="Expected EDD (30 Days)"
            count={stats.upcomingDeliveries}
            badge="Hospital Delivery Prep"
            color="border-amber-500"
            bgIcon="bg-amber-50 text-amber-600"
          />
          <KPICard
            icon="🏘️"
            title="සේවා වසම් (PHM Areas)"
            sub="Active Field Zones"
            count={stats.uniquePhmAreas}
            badge="MOH Divisions"
            color="border-teal-500"
            bgIcon="bg-teal-50 text-teal-600"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Midwife Workload / Mothers per Midwife */}
          <div className="lg:col-span-2 bg-white p-7 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-800">නිලධාරිනියන් අනුව මව්වරුන්ගේ ව්‍යාප්තිය</h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Field Midwife Workload & Mother Allocation ({mohArea})
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                Active PHMs: {stats.mothersByMidwife.length}
              </span>
            </div>

            {stats.mothersByMidwife.length > 0 ? (
              <div className="space-y-4">
                {stats.mothersByMidwife.map((item, idx) => {
                  const barWidth = stats.mothersCount > 0 ? Math.max((item.count / stats.mothersCount) * 100, 8) : 8;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-gray-700">
                        <span>{item.name} <span className="text-[10px] text-gray-400 font-normal">({item.area})</span></span>
                        <span className="font-mono text-emerald-700">{item.count} මව්වරුන්</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                          style={{ width: `${barWidth}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 italic text-xs">
                තවමත් මෙම MOH ප්‍රදේශය සඳහා නිලධාරිනියන් ලියාපදිංචි කර නොමැත.
              </div>
            )}
          </div>

          {/* Chart 2: Risk Profile Donut & Trimester Breakdown */}
          <div className="bg-white p-7 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">මාතෘ අවදානම් සහ තත්ත්ව විශ්ලේෂණය</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                Maternal Risk & Trimester Profile
              </p>

              {/* Donut */}
              <div className="flex items-center justify-center my-4">
                <div
                  className="relative w-36 h-36 rounded-full border-8 border-gray-100 flex items-center justify-center shadow-inner"
                  style={{
                    background: `conic-gradient(#ef4444 ${highRiskPercentage}%, #10b981 0)`
                  }}
                >
                  <div className="absolute inset-3 bg-white rounded-full flex flex-col items-center justify-center shadow-md">
                    <span className="text-2xl font-black text-slate-800 font-mono">{highRiskPercentage}%</span>
                    <span className="text-[8px] font-black text-red-500 uppercase tracking-wider">High Risk</span>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex justify-center space-x-6 text-xs font-bold mt-2">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span>සාමාන්‍ය ({stats.mothersCount - stats.highRiskCount})</span>
                </div>
                <div className="flex items-center gap-1.5 text-red-600">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <span>අධි-අවදානම් ({stats.highRiskCount})</span>
                </div>
              </div>
            </div>

            {/* Trimester Bar */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="text-[11px] font-bold text-gray-600 mb-2">ත්‍රෛමාසික ප්‍රගතිය (Trimester Stages):</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-blue-50 p-2 rounded-xl">
                  <div className="text-[9px] font-black text-blue-500 uppercase">1st Tri (0-12w)</div>
                  <div className="text-base font-black text-blue-800">{stats.trimesterBreakdown.t1}</div>
                </div>
                <div className="bg-teal-50 p-2 rounded-xl">
                  <div className="text-[9px] font-black text-teal-600 uppercase">2nd Tri (13-27w)</div>
                  <div className="text-base font-black text-teal-800">{stats.trimesterBreakdown.t2}</div>
                </div>
                <div className="bg-purple-50 p-2 rounded-xl">
                  <div className="text-[9px] font-black text-purple-600 uppercase">3rd Tri (28w+)</div>
                  <div className="text-base font-black text-purple-800">{stats.trimesterBreakdown.t3}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Triage Table: Recent High-Risk Mothers in MOH Area */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <h2 className="text-xl font-bold text-gray-800">අධි-අවදානම් මව්වරුන්ගේ ක්ෂණික ලැයිස්තුව</h2>
              </div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                Urgent High-Risk Maternal Triage & Medical Follow-up ({mohArea})
              </p>
            </div>

            <Link
              to="/moh-admin/area-mothers"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 self-start"
            >
              සියල්ල බලන්න (View All Area Mothers) &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="p-4">මවගේ නම සහ NIC</th>
                  <th className="p-4">ගර්භනී සති (Gestation)</th>
                  <th className="p-4">අදාළ PHM නිලධාරිනිය</th>
                  <th className="p-4">සේවා කලාපය (PHM Area)</th>
                  <th className="p-4 text-center">තත්ත්වය</th>
                  <th className="p-4 text-right">ක්‍රියා (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {stats.highRiskMothers.length > 0 ? (
                  stats.highRiskMothers.map((mother) => (
                    <tr key={mother.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-800 text-sm">{mother.fullName}</div>
                        <div className="text-[10px] text-gray-400 font-mono font-bold">NIC: {mother.nic || 'නැත'}</div>
                      </td>
                      <td className="p-4 font-bold text-slate-700">
                        {mother.gestationalAge || mother.weeks || '—'} සති (Wks)
                      </td>
                      <td className="p-4 font-semibold text-emerald-700">
                        {mother.midwifeName || 'නොපවරා ඇත'}
                      </td>
                      <td className="p-4">
                        <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-emerald-100">
                          {mother.serviceArea || mother.phmArea || '—'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-600 border border-red-200">
                          High-Risk
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          to="/moh-admin/area-mothers"
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-sm transition-all inline-block"
                        >
                          විස්තර බලන්න
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-gray-400 italic">
                      {mohArea} ප්‍රදේශය තුළ මේ වන විට අධි-අවදානම් මව්වරුන් වාර්තා වී නොමැත. (No high-risk mothers recorded)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MOHLayout>
  );
};

const KPICard = ({ icon, title, sub, count, badge, color, bgIcon, alert }) => (
  <div className={`bg-white p-5 rounded-3xl shadow-sm border-l-4 ${color} border border-gray-100 relative overflow-hidden flex flex-col justify-between`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-2xl ${bgIcon} flex items-center justify-center text-lg shadow-inner`}>
        {icon}
      </div>
      {alert && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>}
    </div>
    <div>
      <p className="text-gray-700 text-xs font-bold leading-snug">{title}</p>
      <p className="text-gray-400 text-[9px] font-black uppercase tracking-wider mb-2">{sub}</p>
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-black text-gray-800 tracking-tight">{count}</span>
        <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">{badge}</span>
      </div>
    </div>
  </div>
);

export default MOHDashboard;