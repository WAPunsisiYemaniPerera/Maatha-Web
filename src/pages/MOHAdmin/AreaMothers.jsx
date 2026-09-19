import React, { useEffect, useState } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import MOHLayout from '../../components/MOHLayout';
import { DISTRICTS, getMohAreas, findDistrictByMohArea } from '../../data/sriLankaLocations';

const AreaMothers = () => {
  const [mothers, setMothers] = useState([]);
  const [filteredMothers, setFilteredMothers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState('Colombo');
  const [mohArea, setMohArea] = useState('Colombo');
  const [filter, setFilter] = useState({ risk: 'All', midwife: 'All', search: '' });

  // Load logged-in admin profile
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
          console.error("Error fetching admin area:", err);
        }
      }
    };
    fetchAdminProfile();
  }, []);

  useEffect(() => {
    const fetchMothers = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "mothers"), where("mohArea", "==", mohArea));
        const querySnapshot = await getDocs(q);
        const mothersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setMothers(mothersList);
        setFilteredMothers(mothersList);
      } catch (error) {
        console.error("Error fetching mothers:", error);
      }
      setLoading(false);
    };
    fetchMothers();
  }, [mohArea]);

  useEffect(() => {
    let result = mothers;
    if (filter.risk !== 'All') {
      result = result.filter(m => m.riskStatus === filter.risk);
    }
    if (filter.midwife !== 'All') {
      result = result.filter(m => (m.midwifeName === filter.midwife || m.serviceArea === filter.midwife));
    }
    if (filter.search.trim()) {
      const term = filter.search.toLowerCase();
      result = result.filter(m => 
        (m.fullName || '').toLowerCase().includes(term) ||
        (m.nic || '').toLowerCase().includes(term)
      );
    }
    setFilteredMothers(result);
  }, [filter, mothers]);

  const handleDistrictChange = (e) => {
    const newDistrict = e.target.value;
    setDistrict(newDistrict);
    const mohs = getMohAreas(newDistrict);
    if (mohs.length > 0) {
      setMohArea(mohs[0]);
    }
  };

  const highRiskCount = mothers.filter(m => m.riskStatus === 'High-Risk').length;
  const availableMohAreas = getMohAreas(district);
  const uniqueMidwives = Array.from(new Set(mothers.map(m => m.midwifeName).filter(Boolean)));

  return (
    <MOHLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">ප්‍රදේශයේ මව්වරුන්ගේ දත්ත</h2>
          <div className="text-[11px] font-black text-green-600 uppercase tracking-widest mt-1">
            Comprehensive Maternal Health Tracking - {mohArea} ({district})
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* District & MOH Area Selectors */}
          <select
            value={district}
            onChange={handleDistrictChange}
            className="p-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-green-500 outline-none shadow-sm"
          >
            {DISTRICTS.map(dist => (
              <option key={dist} value={dist}>{dist}</option>
            ))}
          </select>

          <select
            value={mohArea}
            onChange={(e) => setMohArea(e.target.value)}
            className="p-2 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-bold focus:ring-2 focus:ring-green-500 outline-none shadow-sm"
          >
            {availableMohAreas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>

          <SummaryMiniCard label="මුළු මව්වරුන්" count={mothers.length} color="text-blue-600" />
          <SummaryMiniCard label="අධි-අවදානම්" count={highRiskCount} color="text-red-600" />
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center border border-gray-100">
        {/* Search */}
        <div>
          <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">සොයන්න (Search Name / NIC):</span>
          <input
            type="text"
            placeholder="නම හෝ NIC..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="w-full text-xs font-medium p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>

        {/* Risk Filter */}
        <div>
          <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">පෙරීම (Filter by Risk):</span>
          <select 
            className="w-full text-xs font-bold p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            value={filter.risk}
            onChange={(e) => setFilter({ ...filter, risk: e.target.value })}
          >
            <option value="All">සියලුම දෙනා (All)</option>
            <option value="High-Risk">අධි-අවදානම් (High-Risk)</option>
            <option value="Normal">සාමාන්‍ය (Normal)</option>
          </select>
        </div>
        
        {/* Midwife Filter */}
        <div>
          <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">නිලධාරිනිය (By Midwife):</span>
          <select 
            className="w-full text-xs font-bold p-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            value={filter.midwife}
            onChange={(e) => setFilter({ ...filter, midwife: e.target.value })}
          >
            <option value="All">සියලුම නිලධාරිනියන් (All Midwives)</option>
            {uniqueMidwives.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center italic text-gray-400">දත්ත ලබාගනිමින් පවතී...</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="p-5">මවගේ විස්තර (Mother's Details)</th>
                <th className="p-5">තත්ත්වය (Status)</th>
                <th className="p-5">අදාළ නිලධාරිනිය (Midwife)</th>
                <th className="p-5">සේවා ප්‍රදේශය (PHM Area)</th>
                <th className="p-5">දිස්ත්‍රික්කය (District)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredMothers.map((mother) => (
                <tr key={mother.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-5">
                    <div className="font-bold text-gray-800 text-sm">{mother.fullName}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">NIC: {mother.nic || 'N/A'}</div>
                  </td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      mother.riskStatus === 'High-Risk' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {mother.riskStatus === 'High-Risk' ? 'High-Risk' : 'Normal'}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="text-xs font-bold text-gray-700">{mother.midwifeName || 'Not Assigned'}</div>
                  </td>
                  <td className="p-5">
                    <div className="text-xs font-medium text-gray-600 bg-green-50/50 px-2.5 py-1 rounded-md inline-block">
                      {mother.serviceArea || mother.phmArea || '—'}
                    </div>
                  </td>
                  <td className="p-5 text-xs font-medium text-gray-500">
                    {mother.district || district}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMothers.length === 0 && (
            <div className="p-10 text-center text-gray-400 italic text-sm">
              {mohArea} ප්‍රදේශය සඳහා හමු වූ දත්ත කිසිවක් නැත. (No records found)
            </div>
          )}
        </div>
      )}
    </MOHLayout>
  );
};

const SummaryMiniCard = ({ label, count, color }) => (
  <div className="bg-white px-5 py-2 rounded-xl shadow-sm border border-gray-100 text-center">
    <div className="text-[9px] font-black text-gray-400 uppercase">{label}</div>
    <div className={`text-xl font-black ${color}`}>{count}</div>
  </div>
);

export default AreaMothers;