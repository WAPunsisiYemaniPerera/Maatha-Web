import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import AdminLayout from '../../components/AdminLayout';
import { DISTRICTS, getMohAreas, findDistrictByMohArea } from '../../data/sriLankaLocations';
import { formatDisplayDate, safeRenderText, isHighRiskMother, normalizeRiskStatus } from '../../utils/securityValidators';

const ManageMothers = () => {
  const [mothers, setMothers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedMohArea, setSelectedMohArea] = useState('All');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [selectedTrimester, setSelectedTrimester] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [viewingMother, setViewingMother] = useState(null);

  const fetchMothers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "mothers"));
      const mothersList = querySnapshot.docs.map(d => {
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
          mohArea: safeRenderText(data.mohArea, ''),
          district: safeRenderText(data.district, ''),
          serviceArea: safeRenderText(data.serviceArea || data.phmArea, ''),
          midwifeName: safeRenderText(data.midwifeName, ''),
          hospitalName: safeRenderText(data.hospitalName, ''),
          riskStatus: isHigh ? 'High-Risk' : normalizeRiskStatus(data),
          isHighRisk: isHigh,
          notes: safeRenderText(data.notes || data.riskNotes || data.riskReason, ''),
          edd: formatDisplayDate(data.edd, 'නොදක්වා ඇත'),
          gestationalAge: safeRenderText(data.gestationalAge || data.weeks, ''),
          age: safeRenderText(data.age, '')
        };
      });
      setMothers(mothersList);
    } catch (error) {
      console.error("Error fetching mothers: ", error);
      showToast("දත්ත ලබා ගැනීමේ දෝෂයක් සිදු විය: " + error.message, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMothers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleDistrictChange = (e) => {
    setSelectedDistrict(e.target.value);
    setSelectedMohArea('All');
  };

  const resetFilters = () => {
    setSelectedDistrict('All');
    setSelectedMohArea('All');
    setSelectedRisk('All');
    setSelectedTrimester('All');
    setSearchTerm('');
  };

  const isFiltered = selectedDistrict !== 'All' || selectedMohArea !== 'All' || selectedRisk !== 'All' || selectedTrimester !== 'All' || searchTerm.trim() !== '';

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, "mothers", showDeleteModal.id));
        showToast(`මව ${showDeleteModal.fullName || ''} ගේ දත්ත සාර්ථකව පද්ධතියෙන් ඉවත් කරන ලදී. (Mother Record Deleted)`);
        setShowDeleteModal(null);
        if (viewingMother && viewingMother.id === showDeleteModal.id) {
          setViewingMother(null);
        }
        fetchMothers();
      } catch (error) {
        showToast("දෝෂයක් සිදු විය: " + error.message, 'error');
      }
    }
  };

  const availableMohAreas = selectedDistrict !== 'All' ? getMohAreas(selectedDistrict) : [];

  // KPI Calculations
  const stats = useMemo(() => {
    const total = mothers.length;
    const highRisk = mothers.filter(m => isHighRiskMother(m) || m.riskStatus === 'High-Risk').length;
    const normal = total - highRisk;
    const highRiskPercent = total > 0 ? Math.round((highRisk / total) * 100) : 0;
    
    // Unique districts covered
    const districtsSet = new Set();
    mothers.forEach(m => {
      const dist = m.district || findDistrictByMohArea(m.mohArea);
      if (dist) districtsSet.add(dist);
    });

    return { total, highRisk, normal, highRiskPercent, districtsCount: districtsSet.size };
  }, [mothers]);

  // Filter logic
  const filteredMothers = mothers.filter(m => {
    const motherDistrict = m.district || findDistrictByMohArea(m.mohArea);
    if (selectedDistrict !== 'All' && motherDistrict !== selectedDistrict) {
      return false;
    }
    if (selectedMohArea !== 'All' && m.mohArea !== selectedMohArea) {
      return false;
    }
    if (selectedRisk !== 'All') {
      const isHigh = isHighRiskMother(m) || m.riskStatus === 'High-Risk';
      if ((selectedRisk === 'High-Risk' || selectedRisk === 'High Risk') && !isHigh) {
        return false;
      }
      if (selectedRisk === 'Normal' && isHigh) {
        return false;
      }
    }
    if (selectedTrimester !== 'All') {
      const weeks = Number(m.gestationalAge || m.weeks || 0);
      if (selectedTrimester === 'T1' && (weeks <= 0 || weeks > 12)) return false;
      if (selectedTrimester === 'T2' && (weeks <= 12 || weeks > 27)) return false;
      if (selectedTrimester === 'T3' && weeks <= 27) return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const name = (m.fullName || '').toLowerCase();
      const nic = (m.nic || '').toLowerCase();
      const phone = (m.phone || '').toLowerCase();
      const area = (m.serviceArea || m.phmArea || '').toLowerCase();
      const moh = (m.mohArea || '').toLowerCase();
      if (!name.includes(term) && !nic.includes(term) && !phone.includes(term) && !area.includes(term) && !moh.includes(term)) {
        return false;
      }
    }
    return true;
  });

  return (
    <AdminLayout>
      {/* Toast Notification */}
      {message && (
        <div className={`fixed top-5 right-5 z-[130] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 animate-in slide-in-from-right duration-500 ${
          messageType === 'error' ? 'bg-red-900 border-l-4 border-red-500' : 'bg-slate-900 border-l-4 border-blue-500'
        }`}>
          <div className={`rounded-full p-1.5 ${messageType === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {messageType === 'error' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              )}
            </svg>
          </div>
          <p className="text-sm font-bold tracking-tight">{message}</p>
        </div>
      )}

      {/* View Full Mother Antenatal Dossier Modal */}
      {viewingMother && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-blue-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-blue-100 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className={`p-6 sm:p-8 text-white relative ${
              viewingMother.riskStatus === 'High-Risk' 
                ? 'bg-gradient-to-r from-red-700 via-rose-800 to-slate-950' 
                : 'bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950'
            }`}>
              <button 
                onClick={() => setViewingMother(null)}
                className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-4xl shadow-inner shrink-0">
                  🤰
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      viewingMother.riskStatus === 'High-Risk'
                        ? 'bg-red-500 text-white shadow-sm ring-2 ring-red-400/50'
                        : 'bg-emerald-500 text-white shadow-sm'
                    }`}>
                      {viewingMother.riskStatus === 'High-Risk' ? '🚨 High-Risk Maternal Alert' : '✅ Normal Pregnancy'}
                    </span>
                    {viewingMother.bloodGroup && (
                      <span className="bg-white/20 backdrop-blur-md px-3 py-0.5 rounded-full text-xs font-mono font-bold text-white border border-white/20">
                        🩸 {viewingMother.bloodGroup}
                      </span>
                    )}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight">{viewingMother.fullName}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm opacity-90 font-mono">
                    <span>NIC: {viewingMother.nic || 'නොදක්වා ඇත'}</span>
                    <span>•</span>
                    <span>වයස: {viewingMother.age ? `${viewingMother.age} Yrs` : '—'}</span>
                    <span>•</span>
                    <span>MOH: {viewingMother.mohArea || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[72vh] overflow-y-auto custom-scrollbar">
              
              {/* Gestational Timeline Gauge */}
              {(() => {
                const weeks = Number(viewingMother.gestationalAge || viewingMother.weeks || 0);
                const progressPercent = Math.min(100, Math.max(0, (weeks / 40) * 100));
                return (
                  <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-2.5">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                      <span className="flex items-center gap-2 text-blue-900">
                        <span className="text-lg">⏱️</span> ගර්භනී සති ප්‍රගතිය (Gestational Progress)
                      </span>
                      <span className="font-mono text-blue-800 bg-blue-100 px-3 py-1 rounded-xl text-xs sm:text-sm font-black">
                        {weeks > 0 ? `${weeks} / 40 සති (${Math.round(progressPercent)}%)` : 'සති සටහන් වී නැත'}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200/60 rounded-full h-4 overflow-hidden p-0.5">
                      <div 
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-700 shadow-sm"
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-500 pt-0.5">
                      <span>1 වන ත්‍රෛමාසිකය (0-12w)</span>
                      <span>2 වන ත්‍රෛමාසිකය (13-27w)</span>
                      <span>3 වන ත්‍රෛමාසිකය (28-40w)</span>
                    </div>
                  </div>
                );
              })()}

              {/* Key Quick Stats Cards */}
              <div className="grid grid-cols-3 gap-3.5 text-center">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">ගර්භනී සති</span>
                  <span className="text-base sm:text-lg font-black text-slate-800 mt-1 block">
                    {viewingMother.gestationalAge || viewingMother.weeks ? `${viewingMother.gestationalAge || viewingMother.weeks} සති` : '—'}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">ප්‍රසූති දිනය (EDD)</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 mt-1 block font-mono">{viewingMother.edd || 'නොදක්වා ඇත'}</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">රුධිර ගණය</span>
                  <span className="text-base sm:text-lg font-black text-blue-700 mt-1 block font-mono">{viewingMother.bloodGroup || '—'}</span>
                </div>
              </div>

              {/* Clinical & Maternal Details */}
              <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-100 space-y-3">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  සායනික සහ මාතෘ සෞඛ්‍ය විස්තර (Clinical & Antenatal Metrics)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 font-bold block">අවදානම් තත්ත්වය:</span>
                    <span className={`font-bold inline-block mt-0.5 ${viewingMother.riskStatus === 'High-Risk' ? 'text-red-600' : 'text-emerald-700'}`}>
                      {viewingMother.riskStatus === 'High-Risk' ? '🚨 අධි-අවදානම් (High-Risk)' : '✅ සාමාන්‍ය (Normal)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">ගර්භය (Gravida / Parity):</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      G: {viewingMother.gravida || '1'} | P: {viewingMother.para || '0'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">ප්‍රසූතිය සිදු කෙරෙන රෝහල:</span>
                    <span className="font-semibold text-slate-800">{viewingMother.hospitalName || 'පවරා නැත (N/A)'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">විශේෂ සෞඛ්‍ය සටහන් (Notes):</span>
                    <span className="font-semibold text-slate-700">{viewingMother.notes || viewingMother.riskNotes || 'කිසිදු විශේෂ සටහනක් නැත'}</span>
                  </div>
                </div>
              </div>

              {/* Regional Jurisdiction */}
              <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-100 space-y-3">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  පරිපාලන බලප්‍රදේශය සහ සෞඛ්‍ය නිලධාරිනිය (Jurisdiction & PHM Staff)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 font-bold block">දිස්ත්‍රික්කය (District):</span>
                    <span className="font-bold text-slate-900">{viewingMother.district || findDistrictByMohArea(viewingMother.mohArea) || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">MOH ප්‍රදේශය (MOH Area):</span>
                    <span className="font-bold text-blue-700">{viewingMother.mohArea || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">PHM සේවා කලාපය (PHM Area):</span>
                    <span className="font-semibold text-slate-800">{viewingMother.serviceArea || viewingMother.phmArea || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">භාරයේ සිටින PHM නිලධාරිනිය:</span>
                    <span className="font-semibold text-slate-800">{viewingMother.midwifeName || 'නොපවරා ඇත'}</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-100 space-y-3">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  සම්බන්ධීකරණ සහ හදිසි ඇමතුම් තොරතුරු (Contact & Emergency Info)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 font-bold block">මවගේ දුරකථන අංකය:</span>
                    {viewingMother.phone ? (
                      <a href={`tel:${viewingMother.phone}`} className="font-bold text-blue-700 hover:underline flex items-center gap-1">
                        📞 {viewingMother.phone}
                      </a>
                    ) : <span className="text-slate-400">නොදක්වා ඇත</span>}
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">හදිසි ඇමතුම් අංකය (Spouse/Emergency):</span>
                    {viewingMother.emergencyPhone || viewingMother.husbandPhone ? (
                      <a href={`tel:${viewingMother.emergencyPhone || viewingMother.husbandPhone}`} className="font-bold text-red-600 hover:underline flex items-center gap-1">
                        🚨 {viewingMother.emergencyPhone || viewingMother.husbandPhone}
                      </a>
                    ) : <span className="text-slate-400">නොදක්වා ඇත</span>}
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 font-bold block">නිවසේ ලිපිනය (Residential Address):</span>
                    <span className="font-semibold text-slate-800">{viewingMother.address || 'ලිපිනය ඇතුළත් කර නැත'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 text-xs sm:text-sm text-amber-900 flex items-start gap-3">
                <span className="text-lg mt-0.5">ℹ️</span>
                <span className="leading-relaxed">
                  <strong>Super Admin ප්‍රතිපත්තිය:</strong> මව්වරුන්ගේ දත්ත ලියාපදිංචි කිරීම සහ සංස්කරණය කලාපීය MOH කාර්යාල හා පවුල් සෞඛ්‍ය සේවා නිලධාරිනියන් (PHM) විසින් සිදු කෙරේ. Super Admin හට සමස්ත ජාතික දත්ත පරීක්ෂාව සහ අවශ්‍ය විට දත්ත පද්ධතියෙන් ඉවත් කිරීම (Delete) කළ හැක.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <button
                onClick={() => {
                  const target = viewingMother;
                  setViewingMother(null);
                  setShowDeleteModal(target);
                }}
                className="px-5 py-2.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                මවගේ දත්ත ඉවත් කරන්න (Delete)
              </button>
              <button 
                onClick={() => setViewingMother(null)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-xl shadow-md transition-all"
              >
                වසන්න (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-blue-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl border border-blue-100 text-center animate-in zoom-in-95 duration-200">
            <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-inner">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">මවගේ දත්ත පද්ධතියෙන් ඉවත් කරන්නද?</h3>
            <p className="text-xs font-bold text-slate-400 mt-1">
              මෙම මවගේ ලියාපදිංචි දත්ත හා සායනික වාර්තා පද්ධතියෙන් ස්ථිරවම ඉවත් කරනු ලැබේ.
            </p>
            
            <div className="bg-slate-50 p-4 rounded-2xl my-4 text-left border border-slate-100 text-sm">
              <div className="font-bold text-slate-900">{showDeleteModal.fullName}</div>
              <div className="text-slate-500 font-mono text-xs mt-0.5">NIC: {showDeleteModal.nic || 'නොදක්වා ඇත'} | MOH: {showDeleteModal.mohArea || '—'}</div>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={() => setShowDeleteModal(null)} 
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase transition-all"
              >
                නැත (Cancel)
              </button>
              <button 
                onClick={confirmDelete} 
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                ඔව් (Delete)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Executive Header Banner (Blue & White Theme) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 text-white p-6 sm:p-8 lg:p-10 rounded-3xl shadow-2xl border border-blue-800/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs sm:text-sm font-bold mb-2 border border-blue-400/20">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              National Maternal Registry & Clinical Oversight
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">ලියාපදිංචි මව්වරුන් කළමනාකරණය</h1>
            <p className="text-blue-100/80 text-xs sm:text-sm font-medium mt-1.5 max-w-2xl">
              දිවයින පුරා ලියාපදිංචි ගර්භනී මව්වරුන්ගේ සායනික තොරතුරු, අවදානම් තත්ත්වයන් (High-Risk Cases) සහ සෞඛ්‍ය ප්‍රගතිය පිළිබඳ සමස්ත නිරීක්ෂණය
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <button 
              onClick={fetchMothers}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-xs sm:text-sm font-bold text-white transition-all flex items-center gap-2 shadow-sm"
              title="දත්ත නැවුම් කරන්න (Refresh)"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Live KPI Overview Cards (Blue & White) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">මුළු ලියාපදිංචි මව්වරුන්</span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 mt-1 block">{stats.total}</span>
              <span className="text-xs text-slate-500 font-semibold mt-0.5 block">Total Registered</span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-3xl shadow-inner border border-blue-100">
              🤰
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-red-200 shadow-sm flex items-center justify-between relative overflow-hidden">
            <div>
              <span className="text-xs font-black text-red-600 uppercase tracking-wider block flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                අධි-අවදානම් මව්වරුන්
              </span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-red-600 mt-1 block">{stats.highRisk}</span>
              <span className="text-xs text-red-600/80 font-bold mt-0.5 block">
                {stats.highRiskPercent}% of Total Cases
              </span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl shadow-inner border border-red-100">
              🚨
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-emerald-700 uppercase tracking-wider block">සාමාන්‍ය තත්ත්වයේ මව්වරුන්</span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-700 mt-1 block">{stats.normal}</span>
              <span className="text-xs text-emerald-600/80 font-semibold mt-0.5 block">Normal Pregnancy</span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-inner border border-emerald-100">
              ✅
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-blue-700 uppercase tracking-wider block">ආවරණය වන දිස්ත්‍රික්ක</span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-blue-900 mt-1 block">{stats.districtsCount} <span className="text-sm font-bold text-slate-400">/ 26</span></span>
              <span className="text-xs text-blue-700/80 font-semibold mt-0.5 block">Districts Active</span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-2xl shadow-inner border border-blue-100">
              📍
            </div>
          </div>
        </div>

        {/* Filter Toolbar Card (Blue & White) */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-blue-100 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-800 uppercase tracking-wider">දත්ත පෙරණය සහ සෙවීම (Filters & Search)</span>
              {isFiltered && (
                <button 
                  onClick={resetFilters}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800 underline ml-2"
                >
                  පෙරහන් ඉවත් කරන්න (Reset)
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-50 text-blue-800 text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full border border-blue-200">
                පෙරූ ප්‍රතිඵල: {filteredMothers.length} / {mothers.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Search */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">සොයන්න (Name / NIC / Phone / Area)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="නම, NIC, දුරකථන අංකය..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3.5 pr-9 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 text-sm font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Filter District */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">දිස්ත්‍රික්කය (District)</label>
              <select
                value={selectedDistrict}
                onChange={handleDistrictChange}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
              >
                <option value="All">සියලුම දිස්ත්‍රික්ක (All Districts)</option>
                {DISTRICTS.map(dist => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>

            {/* Filter MOH Area */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">MOH ප්‍රදේශය (MOH Area)</label>
              <select
                value={selectedMohArea}
                onChange={(e) => setSelectedMohArea(e.target.value)}
                disabled={selectedDistrict === 'All'}
                className={`w-full p-3.5 border rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all ${
                  selectedDistrict === 'All' ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <option value="All">
                  {selectedDistrict === 'All' ? "සියලුම MOH ප්‍රදේශ" : `සියලුම MOH ප්‍රදේශ (${selectedDistrict})`}
                </option>
                {availableMohAreas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            {/* Filter Risk Status */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">අවදානම් තත්ත්වය (Risk Status)</label>
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
              >
                <option value="All">සියලුම තත්ත්ව (All Risk Levels)</option>
                <option value="High-Risk">🚨 අධි-අවදානම් (High-Risk Only)</option>
                <option value="Normal">✅ සාමාන්‍ය (Normal Only)</option>
              </select>
            </div>
          </div>

          {/* Quick Trimester Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
            <span className="text-xs font-black text-slate-400 uppercase mr-1">ත්‍රෛමාසිකය (Trimester):</span>
            {[
              { id: 'All', label: 'සියලුම (All Trimesters)' },
              { id: 'T1', label: '🌱 1 වන ත්‍රෛමාසිකය (1-12w)' },
              { id: 'T2', label: '🌿 2 වන ත්‍රෛමාසිකය (13-27w)' },
              { id: 'T3', label: '🌸 3 වන ත්‍රෛමාසිකය (28-40w)' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTrimester(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  selectedTrimester === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Data Table Card (Blue & White) */}
        <div className="bg-white rounded-3xl shadow-sm border border-blue-100 overflow-hidden">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-blue-900 font-bold text-base">මව්වරුන්ගේ දත්ත පද්ධතියෙන් ලබාගනිමින් පවතී...</p>
              <p className="text-xs text-slate-400">Loading Nationwide Maternal Records...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 text-left text-xs font-black uppercase tracking-wider">
                    <th className="py-4 px-5">මවගේ නම සහ තොරතුරු</th>
                    <th className="py-4 px-4 text-center">අවදානම් තත්ත්වය</th>
                    <th className="py-4 px-4">ගර්භනී සති / EDD</th>
                    <th className="py-4 px-4">දිස්ත්‍රික්කය & MOH</th>
                    <th className="py-4 px-4">PHM කලාපය & නිලධාරිනිය</th>
                    <th className="py-4 px-4 text-center">ක්‍රියාකාරකම් (Actions)</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 divide-y divide-slate-100 font-medium">
                  {filteredMothers.length > 0 ? filteredMothers.map((mother) => {
                    const displayDistrict = mother.district || findDistrictByMohArea(mother.mohArea) || '—';
                    const weeks = Number(mother.gestationalAge || mother.weeks || 0);
                    const progressPercent = Math.min(100, Math.max(0, (weeks / 40) * 100));

                    return (
                      <tr key={mother.id} className="hover:bg-blue-50/30 transition duration-150">
                        {/* Mother Name & NIC */}
                        <td className="py-4 px-5">
                          <div className="flex items-center space-x-3.5">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 ${
                              mother.riskStatus === 'High-Risk' 
                                ? 'bg-red-50 text-red-600 border border-red-200' 
                                : 'bg-blue-50 text-blue-700 border border-blue-100'
                            }`}>
                              🤰
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                                <span>{mother.fullName}</span>
                                {mother.bloodGroup && (
                                  <span className="bg-blue-50 text-blue-700 text-xs font-mono font-bold px-2 py-0.5 rounded border border-blue-200">
                                    {mother.bloodGroup}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 font-mono font-medium flex items-center gap-2 mt-0.5">
                                <span>NIC: {mother.nic || 'නැත'}</span>
                                {mother.age && <span>• {mother.age} Yrs</span>}
                                {mother.phone && <span>• {mother.phone}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Risk Status */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase ${
                            mother.riskStatus === 'High-Risk' 
                            ? 'bg-red-100 text-red-700 border border-red-200 shadow-sm animate-pulse' 
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {mother.riskStatus === 'High-Risk' ? '🚨 High-Risk' : '✅ Normal'}
                          </span>
                        </td>

                        {/* Gestational Weeks & Progress */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                            <span>{weeks > 0 ? `${weeks} සති (Wks)` : '—'}</span>
                          </div>
                          {weeks > 0 && (
                            <div className="w-28 bg-slate-100 rounded-full h-2 mt-1.5 overflow-hidden">
                              <div 
                                className="bg-blue-600 h-full rounded-full" 
                                style={{ width: `${progressPercent}%` }}
                              ></div>
                            </div>
                          )}
                          <div className="text-xs text-slate-400 font-mono mt-1">
                            EDD: {mother.edd || '—'}
                          </div>
                        </td>

                        {/* District & MOH Area */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <span className="text-blue-500">📍</span>
                            <span>{displayDistrict}</span>
                          </div>
                          <div className="text-xs font-semibold text-blue-700 mt-0.5">
                            {mother.mohArea || "—"}
                          </div>
                        </td>

                        {/* PHM Area & Midwife */}
                        <td className="py-4 px-4">
                          <span className="inline-block bg-slate-100 text-slate-700 px-3 py-1 rounded-xl text-xs font-bold border border-slate-200">
                            {mother.serviceArea || mother.phmArea || "කලාපයක් දක්වා නැත"}
                          </span>
                          <div className="text-xs text-slate-500 mt-1">
                            PHM: <span className="font-semibold text-slate-700">{mother.midwifeName || 'නොපවරා ඇත'}</span>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            {/* View Full Dossier */}
                            <button
                              onClick={() => setViewingMother(mother)}
                              title="සම්පූර්ණ සායනික තොරතුරු බලන්න (View Antenatal Dossier)"
                              className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              <span>Dossier</span>
                            </button>

                            {/* Delete Record */}
                            <button 
                              onClick={() => setShowDeleteModal(mother)}
                              className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                              title="මවගේ දත්ත ඉවත් කරන්න (Delete Record)"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="6" className="py-20 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl">
                          🔍
                        </div>
                        <div className="text-base font-bold text-slate-800">කිසිදු මවකගේ දත්ත හමු නොවීය.</div>
                        <div className="text-xs text-slate-400 mt-1">No registered mothers matching the filter criteria found.</div>
                        {isFiltered && (
                          <button 
                            onClick={resetFilters}
                            className="mt-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all"
                          >
                            සියලුම පෙරහන් ඉවත් කරන්න (Reset All Filters)
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default ManageMothers;