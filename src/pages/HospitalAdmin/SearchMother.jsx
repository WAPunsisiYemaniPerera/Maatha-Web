import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import HospitalLayout from '../../components/HospitalLayout';

const SearchMother = () => {
  const [nic, setNic] = useState('');
  const [motherData, setMotherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMotherData(null);

    try {
      const q = query(collection(db, "mothers"), where("nic", "==", nic));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setMotherData(querySnapshot.docs[0].data());
      } else {
        setError("මෙම හැඳුනුම්පත් අංකයට අදාළ දත්ත පද්ධතියේ හමු නොවීය. (No records found)");
      }
    } catch (err) {
      setError("දත්ත සෙවීමේදී දෝෂයක් සිදු විය. නැවත උත්සාහ කරන්න.");
    }
    setLoading(false);
  };

  return (
    <HospitalLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">මව්වරුන්ගේ දත්ත සෙවීම</h2>
          <div className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mt-1">
            Search Mother's Medical History by NIC
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <input 
                type="text" 
                placeholder="හැඳුනුම්පත් අංකය ඇතුළත් කරන්න (e.g. 199012345678)" 
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm transition-all"
                value={nic}
                onChange={(e) => setNic(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-indigo-600 text-white px-8 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
            >
              {loading ? "සොයමින්..." : "දත්ත ලබාගන්න"}
            </button>
          </form>
          {error && <p className="mt-4 text-red-500 text-xs font-bold italic">{error}</p>}
        </div>

        {/* Profile Result */}
        {motherData && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom duration-500">
            <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black tracking-tighter">{motherData.fullName}</h3>
                <p className="opacity-80 text-xs font-bold uppercase tracking-widest">Maternal Health Profile</p>
              </div>
              <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase ${motherData.riskStatus === 'High-Risk' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                {motherData.riskStatus}
              </div>
            </div>

            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <InfoBlock label="හැඳුනුම්පත් අංකය (NIC)" value={motherData.nic} />
              <InfoBlock label="දුරකථන අංකය (Phone)" value={motherData.phone || "සටහන් කර නැත"} />
              <InfoBlock label="MOH ප්‍රදේශය (MOH Area)" value={motherData.mohArea} />
              <InfoBlock label="වයස (Age)" value={motherData.age + " Years"} />
              <InfoBlock label="පවුල් සෞඛ්‍ය නිලධාරිනිය (Midwife)" value={motherData.midwifeName} />
              <InfoBlock label="දිස්ත්‍රික්කය (District)" value={motherData.district} />
              
              <div className="md:col-span-2 border-t pt-6">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">වෛද්‍යමය සටහන් (Medical Notes)</h4>
                <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-700 leading-relaxed italic">
                  {motherData.medicalNotes || "පෙර වෛද්‍ය සටහන් කිසිවක් ඇතුළත් කර නොමැත."}
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-end space-x-4">
              <button className="text-[10px] font-black uppercase text-gray-500 border border-gray-300 px-6 py-2 rounded-lg hover:bg-white transition-all">
                Print Report
              </button>
              <button className="text-[10px] font-black uppercase bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-all shadow-md">
                Admit Mother to Hospital
              </button>
            </div>
          </div>
        )}
      </div>
    </HospitalLayout>
  );
};

const InfoBlock = ({ label, value }) => (
  <div className="border-b border-gray-50 pb-2">
    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-bold text-gray-800">{value}</p>
  </div>
);

export default SearchMother;