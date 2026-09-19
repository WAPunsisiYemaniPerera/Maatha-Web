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
        setMessage("නිලධාරිනිය සාර්ථකව ඉවත් කරන ලදී. (Midwife Removed)");
        setShowDeleteModal(null);
        fetchMidwives();
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage("දෝෂයක් සිදු විය: " + error.message);
      }
    }
  };

  const availableMohAreas = selectedDistrict !== 'All' ? getMohAreas(selectedDistrict) : [];

  const filteredMidwives = midwives.filter(m => {
    // District filter
    const midwifeDistrict = m.district || findDistrictByMohArea(m.mohArea);
    if (selectedDistrict !== 'All' && midwifeDistrict !== selectedDistrict) {
      return false;
    }
    // MOH Area filter
    if (selectedMohArea !== 'All' && m.mohArea !== selectedMohArea) {
      return false;
    }
    // Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const name = (m.fullName || '').toLowerCase();
      const area = (m.serviceArea || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      const empId = (m.employeeId || '').toLowerCase();
      if (!name.includes(term) && !area.includes(term) && !email.includes(term) && !empId.includes(term)) {
        return false;
      }
    }
    return true;
  });

  return (
    <AdminLayout>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center">
              <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">නිලධාරිනිය ඉවත් කරන්නද?</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Are you sure you want to remove this midwife?</p>
              <div className="flex space-x-3">
                <button onClick={() => setShowDeleteModal(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs uppercase">නැත (No)</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs uppercase shadow-lg shadow-red-200">ඔව් (Yes)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {message && (
        <div className="fixed top-5 right-5 z-[110] bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl border-l-4 border-blue-500 flex items-center space-x-4 animate-in slide-in-from-right duration-500">
          <p className="text-sm font-bold tracking-tight">{message}</p>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-slate-700 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">පවුල් සෞඛ්‍ය සේවා නිලධාරීන් කළමනාකරණය</h2>
            <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Public Health Midwives (PHM) Management</div>
          </div>
          <div>
            <span className="bg-blue-50 text-blue-800 text-xs font-bold px-3.5 py-1.5 rounded-full border border-blue-200">
              පෙරූ ප්‍රතිඵල: {filteredMidwives.length} / {midwives.length}
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          {/* Search */}
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">සොයන්න (Search)</label>
            <input
              type="text"
              placeholder="නම, සේවක අංකය, ප්‍රදේශය..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Filter District */}
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">දිස්ත්‍රික්කය (District)</label>
            <select
              value={selectedDistrict}
              onChange={handleDistrictChange}
              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
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
              className={`w-full p-2 border rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none ${
                selectedDistrict === 'All' ? 'bg-gray-100 text-gray-400' : 'bg-white border-gray-200'
              }`}
            >
              <option value="All">
                {selectedDistrict === 'All' ? "සියලුම MOH ප්‍රදේශ" : "සියලුම MOH ප්‍රදේශ (All in " + selectedDistrict + ")"}
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
              <thead className="bg-gray-100">
                <tr className="text-gray-700 uppercase tracking-wider text-xs">
                  <th className="px-4 py-3 text-left">නම සහ සේවක අංකය (Name & ID)</th>
                  <th className="px-4 py-3 text-left">දිස්ත්‍රික්කය (District)</th>
                  <th className="px-4 py-3 text-left">MOH ප්‍රදේශය (MOH Area)</th>
                  <th className="px-4 py-3 text-left">සේවා ප්‍රදේශය (PHM Area)</th>
                  <th className="px-4 py-3 text-left">ඊමේල් / දුරකථන</th>
                  <th className="px-4 py-3 text-center">ක්‍රියාකාරකම් (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredMidwives.length > 0 ? filteredMidwives.map((midwife) => {
                  const displayDistrict = midwife.district || findDistrictByMohArea(midwife.mohArea) || '—';
                  return (
                    <tr key={midwife.id} className="hover:bg-gray-50 transition duration-150">
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        <div>{midwife.fullName}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">{midwife.employeeId || 'ID: —'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{displayDistrict}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-blue-600">{midwife.mohArea}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-800 bg-blue-50/50 rounded-md">
                        {midwife.serviceArea}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <div>{midwife.phone || '—'}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{midwife.email}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center space-x-2">
                          <button 
                            onClick={() => setShowDeleteModal(midwife.id)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all text-xs font-bold"
                            title="ඉවත් කරන්න (Delete)"
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