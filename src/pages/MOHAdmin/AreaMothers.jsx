import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import MOHLayout from '../../components/MOHLayout';

const AreaMothers = () => {
  const [mothers, setMothers] = useState([]);
  const [filteredMothers, setFilteredMothers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ risk: 'All', midwife: 'All' });
  
  const mohArea = "Colombo"; // පසුව Auth හරහා ලබාගත හැක

  useEffect(() => {
    const fetchMothers = async () => {
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

  // දත්ත පෙරීම (Filtering Logic)
  useEffect(() => {
    let result = mothers;
    if (filter.risk !== 'All') {
      result = result.filter(m => m.riskStatus === filter.risk);
    }
    if (filter.midwife !== 'All') {
      result = result.filter(m => m.midwifeName === filter.midwife);
    }
    setFilteredMothers(result);
  }, [filter, mothers]);

  const highRiskCount = mothers.filter(m => m.riskStatus === 'High-Risk').length;

  return (
    <MOHLayout>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">ප්‍රදේශයේ මව්වරුන්ගේ දත්ත</h2>
          <div className="text-[11px] font-black text-green-600 uppercase tracking-widest mt-1">
            Comprehensive Maternal Health Tracking - {mohArea}
          </div>
        </div>
        <div className="flex space-x-4">
          <SummaryMiniCard label="මුළු මව්වරුන්" count={mothers.length} color="text-blue-600" />
          <SummaryMiniCard label="අධි-අවදානම්" count={highRiskCount} color="text-red-600" />
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 flex flex-wrap gap-4 items-center border border-gray-100">
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-black text-gray-400 uppercase">පෙරීම (Filter by Risk):</span>
          <select 
            className="text-xs font-bold p-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-green-500"
            onChange={(e) => setFilter({ ...filter, risk: e.target.value })}
          >
            <option value="All">සියලුම දෙනා (All)</option>
            <option value="High-Risk">අධි-අවදානම් (High-Risk)</option>
            <option value="Normal">සාමාන්‍ය (Normal)</option>
          </select>
        </div>
        
        {/* Midwife Filter - මෙහිදී Midwives ලැයිස්තුව Dynamic ලෙස ගත හැක */}
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-black text-gray-400 uppercase">නිලධාරිනිය (By Midwife):</span>
          <select 
            className="text-xs font-bold p-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-green-500"
            onChange={(e) => setFilter({ ...filter, midwife: e.target.value })}
          >
            <option value="All">සියලුම නිලධාරිනියන්</option>
            {/* Array.from(new Set(mothers.map(m => m.midwifeName))).map(...) */}
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
                <th className="p-5">දිස්ත්‍රික්කය (District)</th>
                <th className="p-5 text-right">ක්‍රියා (Actions)</th>
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
                    <div className="text-xs font-bold text-gray-600">{mother.midwifeName || 'Not Assigned'}</div>
                    <div className="text-[10px] text-gray-400">{mother.serviceArea}</div>
                  </td>
                  <td className="p-5 text-xs font-medium text-gray-500">{mother.district}</td>
                  <td className="p-5 text-right">
                    <button className="bg-slate-900 text-white text-[10px] font-black uppercase px-4 py-2 rounded-lg hover:bg-slate-800 transition-all shadow-sm">
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMothers.length === 0 && (
            <div className="p-10 text-center text-gray-400 italic text-sm">හමු වූ දත්ත කිසිවක් නැත. (No records found)</div>
          )}
        </div>
      )}
    </MOHLayout>
  );
};

const SummaryMiniCard = ({ label, count, color }) => (
  <div className="bg-white px-6 py-2 rounded-xl shadow-sm border border-gray-100 text-center">
    <div className="text-[9px] font-black text-gray-400 uppercase">{label}</div>
    <div className={`text-xl font-black ${color}`}>{count}</div>
  </div>
);

export default AreaMothers;