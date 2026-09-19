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
    setSelectedMohArea('All'); // Reset MOH filter when district changes
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, "mothers", showDeleteModal));
        setMessage("මවගේ දත්ත සාර්ථකව ඉවත් කරන ලදී. (Mother Record Deleted)");
        setShowDeleteModal(null);
        fetchMothers();
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage("දෝෂයක් සිදු විය: " + error.message);
      }
    }
  };

  const availableMohAreas = selectedDistrict !== 'All' ? getMohAreas(selectedDistrict) : [];

  const filteredMothers = mothers.filter(m => {
    // District filter
    const motherDistrict = m.district || findDistrictByMohArea(m.mohArea);
    if (selectedDistrict !== 'All' && motherDistrict !== selectedDistrict) {
      return false;
    }
    // MOH Area filter
    if (selectedMohArea !== 'All' && m.mohArea !== selectedMohArea) {
      return false;
    }
    // Risk Status filter
    if (selectedRisk !== 'All' && m.riskStatus !== selectedRisk) {
      return false;
    }
    // Search filter (Name or NIC)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const name = (m.fullName || '').toLowerCase();
      const nic = (m.nic || '').toLowerCase();
      if (!name.includes(term) && !nic.includes(term)) {
        return false;
      }
    }
    return true;
  });

  return (
    <AdminLayout>
      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center">
              <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">මවගේ දත්ත ඉවත් කරන්නද?</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Are you sure you want to remove this mother record?</p>
              <div className="flex space-x-3">
                <button onClick={() => setShowDeleteModal(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs uppercase">නැත (No)</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs uppercase shadow-lg shadow-red-200">ඔව් (Yes)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {message && (
        <div className="fixed top-5 right-5 z-[110] bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl border-l-4 border-blue-500 flex items-center space-x-4 animate-in slide-in-from-right duration-500">
          <p className="text-sm font-bold tracking-tight">{message}</p>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-slate-700 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">ලියාපදිංචි මව්වරුන් කළමනාකරණය</h2>
            <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Registered Mothers Management</div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="bg-blue-50 text-blue-800 text-xs font-bold px-3.5 py-1.5 rounded-full border border-blue-200">
              පෙරූ ප්‍රතිඵල: {filteredMothers.length} / {mothers.length}
            </span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          {/* Search by Name or NIC */}
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">සොයන්න (Search Name/NIC)</label>
            <input
              type="text"
              placeholder="නම හෝ NIC..."
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

          {/* Filter Risk Status */}
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">අවදානම් තත්ත්වය (Risk Status)</label>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="All">සියලුම තත්ත්ව (All)</option>
              <option value="High-Risk">අධි අවදානම් (High-Risk)</option>
              <option value="Normal">සාමාන්‍ය (Normal)</option>
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
                <tr className="bg-gray-100 text-gray-700 text-left text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">මවගේ නම (Name)</th>
                  <th className="py-3 px-4">හැඳුනුම්පත් අංකය (NIC)</th>
                  <th className="py-3 px-4 text-center">අවදානම් තත්ත්වය (Risk)</th>
                  <th className="py-3 px-4">දිස්ත්‍රික්කය (District)</th>
                  <th className="py-3 px-4">MOH ප්‍රදේශය (MOH Area)</th>
                  <th className="py-3 px-4">PHM ප්‍රදේශය (PHM Area)</th>
                  <th className="py-3 px-4 text-center">ක්‍රියාකාරකම් (Actions)</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm divide-y divide-gray-100">
                {filteredMothers.length > 0 ? filteredMothers.map((mother) => {
                  const displayDistrict = mother.district || findDistrictByMohArea(mother.mohArea) || '—';
                  return (
                    <tr key={mother.id} className="hover:bg-gray-50 transition duration-150">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-800">{mother.fullName}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-gray-600">
                        {mother.nic || mother.id}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          mother.riskStatus === 'High-Risk' 
                          ? 'bg-red-100 text-red-600' 
                          : 'bg-green-100 text-green-600'
                        }`}>
                          {mother.riskStatus === 'High-Risk' ? 'High-Risk' : 'Normal'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-gray-700">
                        {displayDistrict}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-blue-600">
                        {mother.mohArea || "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {mother.serviceArea || mother.phmArea || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => setShowDeleteModal(mother.id)}
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
                    <td colSpan="7" className="py-16 text-center text-gray-400 italic">
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