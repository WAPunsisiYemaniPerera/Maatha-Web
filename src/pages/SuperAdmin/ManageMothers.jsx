import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import AdminLayout from '../../components/AdminLayout';
import { DISTRICTS, getMohAreas, findDistrictByMohArea } from '../../data/sriLankaLocations';

const ManageMothers = () => {
  const [mothers, setMothers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedMohArea, setSelectedMohArea] = useState('All');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [viewingMother, setViewingMother] = useState(null);

  const fetchMothers = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "mothers"));
      const mothersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMothers(mothersList);
    } catch (error) {
      console.error("Error fetching mothers: ", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMothers();
  }, []);

  const handleDistrictChange = (e) => {
    setSelectedDistrict(e.target.value);
    setSelectedMohArea('All');
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, "mothers", showDeleteModal));
        setMessage("මවගේ දත්ත සාර්ථකව පද්ධතියෙන් ඉවත් කරන ලදී. (Mother Record Deleted)");
        setShowDeleteModal(null);
        if (viewingMother && viewingMother.id === showDeleteModal) {
          setViewingMother(null);
        }
        fetchMothers();
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage("දෝෂයක් සිදු විය: " + error.message);
      }
    }
  };

  const availableMohAreas = selectedDistrict !== 'All' ? getMohAreas(selectedDistrict) : [];

  const filteredMothers = mothers.filter(m => {
    const motherDistrict = m.district || findDistrictByMohArea(m.mohArea);
    if (selectedDistrict !== 'All' && motherDistrict !== selectedDistrict) {
      return false;
    }
    if (selectedMohArea !== 'All' && m.mohArea !== selectedMohArea) {
      return false;
    }
    if (selectedRisk !== 'All' && m.riskStatus !== selectedRisk) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const name = (m.fullName || '').toLowerCase();
      const nic = (m.nic || '').toLowerCase();
      const phone = (m.phone || '').toLowerCase();
      if (!name.includes(term) && !nic.includes(term) && !phone.includes(term)) {
        return false;
      }
    }
    return true;
  });

  return (
    <AdminLayout>
      {/* View Full Mother Antenatal Dossier Modal */}
      {viewingMother && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className={`p-6 text-white relative ${
              viewingMother.riskStatus === 'High-Risk' 
                ? 'bg-gradient-to-r from-red-700 via-rose-700 to-slate-900' 
                : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900'
            }`}>
              <button 
                onClick={() => setViewingMother(null)}
                className="absolute top-5 right-5 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl shadow-inner">
                  🤰
                </div>
                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider mb-1">
                    {viewingMother.riskStatus === 'High-Risk' ? '🚨 High-Risk Maternal Alert' : '✅ Normal Pregnancy'}
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">{viewingMother.fullName}</h3>
                  <p className="text-xs opacity-90 font-mono">NIC: {viewingMother.nic || 'නොදක්වා ඇත'} | Age: {viewingMother.age || '—'} Yrs</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Timeline & Stats */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">ගර්භනී සති</span>
                  <span className="text-sm font-black text-slate-800 mt-1 block">
                    {viewingMother.gestationalAge || viewingMother.weeks || '—'} සති (Wks)
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">ප්‍රසූති දිනය (EDD)</span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block font-mono">{viewingMother.edd || 'නොදක්වා ඇත'}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">රුධිර ගණය</span>
                  <span className="text-sm font-black text-red-600 mt-1 block font-mono">{viewingMother.bloodGroup || '—'}</span>
                </div>
              </div>

              {/* Regional Jurisdiction */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  පරිපාලන බලප්‍රදේශය සහ සෞඛ්‍ය නිලධාරිනිය (Jurisdiction & PHM Staff)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 font-bold block">දිස්ත්‍රික්කය (District):</span>
                    <span className="font-bold text-gray-800">{viewingMother.district || findDistrictByMohArea(viewingMother.mohArea) || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">MOH ප්‍රදේශය (MOH Area):</span>
                    <span className="font-bold text-blue-600">{viewingMother.mohArea || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">PHM සේවා කලාපය (PHM Area):</span>
                    <span className="font-semibold text-gray-700">{viewingMother.serviceArea || viewingMother.phmArea || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">භාරයේ සිටින PHM නිලධාරිනිය:</span>
                    <span className="font-semibold text-gray-700">{viewingMother.midwifeName || 'නොපවරා ඇත'}</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  සම්බන්ධීකරණ තොරතුරු (Contact Information)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 font-bold block">මවගේ දුරකථන අංකය:</span>
                    <a href={`tel:${viewingMother.phone}`} className="font-bold text-blue-600 hover:underline">{viewingMother.phone || '—'}</a>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">හදිසි ඇමතුම් අංකය:</span>
                    <span className="font-semibold text-gray-700">{viewingMother.emergencyPhone || viewingMother.husbandPhone || '—'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-400 font-bold block">නිවසේ ලිපිනය (Address):</span>
                    <span className="font-semibold text-gray-700">{viewingMother.address || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <span>ℹ️</span>
                <span>මව්වරුන් ලියාපදිංචි කිරීම සහ සංස්කරණය කලාපීය MOH කාර්යාල හා PHM නිලධාරිනියන් මඟින් සිදු කෙරේ. Super Admin හට වාර්තා පරීක්ෂා කිරීම හා අවශ්‍ය විට ඉවත් කිරීම (Delete) කළ හැක.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <button
                onClick={() => {
                  const idToDelete = viewingMother.id;
                  setViewingMother(null);
                  setShowDeleteModal(idToDelete);
                }}
                className="px-4 py-2 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                මවගේ දත්ත ඉවත් කරන්න (Delete Record)
              </button>
              <button 
                onClick={() => setViewingMother(null)}
                className="px-5 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl"
              >
                වසන්න (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center animate-in zoom-in-95 duration-200">
            <div className="bg-red-100 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-inner">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800">මවගේ දත්ත ඉවත් කරන්නද?</h3>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-1 mb-6">Are you sure you want to remove this mother record?</p>
            <div className="flex space-x-3">
              <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase transition-all">නැත (No)</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-red-200 transition-all">ඔව් (Yes)</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {message && (
        <div className="fixed top-5 right-5 z-[130] bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl border-l-4 border-blue-500 flex items-center space-x-4 animate-in slide-in-from-right duration-500">
          <p className="text-sm font-bold tracking-tight">{message}</p>
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl shadow-md border border-gray-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">ලියාපදිංචි මව්වරුන් කළමනාකරණය</h1>
            <div className="text-[11px] font-black text-blue-600 uppercase tracking-widest mt-0.5">
              Nationwide Maternal Health Records & Oversight
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="bg-blue-50 text-blue-800 text-xs font-bold px-3.5 py-1.5 rounded-full border border-blue-200">
              පෙරූ ප්‍රතිඵල: {filteredMothers.length} / {mothers.length}
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          {/* Search by Name or NIC */}
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">සොයන්න (Search Name/NIC/Phone)</label>
            <input
              type="text"
              placeholder="නම, NIC හෝ දුරකථන..."
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

          {/* Filter Risk Status */}
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">අවදානම් තත්ත්වය (Risk Status)</label>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="All">සියලුම තත්ත්ව (All)</option>
              <option value="High-Risk">🚨 අධි අවදානම් (High-Risk)</option>
              <option value="Normal">✅ සාමාන්‍ය (Normal)</option>
            </select>
          </div>
        </div>
        
        {loading ? (
          <p className="text-center py-10 text-blue-600 animate-pulse font-medium italic">
            මව්වරුන්ගේ දත්ත පද්ධතියෙන් ලබාගනිමින් පවතී... (Fetching Data...)
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-gray-500 text-left text-[11px] font-black uppercase tracking-wider">
                  <th className="py-4 px-4">මවගේ නම සහ NIC</th>
                  <th className="py-4 px-4 text-center">අවදානම් තත්ත්වය</th>
                  <th className="py-4 px-4">දිස්ත්‍රික්කය</th>
                  <th className="py-4 px-4">MOH ප්‍රදේශය</th>
                  <th className="py-4 px-4">PHM කලාපය</th>
                  <th className="py-4 px-4 text-center">ක්‍රියාකාරකම් (Actions)</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-xs divide-y divide-gray-100">
                {filteredMothers.length > 0 ? filteredMothers.map((mother) => {
                  const displayDistrict = mother.district || findDistrictByMohArea(mother.mohArea) || '—';
                  return (
                    <tr key={mother.id} className="hover:bg-blue-50/20 transition duration-150">
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-gray-800 text-sm">{mother.fullName}</div>
                        <div className="text-[10px] text-gray-400 font-mono font-bold">NIC: {mother.nic || 'නැත'}</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          mother.riskStatus === 'High-Risk' 
                          ? 'bg-red-100 text-red-600 border border-red-200' 
                          : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {mother.riskStatus === 'High-Risk' ? '🚨 High-Risk' : '✅ Normal'}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-bold text-gray-700">
                        {displayDistrict}
                      </td>
                      <td className="py-4 px-4 font-semibold text-blue-600">
                        {mother.mohArea || "—"}
                      </td>
                      <td className="py-4 px-4 text-gray-500">
                        {mother.serviceArea || mother.phmArea || "—"}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* View Details */}
                          <button
                            onClick={() => setViewingMother(mother)}
                            title="සම්පූර්ණ තොරතුරු බලන්න (View Antenatal Dossier)"
                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>

                          {/* Delete */}
                          <button 
                            onClick={() => setShowDeleteModal(mother.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            title="ඉවත් කරන්න (Delete Mother Record)"
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
                    <td colSpan="6" className="py-16 text-center text-gray-400 italic">
                      <div>කිසිදු මවකගේ දත්ත හමු නොවීය.</div>
                      <div className="text-[11px] font-black uppercase tracking-widest mt-1">No mothers matching criteria found.</div>
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

export default ManageMothers;