import React, { useEffect, useState } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import MOHLayout from '../../components/MOHLayout';
import ModalPortal from '../../components/ModalPortal';
import { findDistrictByMohArea } from '../../data/sriLankaLocations';
import { safeRenderText } from '../../utils/securityValidators';

const ManageMidwives = () => {
  const [midwives, setMidwives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [selectedMidwife, setSelectedMidwife] = useState(null);
  const [district, setDistrict] = useState('Colombo');
  const [mohArea, setMohArea] = useState('Colombo');
  const [searchTerm, setSearchTerm] = useState('');

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
          console.error("Error fetching admin profile:", err);
        }
      }
    };
    fetchAdminProfile();
  }, []);

  const fetchMidwivesWithStats = async () => {
    setLoading(true);
    try {
      // Parallel fetch midwives and mothers for this MOH area
      const [midSnap, mtrSnap] = await Promise.all([
        getDocs(query(collection(db, "midwives"), where("mohArea", "==", mohArea))),
        getDocs(query(collection(db, "mothers"), where("mohArea", "==", mohArea)))
      ]);

      const allMothers = mtrSnap.docs.map(d => d.data());

      const midwifeList = midSnap.docs.map(midwifeDoc => {
        const data = midwifeDoc.data();
        const mwMothers = allMothers.filter(m => (m.midwifeName === data.fullName || m.serviceArea === data.serviceArea));
        const highRisk = mwMothers.filter(m => m.riskStatus === 'High-Risk').length;

        return {
          id: midwifeDoc.id,
          ...data,
          fullName: safeRenderText(data.fullName, ''),
          nic: safeRenderText(data.nic, ''),
          employeeId: safeRenderText(data.employeeId, ''),
          phone: safeRenderText(data.phone, ''),
          email: safeRenderText(data.email, ''),
          serviceArea: safeRenderText(data.serviceArea || data.phmArea, ''),
          gnDivisions: safeRenderText(data.gnDivisions, ''),
          motherCount: mwMothers.length,
          highRiskCount: highRisk
        };
      });

      setMidwives(midwifeList);
    } catch (error) {
      console.error("Error fetching midwives data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMidwivesWithStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mohArea]);

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, "midwives", showDeleteModal));
        await deleteDoc(doc(db, "users", showDeleteModal));
        setShowDeleteModal(null);
        setMessage("නිලධාරිනිය සාර්ථකව ඉවත් කරන ලදී. (Midwife Removed)");
        fetchMidwivesWithStats();
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  const filteredMidwives = midwives.filter(m => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = (m.fullName || '').toLowerCase();
    const nic = (m.nic || '').toLowerCase();
    const area = (m.serviceArea || '').toLowerCase();
    const empId = (m.employeeId || '').toLowerCase();
    return name.includes(term) || nic.includes(term) || area.includes(term) || empId.includes(term);
  });

  return (
    <MOHLayout>
      {/* Midwife Full Profile Dossier Modal */}
      {selectedMidwife && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-blue-950/70 backdrop-blur-md p-3 sm:p-6 flex min-h-screen items-center justify-center animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setSelectedMidwife(null)} aria-hidden="true" />
            <div className="relative bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[88vh] z-10 my-auto animate-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-r from-teal-700 to-emerald-800 p-6 text-white relative shrink-0">
                <button 
                  onClick={() => setSelectedMidwife(null)}
                  className="absolute top-5 right-5 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-all"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl shadow-inner shrink-0">
                    👩‍⚕️
                  </div>
                  <div className="pr-6">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider mb-1">
                      Public Health Midwife (PHM)
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight">{selectedMidwife.fullName}</h3>
                    <p className="text-xs text-teal-100 font-mono">Employee ID: {selectedMidwife.employeeId || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-blue-50 p-3 rounded-2xl">
                    <span className="text-[10px] font-black text-blue-500 uppercase block">භාරයේ සිටින මව්වරුන්</span>
                    <span className="text-2xl font-black text-blue-800">{selectedMidwife.motherCount}</span>
                  </div>
                  <div className="bg-red-50 p-3 rounded-2xl">
                    <span className="text-[10px] font-black text-red-500 uppercase block">අධි-අවදානම් මව්වරුන්</span>
                    <span className="text-2xl font-black text-red-600">{selectedMidwife.highRiskCount}</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-2xl space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-400 font-bold block">ජාතික හැඳුනුම්පත (NIC):</span>
                      <span className="font-bold text-gray-800 font-mono">{selectedMidwife.nic || 'නොදක්වා ඇත'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block">දුරකථන අංකය:</span>
                      <a href={`tel:${selectedMidwife.phone}`} className="font-bold text-blue-600 hover:underline">{selectedMidwife.phone || '—'}</a>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block">ඊමේල් ලිපිනය:</span>
                      <span className="font-semibold text-gray-700">{selectedMidwife.email || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block">සේවා කලාපය (PHM Area):</span>
                      <span className="font-bold text-emerald-700">{selectedMidwife.serviceArea || '—'}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray-400 font-bold block">ග්‍රාම නිලධාරී වසම් (GN Divisions):</span>
                      <span className="font-semibold text-gray-700">{selectedMidwife.gnDivisions || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
                <button 
                  onClick={() => setSelectedMidwife(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all"
                >
                  වසන්න (Close)
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-blue-950/70 backdrop-blur-md p-4 flex min-h-screen items-center justify-center animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setShowDeleteModal(null)} aria-hidden="true" />
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center z-10 my-auto animate-in zoom-in-95 duration-200">
              <div className="bg-red-100 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-inner">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">නිලධාරිනිය ඉවත් කරන්නද?</h3>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-1 mb-6">Are you sure you want to remove this midwife?</p>
              <div className="flex space-x-3">
                <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase transition-all">නැත (No)</button>
                <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-red-200 transition-all">ඔව් (Yes)</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Success Message */}
      {message && (
        <div className="fixed top-5 right-5 z-[130] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border-l-4 border-emerald-500 animate-in slide-in-from-right duration-500">
          <p className="text-sm font-bold tracking-tight">{message}</p>
        </div>
      )}

      {/* Header & Locked Jurisdiction Badge */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">පවුල් සෞඛ්‍ය නිලධාරීන් කළමනාකරණය</h1>
          <div className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mt-1">
            PHM Midwife Registry & Healthcare Allocation — {mohArea} ({district})
          </div>
        </div>

        {/* Locked Official Jurisdiction Badge */}
        <div className="flex items-center gap-2">
          <span className="px-3.5 py-2 bg-emerald-950 text-emerald-200 border border-emerald-400/30 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <span className="text-sm">🔒</span>
            <span>{mohArea} MOH ({district})</span>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded font-black uppercase ml-1">Official</span>
          </span>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
            👩‍⚕️
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{midwives.length}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">MOH පවුල් සෞඛ්‍ය නිලධාරීන්</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
            🤰
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">
              {midwives.reduce((acc, m) => acc + (m.motherCount || 0), 0)}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">භාරයේ සිටින මව්වරුන්</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-red-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
            🚨
          </div>
          <div>
            <div className="text-2xl font-black text-red-600">
              {midwives.reduce((acc, m) => acc + (m.highRiskCount || 0), 0)}
            </div>
            <div className="text-[11px] font-bold text-red-500 uppercase tracking-wider">අධි-අවදානම් නිරීක්ෂණ</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
            🏘️
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">
              {new Set(midwives.map(m => m.serviceArea).filter(Boolean)).size}
            </div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ආවරණය වන PHM වසම්</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 max-w-md w-full relative">
          <input
            type="text"
            placeholder="නිලධාරිනියගේ නම, NIC, සේවක අංකය හෝ සේවා කලාපය..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 font-bold text-xs">✕</button>
          )}
        </div>
        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3.5 py-2 rounded-xl">
          පෙරූ නිලධාරීන්: <strong className="text-emerald-700">{filteredMidwives.length}</strong>
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm italic text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-4"></div>
          දත්ත ලබාගනිමින් පවතී...
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="p-4">නිලධාරිනිය (Midwife & NIC)</th>
                <th className="p-4">සම්බන්ධීකරණය (Contact)</th>
                <th className="p-4">සේවා ප්‍රදේශය (PHM Area)</th>
                <th className="p-4 text-center">මව්වරුන්</th>
                <th className="p-4 text-center">අවදානම්</th>
                <th className="p-4 text-center">ක්‍රියා (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs">
              {filteredMidwives.length > 0 ? filteredMidwives.map((midwife) => (
                <tr key={midwife.id} className="hover:bg-emerald-50/20 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-gray-800 text-sm">{midwife.fullName}</div>
                    <div className="text-[10px] text-gray-400 font-mono font-bold">
                      {midwife.employeeId ? `ID: ${midwife.employeeId}` : ''} {midwife.nic ? `| NIC: ${midwife.nic}` : ''}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-700">{midwife.phone || '—'}</div>
                    <div className="text-[10px] text-blue-500 font-mono">{midwife.email}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block border border-emerald-100">
                      {midwife.serviceArea || 'General'}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-black">{midwife.motherCount}</span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${midwife.highRiskCount > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
                      {midwife.highRiskCount}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => setSelectedMidwife(midwife)}
                        title="විස්තර බලන්න"
                        className="p-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(midwife.id)}
                        title="ඉවත් කරන්න"
                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="6" className="p-16 text-center text-gray-400 italic">
                    {mohArea} ප්‍රදේශයේ කිසිදු නිලධාරිනියකගේ දත්ත හමු නොවීය.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </MOHLayout>
  );
};

export default ManageMidwives;