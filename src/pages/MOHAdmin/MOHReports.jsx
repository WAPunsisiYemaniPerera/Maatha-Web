import React, { useEffect, useState, useMemo } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import MOHLayout from '../../components/MOHLayout';
import ModalPortal from '../../components/ModalPortal';
import { findDistrictByMohArea } from '../../data/sriLankaLocations';
import { formatDisplayDate, safeRenderText, isHighRiskMother, normalizeRiskStatus } from '../../utils/securityValidators';
import {
  generateMothersPDF,
  generateMidwivesPDF,
  exportToCSV
} from '../../utils/pdfReportGenerator';

const MOHReports = () => {
  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState(null);
  const [district, setDistrict] = useState('Colombo');
  const [mohArea, setMohArea] = useState('Colombo');

  // Data collections
  const [midwives, setMidwives] = useState([]);
  const [mothers, setMothers] = useState([]);

  // Report Selection & Filters
  const [activeReportType, setActiveReportType] = useState('division_summary'); // 'division_summary' | 'high_risk' | 'phm_directory' | 'upcoming_deliveries'
  const [selectedMidwife, setSelectedMidwife] = useState('All');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // UI States
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const showToast = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  // Load Admin Profile
  useEffect(() => {
    const fetchAdmin = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, "moh_admins", user.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            setAdminProfile(data);
            const adminDistrict = data.district || findDistrictByMohArea(data.mohArea) || 'Colombo';
            const adminMoh = data.mohArea || 'Colombo';
            setDistrict(adminDistrict);
            setMohArea(adminMoh);
          }
        } catch (err) {
          console.error("Error loading MOH admin profile:", err);
        }
      }
    };
    fetchAdmin();
  }, []);

  // Fetch Area Data
  const fetchMOHData = async () => {
    setLoading(true);
    try {
      const [midSnap, mtrSnap] = await Promise.all([
        getDocs(query(collection(db, 'midwives'), where('mohArea', '==', mohArea))),
        getDocs(query(collection(db, 'mothers'), where('mohArea', '==', mohArea)))
      ]);

      const midwivesList = midSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          fullName: safeRenderText(data.fullName, ''),
          nic: safeRenderText(data.nic, ''),
          employeeId: safeRenderText(data.employeeId, ''),
          phone: safeRenderText(data.phone, ''),
          email: safeRenderText(data.email, ''),
          district: safeRenderText(data.district, district),
          mohArea: safeRenderText(data.mohArea, mohArea),
          serviceArea: safeRenderText(data.serviceArea || data.phmArea, ''),
          gnDivisions: safeRenderText(data.gnDivisions, ''),
          status: safeRenderText(data.status, 'Active')
        };
      });

      const mothersList = mtrSnap.docs.map(d => {
        const data = d.data();
        const isHigh = isHighRiskMother(data);
        return {
          id: d.id,
          ...data,
          fullName: safeRenderText(data.fullName, ''),
          nic: safeRenderText(data.nic, ''),
          phone: safeRenderText(data.phone, ''),
          emergencyPhone: safeRenderText(data.emergencyPhone || data.husbandPhone, ''),
          address: safeRenderText(data.address, ''),
          bloodGroup: safeRenderText(data.bloodGroup, ''),
          district: safeRenderText(data.district, district),
          mohArea: safeRenderText(data.mohArea, mohArea),
          serviceArea: safeRenderText(data.serviceArea || data.phmArea, ''),
          midwifeName: safeRenderText(data.midwifeName, ''),
          hospitalName: safeRenderText(data.hospitalName, ''),
          gestationalAge: safeRenderText(data.gestationalAge || data.weeks, ''),
          edd: formatDisplayDate(data.edd, 'නොදක්වා ඇත'),
          rawEdd: data.edd,
          riskStatus: normalizeRiskStatus(data.riskStatus, isHigh),
          notes: safeRenderText(data.notes || data.riskNotes, ''),
          age: safeRenderText(data.age, '')
        };
      });

      // Calculate PHM workloads
      const mappedMidwives = midwivesList.map(mw => {
        const mwMothers = mothersList.filter(m => (m.midwifeName === mw.fullName || m.serviceArea === mw.serviceArea));
        const highRisk = mwMothers.filter(m => m.riskStatus === 'High-Risk');
        return {
          ...mw,
          motherCount: mwMothers.length,
          highRiskCount: highRisk.length
        };
      });

      setMidwives(mappedMidwives);
      setMothers(mothersList);
    } catch (err) {
      console.error("Error fetching MOH reports data:", err);
      showToast("දත්ත ලබාගැනීම අසාර්ථක විය", 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (mohArea) {
      fetchMOHData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mohArea]);

  // Dynamic calculations
  const totalMothers = mothers.length;
  const highRiskCount = mothers.filter(m => m.riskStatus === 'High-Risk').length;
  const totalMidwives = midwives.length;

  const upcomingMothers = useMemo(() => {
    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(now.getDate() + 30);

    return mothers.filter(m => {
      if (!m.rawEdd) return false;
      const d = new Date(m.rawEdd);
      return !isNaN(d) && d >= now && d <= thirtyDaysAhead;
    });
  }, [mothers]);

  const uniqueMidwivesList = useMemo(() => {
    return Array.from(new Set(midwives.map(m => m.fullName).filter(Boolean)));
  }, [midwives]);

  // Filtered lists for the active table
  const filteredMothers = useMemo(() => {
    let list = activeReportType === 'high_risk' 
      ? mothers.filter(m => m.riskStatus === 'High-Risk')
      : activeReportType === 'upcoming_deliveries'
      ? upcomingMothers
      : mothers;

    if (selectedMidwife !== 'All') {
      list = list.filter(m => m.midwifeName === selectedMidwife || m.serviceArea === selectedMidwife);
    }
    if (selectedRisk !== 'All') {
      list = list.filter(m => m.riskStatus === selectedRisk);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(m => 
        (m.fullName || '').toLowerCase().includes(term) ||
        (m.nic || '').toLowerCase().includes(term) ||
        (m.phone || '').toLowerCase().includes(term) ||
        (m.serviceArea || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [mothers, activeReportType, upcomingMothers, selectedMidwife, selectedRisk, searchTerm]);

  const filteredMidwives = useMemo(() => {
    let list = midwives;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(m => 
        (m.fullName || '').toLowerCase().includes(term) ||
        (m.nic || '').toLowerCase().includes(term) ||
        (m.employeeId || '').toLowerCase().includes(term) ||
        (m.serviceArea || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [midwives, searchTerm]);

  // PDF Download Trigger
  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    try {
      const filters = { district, mohArea };
      if (activeReportType === 'phm_directory') {
        await generateMidwivesPDF(filteredMidwives, filters);
      } else {
        await generateMothersPDF(filteredMothers, {
          ...filters,
          risk: activeReportType === 'high_risk' ? 'High-Risk Only' : selectedRisk
        });
      }
      showToast("MOH නිල වාර්තාව (PDF) සාර්ථකව සකස් කරන ලදී!");
    } catch (err) {
      console.error("PDF generation error:", err);
      showToast("PDF සකස් කිරීමේදී දෝෂයක් සිදු විය: " + err.message, 'error');
    }
    setGeneratingPdf(false);
  };

  // CSV Export Trigger
  const handleExportCSV = () => {
    if (activeReportType === 'phm_directory') {
      const headers = ['#', 'Full Name', 'NIC', 'Employee ID', 'District', 'MOH Area', 'Service Area', 'GN Divisions', 'Contact Phone', 'Mothers Count', 'High-Risk Cases'];
      const data = filteredMidwives.map((m, i) => [
        i + 1,
        m.fullName,
        m.nic,
        m.employeeId,
        m.district,
        m.mohArea,
        m.serviceArea,
        m.gnDivisions,
        m.phone,
        m.motherCount,
        m.highRiskCount
      ]);
      exportToCSV(`MOH_${mohArea}_Midwives_Registry_${Date.now()}`, headers, data);
    } else {
      const headers = ['#', 'Mother Full Name', 'NIC', 'Age', 'Blood Group', 'District', 'MOH Area', 'PHM Area', 'Assigned Midwife', 'Gestational Age', 'EDD', 'Risk Status', 'Hospital', 'Phone', 'Emergency Phone'];
      const data = filteredMothers.map((m, i) => [
        i + 1,
        m.fullName,
        m.nic,
        m.age,
        m.bloodGroup,
        m.district,
        m.mohArea,
        m.serviceArea,
        m.midwifeName,
        m.gestationalAge ? `${m.gestationalAge} Wks` : '',
        m.edd,
        m.riskStatus,
        m.hospitalName || '—',
        m.phone,
        m.emergencyPhone
      ]);
      exportToCSV(`MOH_${mohArea}_Mothers_${activeReportType}_${Date.now()}`, headers, data);
    }
    showToast("දත්ත සාර්ථකව Excel/CSV ගොනුවක් ලෙස බාගත කරන ලදී!");
  };

  return (
    <MOHLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Toast Feedback */}
        {message && (
          <div className={`fixed top-5 right-5 z-[120] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-right duration-300 ${
            messageType === 'error' ? 'bg-red-900 border-l-4 border-red-500' : 'bg-slate-900 border-l-4 border-emerald-500'
          }`}>
            <span className="text-xl">{messageType === 'error' ? '⚠️' : '✅'}</span>
            <div className="text-sm font-bold">{message}</div>
          </div>
        )}

        {/* Executive Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-950 text-white shadow-xl p-6 sm:p-8 border border-emerald-800/40">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{adminProfile?.designation || 'Medical Officer of Health'} — Official Reports Center</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
                MOH නිල වාර්තා සහ ලේඛන මධ්‍යස්ථානය
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/80 font-medium">
                Clinical Surveillance & Intelligence Dossier | <strong>{adminProfile?.fullName || 'Dr. MOH'}</strong> | <strong>{mohArea} MOH ({district})</strong>
              </p>
            </div>

            {/* Locked Jurisdiction Badge & Re-Sync */}
            <div className="flex flex-wrap items-center gap-2 bg-white/10 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-white/10 shrink-0">
              <span className="px-3.5 py-2 bg-slate-900/90 text-emerald-300 border border-emerald-400/30 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
                <span className="text-sm">🔒</span>
                <span>{mohArea} MOH ({district})</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-black uppercase ml-1">Official</span>
              </span>

              <button
                onClick={fetchMOHData}
                disabled={loading}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 active:scale-95"
              >
                <span>{loading ? '...' : '🔄 Re-Sync'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Real-time MOH KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
              🤰
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">{totalMothers}</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">මුළු ලියාපදිංචි මව්වරුන්</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-red-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
              🚨
            </div>
            <div>
              <div className="text-2xl font-black text-red-600">{highRiskCount}</div>
              <div className="text-[11px] font-bold text-red-500 uppercase tracking-wider">අධි-අවදානම් ගර්භනී අවස්ථා</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
              👩‍⚕️
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">{totalMidwives}</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ක්ෂේත්‍ර PHM නිලධාරිනියන්</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
              ⏳
            </div>
            <div>
              <div className="text-2xl font-black text-purple-700">{upcomingMothers.length}</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ඉදිරි දින 30 ප්‍රසූති (EDD)</div>
            </div>
          </div>
        </div>

        {/* Report Selection Tabs */}
        <div className="bg-white p-2 sm:p-3 rounded-3xl shadow-sm border border-slate-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { id: 'division_summary', labelSi: 'MOH සායනික සාරාංශය', labelEn: 'MOH Division Summary', icon: '📊' },
              { id: 'high_risk', labelSi: '🚨 අධි-අවදානම් නිරීක්ෂණ', labelEn: 'High-Risk Surveillance', icon: '🚨' },
              { id: 'phm_directory', labelSi: 'PHM ක්ෂේත්‍ර නාමාවලිය', labelEn: 'PHM Staff & Workload', icon: '👩‍⚕️' },
              { id: 'upcoming_deliveries', labelSi: 'ඉදිරි ප්‍රසූති කාලසටහන', labelEn: 'Upcoming 30-Day EDD', icon: '⏳' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveReportType(tab.id);
                  setSearchTerm('');
                }}
                className={`p-3 sm:p-4 rounded-2xl text-left transition-all duration-200 flex items-center gap-3 ${
                  activeReportType === tab.id
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 font-bold scale-102'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium'
                }`}
              >
                <span className="text-xl sm:text-2xl">{tab.icon}</span>
                <div className="overflow-hidden">
                  <div className="text-xs sm:text-sm font-bold truncate">{tab.labelSi}</div>
                  <div className={`text-[10px] uppercase tracking-wider truncate ${
                    activeReportType === tab.id ? 'text-emerald-100' : 'text-slate-400'
                  }`}>
                    {tab.labelEn}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Filter Toolbar & Actions */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <input
                type="text"
                placeholder="නම, NIC, දුරකථන, PHM වසම සොයන්න..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 font-bold text-xs">✕</button>
              )}
            </div>

            {/* PHM Filter */}
            {activeReportType !== 'phm_directory' && (
              <select
                value={selectedMidwife}
                onChange={(e) => setSelectedMidwife(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">සියලුම PHM නිලධාරිනියන් (All Midwives)</option>
                {uniqueMidwivesList.map(mw => (
                  <option key={mw} value={mw}>{mw}</option>
                ))}
              </select>
            )}

            {/* Risk Status Filter */}
            {activeReportType === 'division_summary' && (
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="All">අවදානම් තත්ත්වය: සියල්ල (All Risks)</option>
                <option value="High-Risk">🚨 High-Risk Only (අධි-අවදානම්)</option>
                <option value="Normal">✅ Normal Only (සාමාන්‍ය)</option>
              </select>
            )}

            <div className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-2 rounded-xl">
              පෙරූ වාර්තා: <strong className="text-slate-800">{activeReportType === 'phm_directory' ? filteredMidwives.length : filteredMothers.length}</strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowPrintModal(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5 active:scale-95"
            >
              <span>🖨️ Print Preview</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-1.5 active:scale-95"
            >
              <span>📊 Excel / CSV</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={generatingPdf}
              className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <span>{generatingPdf ? '⏳ Generating...' : '📄 Download PDF'}</span>
            </button>
          </div>
        </div>

        {/* Data Table Preview */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                {activeReportType === 'division_summary' && 'MOH Division Maternal Healthcare Registry'}
                {activeReportType === 'high_risk' && 'High-Risk Critical Pregnancies Emergency Monitoring List'}
                {activeReportType === 'phm_directory' && 'Public Health Midwives (PHM) Staff Registry'}
                {activeReportType === 'upcoming_deliveries' && 'Upcoming Expected Deliveries (Next 30 Days)'}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-bold">MOH Area: {mohArea}</span>
          </div>

          <div className="overflow-x-auto">
            {activeReportType === 'phm_directory' ? (
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-100">
                    <th className="p-3 sm:p-4">#</th>
                    <th className="p-3 sm:p-4">PHM Officer Name</th>
                    <th className="p-3 sm:p-4">Employee ID & NIC</th>
                    <th className="p-3 sm:p-4">PHM Service Area & GN</th>
                    <th className="p-3 sm:p-4">Contact Phone</th>
                    <th className="p-3 sm:p-4 text-center">Mothers Supervised</th>
                    <th className="p-3 sm:p-4 text-center">High-Risk Cases</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredMidwives.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400 font-bold">
                        කිසිදු PHM නිලධාරිනියක් හමු නොවීය. (No Midwives found)
                      </td>
                    </tr>
                  ) : (
                    filteredMidwives.map((mw, idx) => (
                      <tr key={mw.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 sm:p-4 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3 sm:p-4 font-bold text-slate-900">{mw.fullName}</td>
                        <td className="p-3 sm:p-4">
                          <div className="font-mono text-emerald-700 font-bold">{mw.employeeId || '—'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">NIC: {mw.nic}</div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="font-semibold text-slate-800">{mw.serviceArea || '—'}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{mw.gnDivisions || '—'}</div>
                        </td>
                        <td className="p-3 sm:p-4 font-mono text-blue-700">{mw.phone}</td>
                        <td className="p-3 sm:p-4 text-center font-bold text-slate-800">{mw.motherCount}</td>
                        <td className="p-3 sm:p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-black ${
                            mw.highRiskCount > 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {mw.highRiskCount}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-100">
                    <th className="p-3 sm:p-4">#</th>
                    <th className="p-3 sm:p-4">Mother Name & NIC</th>
                    <th className="p-3 sm:p-4">Blood Group & Age</th>
                    <th className="p-3 sm:p-4">Gestational Age & EDD</th>
                    <th className="p-3 sm:p-4">PHM Service Area</th>
                    <th className="p-3 sm:p-4">Assigned Midwife</th>
                    <th className="p-3 sm:p-4 text-center">Risk Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredMothers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400 font-bold">
                        වාර්තාවට අදාළ මව්වරුන් හමු නොවීය. (No mothers found for the selected criteria)
                      </td>
                    </tr>
                  ) : (
                    filteredMothers.map((m, idx) => (
                      <tr key={m.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 sm:p-4 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3 sm:p-4">
                          <div className="font-bold text-slate-900">{m.fullName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">NIC: {m.nic || '—'}</div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-black text-xs font-mono">
                            {m.bloodGroup || '—'}
                          </span>
                          <span className="text-xs text-slate-500 ml-2 font-bold">{m.age ? `${m.age} Yrs` : ''}</span>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="font-bold text-slate-800">{m.gestationalAge ? `${m.gestationalAge} සති (Wks)` : '—'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">EDD: {m.edd}</div>
                        </td>
                        <td className="p-3 sm:p-4 font-semibold text-slate-700">{m.serviceArea || '—'}</td>
                        <td className="p-3 sm:p-4 font-bold text-emerald-800">{m.midwifeName || '—'}</td>
                        <td className="p-3 sm:p-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                            m.riskStatus === 'High-Risk'
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {m.riskStatus === 'High-Risk' ? '🚨 High-Risk' : '✅ Normal'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Printable Document Modal */}
        {showPrintModal && (
          <ModalPortal>
            <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/75 backdrop-blur-md p-3 sm:p-6 flex min-h-screen items-center justify-center animate-in fade-in duration-200">
              <div className="fixed inset-0" onClick={() => setShowPrintModal(false)} aria-hidden="true" />
              <div className="relative bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-emerald-100 flex flex-col max-h-[88vh] overflow-hidden z-10 my-auto animate-in zoom-in-95 duration-200">
                <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">🖨️</span>
                    <span className="font-bold text-sm sm:text-base">MOH Division Official Print Preview</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase shadow transition-all flex items-center gap-1.5"
                    >
                      <span>Print Document</span>
                    </button>
                    <button
                      onClick={() => setShowPrintModal(false)}
                      className="p-2 text-slate-400 hover:text-white rounded-lg font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="p-6 sm:p-10 overflow-y-auto space-y-6 text-slate-800 bg-white" id="printable-area">
                  <div className="border-b-2 border-slate-900 pb-4 text-center">
                    <div className="text-xs font-bold text-emerald-900 tracking-widest uppercase">
                      Democratic Socialist Republic of Sri Lanka • Ministry of Health
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 uppercase tracking-tight">
                      OFFICE OF THE MEDICAL OFFICER OF HEALTH (MOH) — {mohArea.toUpperCase()}
                    </h2>
                    <p className="text-xs font-bold text-slate-500 uppercase mt-0.5">
                      Maternal & Child Health Division Strategic Registry
                    </p>
                    <div className="flex justify-between items-center text-[11px] font-semibold text-slate-600 mt-4 pt-2 border-t border-slate-200">
                      <span>DOC REF: REF-MOH-{mohArea.slice(0, 3).toUpperCase()}-{Date.now().toString().slice(-6)}</span>
                      <span>ISSUED: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString()}</span>
                      <span>DISTRICT: {district.toUpperCase()}</span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-emerald-900 uppercase">
                      {activeReportType === 'division_summary' && 'MOH Division Maternal Healthcare Strategic Report'}
                      {activeReportType === 'high_risk' && 'High-Risk Critical Pregnancies Emergency Surveillance Dossier'}
                      {activeReportType === 'phm_directory' && 'Public Health Midwives (PHM) Field Staff Registry'}
                      {activeReportType === 'upcoming_deliveries' && 'Upcoming Expected Deliveries (Next 30 Days) Clinical Schedule'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Filter Scope: MOH Division: {mohArea} | District: {district} | Midwife: {selectedMidwife} | Risk: {selectedRisk}
                    </p>
                  </div>

                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-slate-700">
                        <tr>
                          <th className="p-2 border-r border-slate-300">#</th>
                          <th className="p-2 border-r border-slate-300">Name / Title</th>
                          <th className="p-2 border-r border-slate-300">NIC / ID</th>
                          <th className="p-2 border-r border-slate-300">PHM Area</th>
                          <th className="p-2 border-r border-slate-300">Contact</th>
                          <th className="p-2">Status / Risk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {(activeReportType === 'phm_directory' ? filteredMidwives : filteredMothers).slice(0, 50).map((row, idx) => (
                          <tr key={row.id || idx}>
                            <td className="p-2 border-r border-slate-200 text-center font-bold">{idx + 1}</td>
                            <td className="p-2 border-r border-slate-200 font-bold">{row.fullName}</td>
                            <td className="p-2 border-r border-slate-200">{row.nic || row.employeeId || '—'}</td>
                            <td className="p-2 border-r border-slate-200">{row.serviceArea || '—'}</td>
                            <td className="p-2 border-r border-slate-200">{row.phone}</td>
                            <td className="p-2 font-bold">{row.riskStatus || row.status || 'Active'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-12 grid grid-cols-2 gap-8 text-center text-xs font-bold text-slate-600">
                    <div>
                      <div className="border-t border-slate-400 pt-2 w-48 mx-auto">
                        Medical Officer of Health (MOH)
                        <div className="text-[10px] text-slate-400 font-normal">{mohArea} MOH Division</div>
                      </div>
                    </div>
                    <div>
                      <div className="border-t border-slate-400 pt-2 w-48 mx-auto">
                        Supervising Public Health Midwife
                        <div className="text-[10px] text-slate-400 font-normal">Field Staff Authorization</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

      </div>
    </MOHLayout>
  );
};

export default MOHReports;
