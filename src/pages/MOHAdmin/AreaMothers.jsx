import React, { useEffect, useState } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import MOHLayout from '../../components/MOHLayout';
import ModalPortal from '../../components/ModalPortal';
import { findDistrictByMohArea } from '../../data/sriLankaLocations';
import { formatDisplayDate, safeRenderText } from '../../utils/securityValidators';

const AreaMothers = () => {
  const [mothers, setMothers] = useState([]);
  const [filteredMothers, setFilteredMothers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState('Colombo');
  const [mohArea, setMohArea] = useState('Colombo');
  const [filter, setFilter] = useState({ risk: 'All', midwife: 'All', trimester: 'All', search: '' });
  const [selectedMother, setSelectedMother] = useState(null);

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
        const mothersList = querySnapshot.docs.map(d => {
          const data = d.data();
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
            riskStatus: safeRenderText(data.riskStatus, 'Normal'),
            notes: safeRenderText(data.notes || data.riskNotes, ''),
            edd: formatDisplayDate(data.edd, 'නොදක්වා ඇත'),
            gestationalAge: safeRenderText(data.gestationalAge || data.weeks, ''),
            age: safeRenderText(data.age, '')
          };
        });
        
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
    if (filter.trimester !== 'All') {
      result = result.filter(m => {
        const weeks = Number(m.gestationalAge || m.weeks || 0);
        if (filter.trimester === 'T1') return weeks > 0 && weeks <= 12;
        if (filter.trimester === 'T2') return weeks > 12 && weeks <= 27;
        if (filter.trimester === 'T3') return weeks > 27;
        return true;
      });
    }
    if (filter.search.trim()) {
      const term = filter.search.toLowerCase();
      result = result.filter(m => 
        (m.fullName || '').toLowerCase().includes(term) ||
        (m.nic || '').toLowerCase().includes(term) ||
        (m.phone || '').toLowerCase().includes(term) ||
        (m.serviceArea || '').toLowerCase().includes(term)
      );
    }
    setFilteredMothers(result);
  }, [filter, mothers]);

  const highRiskCount = mothers.filter(m => m.riskStatus === 'High-Risk').length;
  const uniqueMidwives = Array.from(new Set(mothers.map(m => m.midwifeName).filter(Boolean)));

  return (
    <MOHLayout>
      {/* Mother Antenatal Dossier Modal */}
      {selectedMother && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-blue-950/70 backdrop-blur-md p-3 sm:p-6 flex min-h-screen items-center justify-center animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setSelectedMother(null)} aria-hidden="true" />
            <div className="relative bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[88vh] z-10 my-auto animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className={`p-6 text-white relative shrink-0 ${
                selectedMother.riskStatus === 'High-Risk' 
                  ? 'bg-gradient-to-r from-red-700 via-rose-700 to-pink-800' 
                  : 'bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800'
              }`}>
                <button 
                  onClick={() => setSelectedMother(null)}
                  className="absolute top-5 right-5 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-all"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl shadow-inner shrink-0">
                    🤰
                  </div>
                  <div className="pr-6">
                    <div className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider mb-1 border border-white/20">
                      {selectedMother.riskStatus === 'High-Risk' ? '🚨 High-Risk Maternal Alert' : '✅ Normal Pregnancy'}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight">{selectedMother.fullName}</h3>
                    <p className="text-xs opacity-90 font-mono">NIC: {selectedMother.nic || 'නොදක්වා ඇත'} | Age: {selectedMother.age || '—'} Yrs</p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                {/* Pregnancy Timeline & Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">ගර්භනී කාලය</span>
                    <span className="text-sm font-black text-slate-800 mt-1 block">
                      {selectedMother.gestationalAge || selectedMother.weeks || '—'} සති (Wks)
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">ප්‍රසූති දිනය (EDD)</span>
                    <span className="text-xs font-bold text-slate-800 mt-1 block font-mono">{selectedMother.edd || 'නොදක්වා ඇත'}</span>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">රුධිර ගණය (Blood)</span>
                    <span className="text-sm font-black text-red-600 mt-1 block font-mono">{selectedMother.bloodGroup || '—'}</span>
                  </div>
                </div>

                {/* Clinical Details */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                  <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    සායනික සහ අවදානම් තොරතුරු (Clinical & Risk Assessment)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 font-bold block">අවදානම් සාධක (Risk Details):</span>
                      <span className={`font-bold ${selectedMother.riskStatus === 'High-Risk' ? 'text-red-600' : 'text-gray-700'}`}>
                        {selectedMother.riskNotes || selectedMother.riskReason || (selectedMother.riskStatus === 'High-Risk' ? 'Medical Monitoring Advised' : 'සාමාන්‍ය තත්ත්වයේ පවතී')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block">පෙර දරු උපත් (Gravida / Parity):</span>
                      <span className="font-semibold text-gray-700">{selectedMother.gravida ? `G${selectedMother.gravida} P${selectedMother.parity || 0}` : '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Contact & Field Staff */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                  <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    සම්බන්ධීකරණය සහ PHM වින්නඹු නිලධාරිනිය
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-400 font-bold block">මවගේ දුරකථන අංකය:</span>
                      <a href={`tel:${selectedMother.phone}`} className="font-bold text-blue-600 hover:underline">{selectedMother.phone || '—'}</a>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block">හදිසි ඇමතුම් අංකය (Emergency Contact):</span>
                      <span className="font-semibold text-gray-700">{selectedMother.emergencyPhone || selectedMother.husbandPhone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block">අදාළ PHM නිලධාරිනිය (Midwife):</span>
                      <span className="font-bold text-emerald-700">{selectedMother.midwifeName || 'නොපවරා ඇත'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold block">සේවා කලාපය (PHM Area):</span>
                      <span className="font-semibold text-gray-700">{selectedMother.serviceArea || selectedMother.phmArea || '—'}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray-400 font-bold block">ලිපිනය (Home Address):</span>
                      <span className="font-semibold text-gray-700">{selectedMother.address || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
                <span className="text-[11px] text-gray-400 font-medium">MOH Area: {selectedMother.mohArea}</span>
                <button 
                  onClick={() => setSelectedMother(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  වසන්න (Close)
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Header & Locked Jurisdiction Badge */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">ප්‍රදේශයේ මව්වරුන්ගේ දත්ත පද්ධතිය</h1>
          <div className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mt-1">
            MOH Area Maternal Health Registry — {mohArea} ({district})
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

      {/* 4 Real-time KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
            🤰
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{mothers.length}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">මුළු ලියාපදිංචි මව්වරුන්</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-red-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
            🚨
          </div>
          <div>
            <div className="text-2xl font-black text-red-600">{highRiskCount}</div>
            <div className="text-[11px] font-bold text-red-500 uppercase tracking-wider">අධි-අවදානම් අවස්ථා ({mothers.length > 0 ? Math.round((highRiskCount / mothers.length) * 100) : 0}%)</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
            ✅
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{mothers.length - highRiskCount}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">සාමාන්‍ය සෞඛ්‍ය තත්ත්වය</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
            👩‍⚕️
          </div>
          <div>
            <div className="text-2xl font-black text-slate-800">{uniqueMidwives.length}</div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ක්ෂේත්‍ර PHM නිලධාරිනියන්</div>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center border border-slate-100">
        {/* Search */}
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">සොයන්න (Search):</span>
          <div className="relative">
            <input
              type="text"
              placeholder="නම, NIC, දුරකථන හෝ වසම..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="w-full text-xs font-medium pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
        </div>

        {/* Risk Filter */}
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">අවදානම් තත්ත්වය (Risk):</span>
          <select 
            className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            value={filter.risk}
            onChange={(e) => setFilter({ ...filter, risk: e.target.value })}
          >
            <option value="All">සියලුම තත්ත්ව (All Risk Levels)</option>
            <option value="High-Risk">🚨 අධි-අවදානම් (High-Risk)</option>
            <option value="Normal">✅ සාමාන්‍ය (Normal)</option>
          </select>
        </div>
        
        {/* Trimester Filter */}
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">ත්‍රෛමාසිකය (Trimester):</span>
          <select 
            className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            value={filter.trimester}
            onChange={(e) => setFilter({ ...filter, trimester: e.target.value })}
          >
            <option value="All">සියලුම ත්‍රෛමාසික (All Trimesters)</option>
            <option value="T1">1 වන ත්‍රෛමාසිකය (1-12 wks)</option>
            <option value="T2">2 වන ත්‍රෛමාසිකය (13-27 wks)</option>
            <option value="T3">3 වන ත්‍රෛමාසිකය (28+ wks)</option>
          </select>
        </div>

        {/* Midwife Filter */}
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">PHM නිලධාරිනිය (Midwife):</span>
          <select 
            className="w-full text-xs font-bold p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
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
        <div className="py-20 text-center italic text-slate-400 bg-white rounded-3xl shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
          දත්ත ලබාගනිමින් පවතී...
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
              ප්‍රදේශයේ ලියාපදිංචි ගර්භනී මව්වරුන්ගේ නාමාවලිය
            </span>
            <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-sm">
              පෙරූ ප්‍රතිඵල: <strong className="text-emerald-700">{filteredMothers.length}</strong> / {mothers.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="p-4">මවගේ නම සහ NIC</th>
                  <th className="p-4">ගර්භනී සති / EDD</th>
                  <th className="p-4">රුධිර ගණය & වයස</th>
                  <th className="p-4">PHM නිලධාරිනිය</th>
                  <th className="p-4">සේවා කලාපය</th>
                  <th className="p-4 text-center">අවදානම් තත්ත්වය</th>
                  <th className="p-4 text-right">ක්‍රියා (Action)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredMothers.map((mother) => (
                  <tr key={mother.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{mother.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-bold">NIC: {mother.nic || '—'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{mother.gestationalAge || mother.weeks || '—'} සති (Wks)</div>
                      <div className="text-[10px] text-slate-400 font-mono">EDD: {mother.edd || '—'}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 font-black text-xs font-mono">
                        {mother.bloodGroup || '—'}
                      </span>
                      <span className="text-xs text-slate-400 ml-2 font-bold">{mother.age ? `${mother.age} Yrs` : ''}</span>
                    </td>
                    <td className="p-4 font-bold text-emerald-800">
                      {mother.midwifeName || 'නොපවරා ඇත'}
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg inline-block">
                        {mother.serviceArea || mother.phmArea || '—'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider inline-block ${
                        mother.riskStatus === 'High-Risk' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {mother.riskStatus === 'High-Risk' ? '🚨 High-Risk' : '✅ Normal'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedMother(mother)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                      >
                        විස්තර බලන්න
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredMothers.length === 0 && (
            <div className="p-12 text-center text-slate-400 italic text-sm">
              {mohArea} ප්‍රදේශය සඳහා තෝරාගත් කොන්දේසි වලට අදාළ දත්ත හමු නොවීය. (No records found)
            </div>
          )}
        </div>
      )}
    </MOHLayout>
  );
};

export default AreaMothers;