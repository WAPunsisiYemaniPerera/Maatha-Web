import React, { useEffect, useState, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import AdminLayout from '../../components/AdminLayout';
import ModalPortal from '../../components/ModalPortal';
import { DISTRICTS, getMohAreas, findDistrictByMohArea } from '../../data/sriLankaLocations';
import { formatDisplayDate, safeRenderText } from '../../utils/securityValidators';

const ManageMidwives = () => {
  const [midwives, setMidwives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedMohArea, setSelectedMohArea] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [viewingMidwife, setViewingMidwife] = useState(null);

  const fetchMidwives = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "midwives"));
      const midwifeList = querySnapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          fullName: safeRenderText(data.fullName, ''),
          nic: safeRenderText(data.nic, ''),
          employeeId: safeRenderText(data.employeeId, ''),
          phone: safeRenderText(data.phone, ''),
          email: safeRenderText(data.email, ''),
          mohArea: safeRenderText(data.mohArea, ''),
          district: safeRenderText(data.district, ''),
          serviceArea: safeRenderText(data.serviceArea, ''),
          gnDivisions: safeRenderText(data.gnDivisions, ''),
          designation: safeRenderText(data.designation, 'Public Health Midwife (PHM)'),
          status: safeRenderText(data.status, 'Active'),
          appointmentDate: formatDisplayDate(data.appointmentDate, '—')
        };
      });
      setMidwives(midwifeList);
    } catch (error) {
      console.error("Error fetching midwives: ", error);
      showToast("දත්ත ලබා ගැනීමේ දෝෂයක් සිදු විය: " + error.message, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMidwives();
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
    setSearchTerm('');
  };

  const isFiltered = selectedDistrict !== 'All' || selectedMohArea !== 'All' || searchTerm.trim() !== '';

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, "midwives", showDeleteModal.id));
        await deleteDoc(doc(db, "users", showDeleteModal.id));
        showToast(`පවුල් සෞඛ්‍ය නිලධාරිනී ${showDeleteModal.fullName || ''} පද්ධතියෙන් ඉවත් කරන ලදී. (Midwife Removed)`);
        setShowDeleteModal(null);
        if (viewingMidwife && viewingMidwife.id === showDeleteModal.id) {
          setViewingMidwife(null);
        }
        fetchMidwives();
      } catch (error) {
        showToast("දෝෂයක් සිදු විය: " + error.message, 'error');
      }
    }
  };

  const availableMohAreas = selectedDistrict !== 'All' ? getMohAreas(selectedDistrict) : [];

  // KPI Calculations
  const stats = useMemo(() => {
    const total = midwives.length;
    const districtsSet = new Set();
    const mohSet = new Set();
    const serviceAreasSet = new Set();

    midwives.forEach(m => {
      const dist = m.district || findDistrictByMohArea(m.mohArea);
      if (dist) districtsSet.add(dist);
      if (m.mohArea) mohSet.add(m.mohArea);
      if (m.serviceArea) serviceAreasSet.add(m.serviceArea);
    });

    return {
      total,
      districtsCount: districtsSet.size,
      mohCount: mohSet.size,
      serviceAreasCount: serviceAreasSet.size
    };
  }, [midwives]);

  // Filter logic
  const filteredMidwives = midwives.filter(m => {
    const midwifeDistrict = m.district || findDistrictByMohArea(m.mohArea);
    if (selectedDistrict !== 'All' && midwifeDistrict !== selectedDistrict) {
      return false;
    }
    if (selectedMohArea !== 'All' && m.mohArea !== selectedMohArea) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const name = (m.fullName || '').toLowerCase();
      const nic = (m.nic || '').toLowerCase();
      const area = (m.serviceArea || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      const empId = (m.employeeId || '').toLowerCase();
      const phone = (m.phone || '').toLowerCase();
      const gn = (m.gnDivisions || '').toLowerCase();
      const moh = (m.mohArea || '').toLowerCase();

      if (!name.includes(term) && !nic.includes(term) && !area.includes(term) && 
          !email.includes(term) && !empId.includes(term) && !phone.includes(term) && 
          !gn.includes(term) && !moh.includes(term)) {
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

      {/* Full Midwife Profile Dossier Modal */}
      {viewingMidwife && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-blue-950/70 backdrop-blur-md p-3 sm:p-6 flex min-h-screen items-center justify-center animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setViewingMidwife(null)} aria-hidden="true" />
            <div className="relative bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-blue-100 flex flex-col max-h-[88vh] z-10 my-auto animate-in zoom-in-95 duration-300">
              {/* Modal Header */}
              <div className="shrink-0 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 p-5 sm:p-7 text-white relative">
                <button 
                  onClick={() => setViewingMidwife(null)}
                  className="absolute top-4 sm:top-5 right-4 sm:right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 transition-all z-20"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 pr-8 sm:pr-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl sm:text-4xl shadow-inner shrink-0">
                    👩‍⚕️
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-block px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 text-xs font-black uppercase tracking-wider border border-blue-400/30">
                        Public Health Midwife (PHM)
                      </span>
                      {viewingMidwife.status && (
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-0.5 rounded-full text-xs font-bold">
                          ● {viewingMidwife.status}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight">{viewingMidwife.fullName}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm opacity-90 font-mono">
                      <span>ID: {viewingMidwife.employeeId || 'නොදක්වා ඇත'}</span>
                      <span>•</span>
                      <span>NIC: {viewingMidwife.nic || '—'}</span>
                      <span>•</span>
                      <span>MOH: {viewingMidwife.mohArea || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 custom-scrollbar">
                {/* Quick Stat Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">සේවක අංකය (ID)</span>
                    <span className="text-base sm:text-lg font-black text-slate-800 mt-1 block font-mono">
                      {viewingMidwife.employeeId || '—'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">දිස්ත්‍රික්කය</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800 mt-1 block">
                      {viewingMidwife.district || findDistrictByMohArea(viewingMidwife.mohArea) || '—'}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">සේවා කලාපය</span>
                    <span className="text-xs sm:text-sm font-bold text-blue-700 mt-1 block">
                      {viewingMidwife.serviceArea || '—'}
                    </span>
                  </div>
                </div>

                {/* Personal & Official Credentials */}
                <div className="bg-blue-50/40 p-4 sm:p-5 rounded-2xl border border-blue-100 space-y-3">
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    වෘත්තීය සහ නිල තොරතුරු (Professional Credentials)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <span className="text-slate-400 font-bold block">සම්පූර්ණ නම:</span>
                      <span className="font-bold text-slate-900 text-sm sm:text-base">{viewingMidwife.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">ජාතික හැඳුනුම්පත (NIC):</span>
                      <span className="font-semibold text-slate-800 font-mono">{viewingMidwife.nic || 'නොදක්වා ඇත'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">තනතුර:</span>
                      <span className="font-semibold text-slate-700">{viewingMidwife.designation || 'Public Health Midwife (PHM)'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">පත් කළ දිනය:</span>
                      <span className="font-semibold text-slate-700">{viewingMidwife.appointmentDate || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Jurisdiction & Coverage */}
                <div className="bg-blue-50/40 p-4 sm:p-5 rounded-2xl border border-blue-100 space-y-3">
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    පරිපාලන බලප්‍රදේශය සහ ග්‍රාම නිලධාරී වසම් (Jurisdiction & Coverage)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <span className="text-slate-400 font-bold block">දිස්ත්‍රික්කය (District):</span>
                      <span className="font-bold text-slate-900">{viewingMidwife.district || findDistrictByMohArea(viewingMidwife.mohArea) || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">MOH ප්‍රදේශය (MOH Area):</span>
                      <span className="font-bold text-blue-700">{viewingMidwife.mohArea || '—'}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 font-bold block">PHM සේවා කලාපය (Service Area):</span>
                      <span className="font-bold text-blue-800 text-sm sm:text-base">{viewingMidwife.serviceArea || '—'}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-slate-400 font-bold block mb-2">අයත් ග්‍රාම නිලධාරී වසම් (Assigned GN Divisions):</span>
                      {viewingMidwife.gnDivisions ? (
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {viewingMidwife.gnDivisions.split(',').map((gn, idx) => (
                            <span key={idx} className="bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 shadow-2xs">
                              📍 {gn.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">වසම් දක්වා නැත</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contact Channels */}
                <div className="bg-blue-50/40 p-4 sm:p-5 rounded-2xl border border-blue-100 space-y-3">
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    සම්බන්ධීකරණ තොරතුරු (Communication Channels)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                    <div>
                      <span className="text-slate-400 font-bold block">ජංගම දුරකථන අංකය:</span>
                      {viewingMidwife.phone ? (
                        <a href={`tel:${viewingMidwife.phone}`} className="font-bold text-blue-700 hover:underline flex items-center gap-1">
                          📞 {viewingMidwife.phone}
                        </a>
                      ) : <span className="text-slate-400">නොදක්වා ඇත</span>}
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block">රාජකාරි ඊමේල් ලිපිනය:</span>
                      {viewingMidwife.email ? (
                        <a href={`mailto:${viewingMidwife.email}`} className="font-semibold text-blue-700 hover:underline flex items-center gap-1 font-mono break-all">
                          ✉️ {viewingMidwife.email}
                        </a>
                      ) : <span className="text-slate-400">නොදක්වා ඇත</span>}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/80 p-3.5 sm:p-4 rounded-2xl border border-amber-200 text-xs sm:text-sm text-amber-900 flex items-start gap-3">
                  <span className="text-base sm:text-lg mt-0.5">ℹ️</span>
                  <span className="leading-relaxed">
                    <strong>Super Admin ප්‍රතිපත්තිය:</strong> පවුල් සෞඛ්‍ය නිලධාරිනියන් (PHM) ලියාපදිංචි කිරීම සහ සංස්කරණය අදාළ MOH කාර්යාල මඟින් සිදු කෙරේ. Super Admin හට රට පුරා නිලධාරිනියන්ගේ දත්ත පරීක්ෂාව සහ අවශ්‍ය විට පද්ධතියෙන් ඉවත් කිරීම (Delete) සිදු කළ හැක.
                  </span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="shrink-0 p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2 justify-between items-center">
                <button
                  onClick={() => {
                    const target = viewingMidwife;
                    setViewingMidwife(null);
                    setShowDeleteModal(target);
                  }}
                  className="px-4 sm:px-5 py-2.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  නිලධාරිනිය ඉවත් කරන්න (Delete)
                </button>
                <button 
                  onClick={() => setViewingMidwife(null)}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all"
                >
                  වසන්න (Close)
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-blue-950/70 backdrop-blur-md p-4 flex min-h-screen items-center justify-center animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setShowDeleteModal(null)} aria-hidden="true" />
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-blue-100 text-center z-10 my-auto animate-in zoom-in-95 duration-200">
              <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-inner">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">පවුල් සෞඛ්‍ය නිලධාරිනිය ඉවත් කරන්නද?</h3>
              <p className="text-xs font-bold text-slate-400 mt-1">
                මෙම නිලධාරිනියගේ ගිණුම හා සේවා පැවරුම් පද්ධතියෙන් ස්ථිරවම ඉවත් කරනු ලැබේ.
              </p>
              
              <div className="bg-slate-50 p-4 rounded-2xl my-4 text-left border border-slate-100 text-xs sm:text-sm">
                <div className="font-bold text-slate-900">{showDeleteModal.fullName}</div>
                <div className="text-slate-500 font-mono text-xs mt-0.5">
                  ID: {showDeleteModal.employeeId || '—'} | MOH: {showDeleteModal.mohArea || '—'}
                </div>
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
        </ModalPortal>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Executive Header Banner (Blue & White Theme) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 text-white p-6 sm:p-8 lg:p-10 rounded-3xl shadow-2xl border border-blue-800/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs sm:text-sm font-bold mb-2 border border-blue-400/20">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              National Midwifery Directory & PHM Oversight
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">පවුල් සෞඛ්‍ය සේවා නිලධාරීන් කළමනාකරණය</h1>
            <p className="text-blue-100/80 text-xs sm:text-sm font-medium mt-1.5 max-w-2xl">
              දිවයිනේ සියලුම MOH කොට්ඨාසයන්හි සේවය කරන පවුල් සෞඛ්‍ය සේවා නිලධාරිනියන්ගේ (PHM) නාමාවලිය, සේවා කලාප සහ අධීක්ෂණය
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <button 
              onClick={fetchMidwives}
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
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">මුළු PHM නිලධාරිනියන්</span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 mt-1 block">{stats.total}</span>
              <span className="text-xs text-slate-500 font-semibold mt-0.5 block">Total Midwives</span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-3xl shadow-inner border border-blue-100">
              👩‍⚕️
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-blue-700 uppercase tracking-wider block">ක්‍රියාකාරී දිස්ත්‍රික්ක</span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-blue-900 mt-1 block">{stats.districtsCount} <span className="text-sm font-bold text-slate-400">/ 26</span></span>
              <span className="text-xs text-blue-700/80 font-semibold mt-0.5 block">Active Districts</span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-2xl shadow-inner border border-blue-100">
              📍
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-blue-700 uppercase tracking-wider block">MOH ප්‍රදේශ ආවරණය</span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-blue-900 mt-1 block">{stats.mohCount}</span>
              <span className="text-xs text-blue-700/80 font-semibold mt-0.5 block">MOH Areas Covered</span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-2xl shadow-inner border border-blue-100">
              🏥
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-blue-700 uppercase tracking-wider block">සේවා කලාප සංඛ්‍යාව</span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-blue-900 mt-1 block">{stats.serviceAreasCount}</span>
              <span className="text-xs text-blue-700/80 font-semibold mt-0.5 block">PHM Divisions Assigned</span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-2xl shadow-inner border border-blue-100">
              🗺️
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
                පෙරූ ප්‍රතිඵල: {filteredMidwives.length} / {midwives.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Search */}
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-1.5">සොයන්න (Search Name / NIC / ID / Area / Email)</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="නම, NIC, සේවක අංකය, කලාපය..."
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
          </div>
        </div>

        {/* Midwives Table Card (Blue & White) */}
        <div className="bg-white rounded-3xl shadow-sm border border-blue-100 overflow-hidden">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-blue-900 font-bold text-base">දත්ත පද්ධතියෙන් ලබාගනිමින් පවතී...</p>
              <p className="text-xs text-slate-400">Loading Midwifery Directory...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 uppercase tracking-wider text-xs font-black">
                    <th className="px-5 py-4 text-left">නිලධාරිනියගේ නම සහ හැඳුනුම් අංක</th>
                    <th className="px-4 py-4 text-left">දිස්ත්‍රික්කය & MOH ප්‍රදේශය</th>
                    <th className="px-4 py-4 text-left">සේවා කලාපය (PHM Area)</th>
                    <th className="px-4 py-4 text-left">සම්බන්ධීකරණය (Contact)</th>
                    <th className="px-4 py-4 text-center">ක්‍රියාකාරකම් (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredMidwives.length > 0 ? filteredMidwives.map((midwife) => {
                    const displayDistrict = midwife.district || findDistrictByMohArea(midwife.mohArea) || '—';
                    return (
                      <tr key={midwife.id} className="hover:bg-blue-50/30 transition duration-150">
                        {/* Name & ID */}
                        <td className="px-5 py-4">
                          <div className="flex items-center space-x-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center text-xl font-black shrink-0">
                              👩‍⚕️
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                                <span>{midwife.fullName}</span>
                              </div>
                              <div className="text-xs text-slate-400 font-mono font-medium flex items-center gap-2 mt-0.5">
                                {midwife.employeeId && (
                                  <span className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded border border-blue-200">
                                    ID: {midwife.employeeId}
                                  </span>
                                )}
                                <span>NIC: {midwife.nic || 'නැත'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* District & MOH Area */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <span className="text-blue-500">📍</span>
                            <span>{displayDistrict}</span>
                          </div>
                          <div className="text-xs font-semibold text-blue-700 mt-0.5">
                            {midwife.mohArea || "—"}
                          </div>
                        </td>

                        {/* Service Area & GN */}
                        <td className="px-4 py-4">
                          <span className="inline-block bg-blue-50 text-blue-800 px-3 py-1 rounded-xl border border-blue-100 text-xs font-bold">
                            {midwife.serviceArea || "සේවා කලාපය දක්වා නැත"}
                          </span>
                          {midwife.gnDivisions && (
                            <div className="text-xs text-slate-400 mt-1 truncate max-w-xs" title={midwife.gnDivisions}>
                              GN: <span className="text-slate-600 font-semibold">{midwife.gnDivisions}</span>
                            </div>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {midwife.phone ? (
                            <a href={`tel:${midwife.phone}`} className="font-bold text-slate-800 hover:text-blue-700 flex items-center gap-1 text-sm">
                              📞 {midwife.phone}
                            </a>
                          ) : (
                            <div className="text-slate-400 text-xs">දුරකථන නැත</div>
                          )}
                          {midwife.email && (
                            <a href={`mailto:${midwife.email}`} className="text-xs text-blue-600 hover:underline font-mono block mt-0.5">
                              {midwife.email}
                            </a>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center space-x-2">
                            {/* View Profile */}
                            <button
                              onClick={() => setViewingMidwife(midwife)}
                              title="සම්පූර්ණ තොරතුරු බලන්න (View Profile Dossier)"
                              className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              <span>Dossier</span>
                            </button>

                            {/* Delete */}
                            <button 
                              onClick={() => setShowDeleteModal(midwife)}
                              className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-sm"
                              title="නිලධාරිනිය ඉවත් කරන්න (Delete Midwife)"
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
                      <td colSpan="5" className="py-20 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl">
                          🔍
                        </div>
                        <div className="text-base font-bold text-slate-800">කිසිදු නිලධාරිනියකගේ දත්ත හමු නොවීය.</div>
                        <div className="text-xs text-slate-400 mt-1">No registered midwives matching the filter criteria found.</div>
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

export default ManageMidwives;