import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import AdminLayout from '../../components/AdminLayout';
import { DISTRICTS, getMohAreas, findDistrictByMohArea } from '../../data/sriLankaLocations';

const ManageMidwives = () => {
  const [midwives, setMidwives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedMohArea, setSelectedMohArea] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [viewingMidwife, setViewingMidwife] = useState(null);

  const fetchMidwives = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "midwives"));
      const midwifeList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMidwives(midwifeList);
    } catch (error) {
      console.error("Error fetching midwives: ", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMidwives();
  }, []);

  const handleDistrictChange = (e) => {
    setSelectedDistrict(e.target.value);
    setSelectedMohArea('All');
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, "midwives", showDeleteModal));
        await deleteDoc(doc(db, "users", showDeleteModal));
        setMessage("පවුල් සෞඛ්‍ය නිලධාරිනිය පද්ධතියෙන් ඉවත් කරන ලදී. (Midwife Removed)");
        setShowDeleteModal(null);
        if (viewingMidwife && viewingMidwife.id === showDeleteModal) {
          setViewingMidwife(null);
        }
        fetchMidwives();
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage("දෝෂයක් සිදු විය: " + error.message);
      }
    }
  };

  const availableMohAreas = selectedDistrict !== 'All' ? getMohAreas(selectedDistrict) : [];

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
      if (!name.includes(term) && !nic.includes(term) && !area.includes(term) && !email.includes(term) && !empId.includes(term)) {
        return false;
      }
    }
    return true;
  });

  return (
    <AdminLayout>
      {/* Full Midwife Profile Dossier Modal */}
      {viewingMidwife && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 text-white relative">
              <button 
                onClick={() => setViewingMidwife(null)}
                className="absolute top-5 right-5 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl shadow-inner">
                  👩‍⚕️
                </div>
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-black uppercase tracking-wider mb-1 border border-blue-400/30">
                    Public Health Midwife (PHM)
                  </span>
                  <h3 className="text-2xl font-bold tracking-tight">{viewingMidwife.fullName}</h3>
                  <p className="text-xs text-blue-100 font-mono">ID: {viewingMidwife.employeeId || '—'} | NIC: {viewingMidwife.nic || '—'}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-gray-50 p-4 rounded-2xl space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-400 font-bold block">ජාතික හැඳුනුම්පත (NIC):</span>
                    <span className="font-bold text-gray-800 font-mono">{viewingMidwife.nic || 'නොදක්වා ඇත'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">සේවක අංකය (Employee ID):</span>
                    <span className="font-bold text-gray-800 font-mono">{viewingMidwife.employeeId || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">දුරකථන අංකය:</span>
                    <a href={`tel:${viewingMidwife.phone}`} className="font-bold text-blue-600 hover:underline">{viewingMidwife.phone || '—'}</a>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">ඊමේල් ලිපිනය:</span>
                    <a href={`mailto:${viewingMidwife.email}`} className="font-semibold text-blue-600 hover:underline">{viewingMidwife.email || '—'}</a>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">MOH ප්‍රදේශය:</span>
                    <span className="font-bold text-blue-700">{viewingMidwife.mohArea || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">PHM සේවා ප්‍රදේශය:</span>
                    <span className="font-bold text-indigo-700">{viewingMidwife.serviceArea || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-400 font-bold block">ග්‍රාම නිලධාරී වසම් (GN Divisions):</span>
                    <span className="font-semibold text-gray-700">{viewingMidwife.gnDivisions || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <span>ℹ️</span>
                <span>පවුල් සෞඛ්‍ය නිලධාරිනියන් (PHM) ලියාපදිංචි කිරීම සහ සංස්කරණය අදාළ MOH කාර්යාලය මඟින් සිදු කෙරේ. Super Admin හට දත්ත පරීක්ෂා කිරීම හා අවශ්‍ය විට පද්ධතියෙන් ඉවත් කිරීම (Delete) සිදු කළ හැක.</span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={() => {
                  const idToDelete = viewingMidwife.id;
                  setViewingMidwife(null);
                  setShowDeleteModal(idToDelete);
                }}
                className="px-4 py-2 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                නිලධාරිනිය ඉවත් කරන්න (Delete)
              </button>
              <button 
                onClick={() => setViewingMidwife(null)}
                className="px-5 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                වසන්න (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center animate-in zoom-in-95 duration-200">
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
      )}

      {/* Toast Notification */}
      {message && (
        <div className="fixed top-5 right-5 z-[130] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border-l-4 border-blue-500 flex items-center space-x-4 animate-in slide-in-from-right duration-500">
          <p className="text-sm font-bold tracking-tight">{message}</p>
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl shadow-md border border-gray-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">පවුල් සෞඛ්‍ය සේවා නිලධාරීන් කළමනාකරණය</h1>
            <div className="text-[11px] font-black text-blue-600 uppercase tracking-widest mt-0.5">
              Public Health Midwives (PHM) Oversight & Directory
            </div>
          </div>
          <div>
            <span className="bg-blue-50 text-blue-800 text-xs font-bold px-3.5 py-1.5 rounded-full border border-blue-200">
              පෙරූ ප්‍රතිඵල: {filteredMidwives.length} / {midwives.length}
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          {/* Search */}
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">සොයන්න (Search Name/NIC/ID/Area)</label>
            <input
              type="text"
              placeholder="නම, NIC, සේවක අංකය..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Filter District */}
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">දිස්ත්‍රික්කය (District)</label>
            <select
              value={selectedDistrict}
              onChange={handleDistrictChange}
              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="All">සියලුම දිස්ත්‍රික්ක (All)</option>
              {DISTRICTS.map(dist => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>

          {/* Filter MOH Area */}
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">MOH ප්‍රදේශය (MOH Area)</label>
            <select
              value={selectedMohArea}
              onChange={(e) => setSelectedMohArea(e.target.value)}
              disabled={selectedDistrict === 'All'}
              className={`w-full p-2.5 border rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none ${
                selectedDistrict === 'All' ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white border-gray-200'
              }`}
            >
              <option value="All">
                {selectedDistrict === 'All' ? "සියලුම MOH ප්‍රදේශ" : "සියලුම MOH ප්‍රදේශ (" + selectedDistrict + ")"}
              </option>
              {availableMohAreas.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>
        </div>
        
        {loading ? (
          <p className="text-center py-10 text-blue-600 font-semibold animate-pulse">දත්ත ලබාගනිමින් පවතී... (Fetching Data...)</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-[11px] font-black">
                  <th className="px-4 py-4 text-left">නම සහ සේවක අංකය (Name & ID)</th>
                  <th className="px-4 py-4 text-left">දිස්ත්‍රික්කය</th>
                  <th className="px-4 py-4 text-left">MOH ප්‍රදේශය</th>
                  <th className="px-4 py-4 text-left">සේවා ප්‍රදේශය (PHM Area)</th>
                  <th className="px-4 py-4 text-left">සම්බන්ධීකරණය</th>
                  <th className="px-4 py-4 text-center">ක්‍රියාකාරකම් (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredMidwives.length > 0 ? filteredMidwives.map((midwife) => {
                  const displayDistrict = midwife.district || findDistrictByMohArea(midwife.mohArea) || '—';
                  return (
                    <tr key={midwife.id} className="hover:bg-blue-50/20 transition duration-150">
                      <td className="px-4 py-4 font-semibold text-gray-800">
                        <div className="font-bold text-gray-800 text-sm">{midwife.fullName}</div>
                        <div className="text-[10px] text-gray-400 font-bold font-mono">
                          {midwife.employeeId ? `ID: ${midwife.employeeId}` : ''} {midwife.nic ? `| NIC: ${midwife.nic}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-bold text-gray-700">{displayDistrict}</td>
                      <td className="px-4 py-4 font-semibold text-blue-600">{midwife.mohArea}</td>
                      <td className="px-4 py-4 font-medium text-gray-800">
                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100 inline-block">
                          {midwife.serviceArea}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-600">
                        <div className="font-bold text-gray-700">{midwife.phone || '—'}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{midwife.email}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => setViewingMidwife(midwife)}
                            title="සම්පූර්ණ තොරතුරු බලන්න (View Profile Dossier)"
                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>

                          {/* Delete */}
                          <button 
                            onClick={() => setShowDeleteModal(midwife.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            title="ඉවත් කරන්න (Delete Midwife)"
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
                    <td colSpan="6" className="px-4 py-16 text-center text-gray-400 italic">
                      <div>කිසිදු නිලධාරිනියකගේ දත්ත හමු නොවීය.</div>
                      <div className="text-xs uppercase font-black tracking-widest mt-1">No midwives matching criteria found.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManageMidwives;