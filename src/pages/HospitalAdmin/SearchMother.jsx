import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import HospitalLayout from '../../components/HospitalLayout';
import ModalPortal from '../../components/ModalPortal';
import { sanitizeNICInput, formatDisplayDate, safeRenderText, isHighRiskMother, normalizeRiskStatus } from '../../utils/securityValidators';
import { Link } from 'react-router-dom';

const SearchMother = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('nic'); // 'nic' or 'phone' or 'name'
  const [motherData, setMotherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [admitting, setAdmitting] = useState(false);
  const [showAdmitConfirmModal, setShowAdmitConfirmModal] = useState(false);
  const [currentHospital, setCurrentHospital] = useState('General Hospital Colombo');

  // Load logged-in hospital admin profile to get current hospital name
  useEffect(() => {
    const fetchHospitalInfo = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          // Check hospital_admins collection first
          const adminDoc = await getDoc(doc(db, "hospital_admins", user.uid));
          if (adminDoc.exists() && adminDoc.data().hospitalName) {
            setCurrentHospital(adminDoc.data().hospitalName);
            return;
          }
          // Fallback to users collection
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists() && userDoc.data().hospitalName) {
            setCurrentHospital(userDoc.data().hospitalName);
          }
        } catch (err) {
          console.error("Error fetching hospital info:", err);
        }
      }
    };
    fetchHospitalInfo();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    setMotherData(null);

    const term = (searchTerm || '').trim();
    if (!term) {
      setError("කරුණාකර සෙවීම සඳහා අංකයක් හෝ නමක් ඇතුළත් කරන්න.");
      setLoading(false);
      return;
    }

    try {
      let querySnapshot;
      if (searchType === 'nic') {
        const cleanNIC = term.toUpperCase();
        const q = query(collection(db, "mothers"), where("nic", "==", cleanNIC));
        querySnapshot = await getDocs(q);
      } else if (searchType === 'phone') {
        const q = query(collection(db, "mothers"), where("phone", "==", term));
        querySnapshot = await getDocs(q);
      } else {
        // Search by mother name or ID
        const allSnap = await getDocs(collection(db, "mothers"));
        const matched = allSnap.docs.filter(d => {
          const data = d.data();
          const name = (data.fullName || '').toLowerCase();
          return name.includes(term.toLowerCase());
        });
        if (matched.length > 0) {
          querySnapshot = { empty: false, docs: matched };
        } else {
          querySnapshot = { empty: true, docs: [] };
        }
      }

      if (!querySnapshot.empty) {
        const rawDoc = querySnapshot.docs[0];
        const data = rawDoc.data();
        const isHigh = isHighRiskMother(data);
        
        setMotherData({
          id: rawDoc.id,
          ...data,
          fullName: safeRenderText(data.fullName, 'නම දක්වා නැත'),
          nic: safeRenderText(data.nic, '—'),
          phone: safeRenderText(data.phone, '—'),
          emergencyPhone: safeRenderText(data.emergencyPhone || data.husbandPhone, '—'),
          address: safeRenderText(data.address, 'ලිපිනය දක්වා නැත'),
          bloodGroup: safeRenderText(data.bloodGroup || data.bloodType, 'නොදනී'),
          mohArea: safeRenderText(data.mohArea, '—'),
          district: safeRenderText(data.district, '—'),
          serviceArea: safeRenderText(data.serviceArea || data.phmArea, '—'),
          midwifeName: safeRenderText(data.midwifeName, 'නොදනී'),
          midwifePhone: safeRenderText(data.midwifePhone, '—'),
          hospitalName: safeRenderText(data.hospitalName, ''),
          status: safeRenderText(data.status, 'Active'),
          riskStatus: isHigh ? 'High-Risk' : normalizeRiskStatus(data),
          isHighRisk: isHigh,
          riskReason: safeRenderText(data.riskReason || data.notes || data.riskNotes, ''),
          allergies: safeRenderText(data.allergies || data.allergyNotes, 'විශේෂ අසාත්මිකතා සටහන් කර නොමැත (No known allergies)'),
          chronicConditions: safeRenderText(data.chronicConditions || data.medicalHistory, 'පෙර රෝග තත්ත්ව නොමැත (None reported)'),
          medicalNotes: safeRenderText(data.medicalNotes || data.doctorNotes, ''),
          edd: formatDisplayDate(data.edd, 'නොදක්වා ඇත'),
          gestationalAge: safeRenderText(data.gestationalAge || data.weeks, '—'),
          gravida: safeRenderText(data.gravida || data.gravidity, '1'),
          para: safeRenderText(data.para || data.parity, '0'),
          age: safeRenderText(data.age, '—'),
          clinicalHistory: Array.isArray(data.clinicalHistory) ? data.clinicalHistory : []
        });
      } else {
        setError(`ඇතුළත් කළ සෙවුමට (${term}) අදාළ මවගේ දත්ත පද්ධතියේ හමු නොවීය. (No records found)`);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError("දත්ත සෙවීමේදී දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.");
    }
    setLoading(false);
  };

  const handleAdmitMother = async () => {
    if (!motherData || !motherData.id) return;
    setAdmitting(true);
    setShowAdmitConfirmModal(false);

    try {
      const motherRef = doc(db, "mothers", motherData.id);
      await updateDoc(motherRef, {
        hospitalName: currentHospital,
        status: "Admitted",
        admittedDate: serverTimestamp(),
        lastHospital: motherData.hospitalName || null
      });

      setMotherData(prev => ({
        ...prev,
        hospitalName: currentHospital,
        status: "Admitted"
      }));

      setSuccessMessage(`මව සාර්ථකව ${currentHospital} රෝහලට ඇතුළත් කර ගන්නා ලදී! (Admitted Successfully)`);
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch (err) {
      console.error("Admission error:", err);
      setError("රෝහලට ඇතුළත් කිරීමේදී දෝෂයක් සිදු විය: " + err.message);
    }
    setAdmitting(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <HospitalLayout>
      {/* Admit Confirmation Modal */}
      {showAdmitConfirmModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-blue-950/70 backdrop-blur-md p-4 flex min-h-screen items-center justify-center animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setShowAdmitConfirmModal(false)} aria-hidden="true" />
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-indigo-100 text-center z-10 my-auto animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4 text-2xl shadow-inner">
                🏥
              </div>
              <h3 className="text-xl font-black text-slate-800">රෝහලට ඇතුළත් කරගැනීම තහවුරු කරන්න</h3>
              <p className="text-xs font-semibold text-slate-500 mt-1 mb-4">
                <strong>{motherData.fullName}</strong> මව <strong>{currentHospital}</strong> රෝහලේ නේවාසික ප්‍රතිකාර සඳහා ඇතුළත් කර ගැනීමට ඔබට සහතිකද?
              </p>
              
              {motherData.hospitalName && motherData.hospitalName !== currentHospital && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-bold text-left">
                  ⚠️ සටහන: මෙම මව මීට පෙර {motherData.hospitalName} රෝහලට සම්බන්ධ කර තිබුණි. මෙම පියවරෙන් පසු ඇයගේ වත්මන් රෝහල {currentHospital} ලෙස යාවත්කාලීන වේ.
                </div>
              )}

              <div className="flex space-x-3 mt-6">
                <button 
                  onClick={() => setShowAdmitConfirmModal(false)} 
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-xs uppercase text-slate-600 transition-all"
                >
                  අවලංගු කරන්න
                </button>
                <button 
                  onClick={handleAdmitMother} 
                  disabled={admitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  {admitting ? "ඇතුළත් කරමින්..." : "ඔව්, ඇතුළත් කරන්න"}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-700 font-mono text-[10px] font-black uppercase tracking-wider">
                Emergency Medical Portal
              </span>
              <span className="text-xs text-slate-400 font-bold">•</span>
              <span className="text-xs text-slate-500 font-bold">{currentHospital}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mt-1">
              ජාතික මාතෘ සෞඛ්‍ය දත්ත හා හදිසි රෝගී සෙවුම
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              දිවයිනේ ඕනෑම ප්‍රදේශයක ලියාපදිංචි මවකගේ සම්පූර්ණ වෛද්‍ය ඉතිහාසය, සායන වාර්තා සහ අවදානම් තොරතුරු ක්ෂණිකව ලබාගැනීම
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              to="/hospital-admin/admissions"
              className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2"
            >
              <span>📋</span> නේවාසික ලැයිස්තුව
            </Link>
          </div>
        </div>

        {/* Search Console */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-indigo-50">
          <div className="flex flex-wrap items-center gap-4 mb-4 pb-3 border-b border-slate-100">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">සෙවුම් ක්‍රමය තෝරන්න:</span>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input 
                type="radio" 
                name="searchType" 
                value="nic" 
                checked={searchType === 'nic'} 
                onChange={() => setSearchType('nic')}
                className="text-indigo-600 focus:ring-indigo-500" 
              />
              <span>ජාතික හැඳුනුම්පත (NIC)</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input 
                type="radio" 
                name="searchType" 
                value="phone" 
                checked={searchType === 'phone'} 
                onChange={() => setSearchType('phone')}
                className="text-indigo-600 focus:ring-indigo-500" 
              />
              <span>දුරකථන අංකය (Phone)</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input 
                type="radio" 
                name="searchType" 
                value="name" 
                checked={searchType === 'name'} 
                onChange={() => setSearchType('name')}
                className="text-indigo-600 focus:ring-indigo-500" 
              />
              <span>මවගේ නම (Name)</span>
            </label>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                🔍
              </div>
              <input 
                type="text" 
                placeholder={
                  searchType === 'nic' 
                    ? "මවගේ හැඳුනුම්පත් අංකය ඇතුළත් කරන්න (e.g. 199012345678 / 901234567V)" 
                    : searchType === 'phone' 
                    ? "දුරකථන අංකය ඇතුළත් කරන්න (e.g. 0771234567)" 
                    : "මවගේ නම ඇතුළත් කරන්න (e.g. Kumari Perera)"
                }
                className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm text-slate-800 transition-all placeholder:font-normal placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchTerm(searchType === 'nic' ? sanitizeNICInput(val) : val);
                }}
                maxLength={searchType === 'nic' ? 12 : searchType === 'phone' ? 10 : 80}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2 shrink-0"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>සොයමින්...</span>
                </>
              ) : (
                <>
                  <span>දත්ත ලබාගන්න</span>
                  <span>➔</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-300">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-black flex items-center gap-2 animate-in fade-in duration-300">
              <span>✅</span>
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Complete Medical Profile Result */}
        {motherData && (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom duration-500">
            {/* Header / Emergency Banner */}
            <div className={`p-6 sm:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 ${
              motherData.isHighRisk 
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-amber-700' 
                : 'bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600'
            }`}>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider">
                    {motherData.isHighRisk ? '🚨 HIGH-RISK PREGNANCY' : '✅ NORMAL PREGNANCY'}
                  </span>
                  {motherData.bloodGroup && (
                    <span className="px-3 py-1 rounded-full bg-red-950/40 text-amber-200 font-mono text-xs font-black border border-amber-300/30">
                      🩸 Blood Group: {motherData.bloodGroup}
                    </span>
                  )}
                  {motherData.hospitalName && (
                    <span className="px-3 py-1 rounded-full bg-black/20 text-white text-[10px] font-bold">
                      🏥 Current Hospital: {motherData.hospitalName} ({motherData.status})
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{motherData.fullName}</h2>
                <p className="text-white/80 text-xs font-semibold">
                  NIC: <span className="font-mono font-bold text-white">{motherData.nic}</span> | වයස: {motherData.age} Years | සේවා ප්‍රදේශය: {motherData.serviceArea} ({motherData.mohArea} MOH)
                </p>
              </div>

              {/* Action Buttons in Banner */}
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={handlePrint}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2"
                >
                  <span>🖨️</span> Print Summary
                </button>

                <Link
                  to={`/hospital-admin/update-clinical/${motherData.id}`}
                  className="px-5 py-2.5 bg-white text-indigo-900 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-50 shadow-md transition-all flex items-center gap-2"
                >
                  <span>🩺</span> Update Clinical Notes
                </Link>

                {motherData.hospitalName !== currentHospital ? (
                  <button 
                    onClick={() => setShowAdmitConfirmModal(true)}
                    className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center gap-2 active:scale-95"
                  >
                    <span>🏥</span> මෙම රෝහලට ඇතුළත් කරන්න
                  </button>
                ) : (
                  <span className="px-4 py-2 bg-emerald-500/30 border border-emerald-300/40 text-emerald-100 rounded-xl text-xs font-black uppercase">
                    ✓ ඇතුළත් කර ඇත (Admitted Here)
                  </span>
                )}
              </div>
            </div>

            {/* High-Risk Details Alert if present */}
            {motherData.isHighRisk && (
              <div className="p-4 sm:p-5 bg-red-50 border-b border-red-100 flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <h4 className="text-xs font-black text-red-900 uppercase tracking-wide">අධි-අවදානම් හේතු හා සටහන් (Risk Indicators):</h4>
                  <p className="text-xs font-bold text-red-700 mt-0.5 leading-relaxed">
                    {motherData.riskReason || "විශේෂ අවදානම් ලක්ෂණ හඳුනාගෙන ඇත. හදිසි ප්‍රතිකාර හා නිරන්තර පරීක්ෂණ නිර්දේශිතයි."}
                  </p>
                </div>
              </div>
            )}

            {/* Detailed Clinical Sections */}
            <div className="p-6 sm:p-8 space-y-8">
              {/* Grid 1: Basic & Obstetric Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard title="රුධිර ගණය (Blood Group)" value={motherData.bloodGroup} icon="🩸" highlight={true} />
                <StatCard title="දරු ප්‍රසූති දිනය (EDD)" value={motherData.edd} icon="📅" />
                <StatCard title="ගර්භණී කාලය (POA / Weeks)" value={motherData.gestationalAge ? `${motherData.gestationalAge} සති` : '—'} icon="⏳" />
                <StatCard title="ගර්භ වාර / ප්‍රසව (G / P)" value={`G${motherData.gravida} P${motherData.para}`} icon="👶" />
              </div>

              {/* Grid 2: Detailed Info Blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                {/* Contact & Location */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/70 space-y-4">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span>📍</span> පදිංචිය හා හදිසි ඇමතුම් (Emergency Contacts)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <InfoRow label="මවගේ දුරකථනය" value={motherData.phone} isPhone={true} />
                    <InfoRow label="හදිසි / ස්වාමිපුරුෂයාගේ අංකය" value={motherData.emergencyPhone} isPhone={true} highlight={true} />
                    <InfoRow label="දිස්ත්‍රික්කය" value={motherData.district} />
                    <InfoRow label="MOH කාර්යාලය" value={motherData.mohArea} />
                    <InfoRow label="PHM සේවා කොට්ඨාශය" value={motherData.serviceArea} />
                    <InfoRow label="ලිපිනය" value={motherData.address} span={true} />
                  </div>
                </div>

                {/* Assigned Midwife & Healthcare Support */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/70 space-y-4">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span>👩‍⚕️</span> භාරකාර පවුල් සෞඛ්‍ය සේවා නිලධාරිනිය (Midwife)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <InfoRow label="නිලධාරිනියගේ නම" value={motherData.midwifeName} highlight={true} />
                    <InfoRow label="නිලධාරිනියගේ දුරකථනය" value={motherData.midwifePhone} isPhone={true} />
                    <InfoRow label="වත්මන් රෝහල් තත්ත්වය" value={motherData.hospitalName ? `${motherData.hospitalName} (${motherData.status})` : 'කිසිදු රෝහලකට ඇතුළත් වී නැත'} span={true} />
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      💡 <em>හදිසි අවස්ථාවකදී මවගේ භාරකාර මිඩ්වයිෆ් නිලධාරිනිය අමතා අතිරේක සෞඛ්‍ය ඉතිහාසය හෝ සායනික වාර්තා ක්ෂණිකව තහවුරු කරගත හැක.</em>
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid 3: Allergies & Chronic Conditions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200/80">
                  <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>⚠️</span> අසාත්මිකතා (Allergies & Drug Reactions)
                  </h4>
                  <p className="text-xs font-bold text-amber-800 leading-relaxed">
                    {motherData.allergies}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80">
                  <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>🩺</span> දිගුකාලීන රෝගී තත්ත්ව (Chronic / Past Conditions)
                  </h4>
                  <p className="text-xs font-bold text-blue-800 leading-relaxed">
                    {motherData.chronicConditions}
                  </p>
                </div>
              </div>

              {/* Medical Notes */}
              {motherData.medicalNotes && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
                    පෙර වෛද්‍ය සටහන් (Previous Doctor / Clinical Notes)
                  </h4>
                  <p className="text-xs font-bold text-slate-700 leading-relaxed">
                    {motherData.medicalNotes}
                  </p>
                </div>
              )}

              {/* Clinical Checkups History Timeline */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span>📋</span> සායනික පරීක්ෂණ ඉතිහාසය (Antenatal Checkup History)
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      මිඩ්වයිෆ් හා රෝහල් වෛද්‍යවරුන් විසින් මීට පෙර ඇතුළත් කළ සියලුම පරීක්ෂණ සටහන්
                    </p>
                  </div>
                  <Link
                    to={`/hospital-admin/update-clinical/${motherData.id}`}
                    className="text-xs font-black text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                  >
                    <span>+ අලුත් පරීක්ෂණයක් එක් කරන්න</span>
                  </Link>
                </div>

                {motherData.clinicalHistory && motherData.clinicalHistory.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="p-3.5">දිනය (Date)</th>
                          <th className="p-3.5">රුධිර පීඩනය (BP)</th>
                          <th className="p-3.5">බර (Weight)</th>
                          <th className="p-3.5">සීනි මට්ටම (Sugar)</th>
                          <th className="p-3.5">කලල හෘද ස්පන්දනය (FHR)</th>
                          <th className="p-3.5">පරීක්ෂක / සටහන් (Notes)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {motherData.clinicalHistory.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3.5 font-bold text-slate-800 font-mono">{item.date || '—'}</td>
                            <td className="p-3.5 font-black text-indigo-700">{item.bp || '—'}</td>
                            <td className="p-3.5 font-bold text-slate-700">{item.weight ? `${item.weight} kg` : '—'}</td>
                            <td className="p-3.5 font-bold text-slate-700">{item.sugarLevel || '—'}</td>
                            <td className="p-3.5 font-bold text-slate-700">{item.fetalHeartRate ? `${item.fetalHeartRate} bpm` : '—'}</td>
                            <td className="p-3.5 text-slate-600">
                              <div className="font-semibold">{item.notes || '—'}</div>
                              {item.checkedBy && (
                                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">By: {item.checkedBy}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-200 text-slate-400 text-xs font-semibold">
                    පෙර සායනික පරීක්ෂණ වාර්තා (Clinical Checkup History) මෙතෙක් පද්ධතියට එක් කර නොමැත.
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-500 font-medium text-center sm:text-left">
                🏥 වත්මන් රෝහල: <strong className="text-slate-700">{currentHospital}</strong> | පද්ධතිය: Maatha National Maternal Cloud
              </p>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePrint}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-black uppercase text-xs rounded-xl hover:bg-slate-100 transition-all shadow-sm"
                >
                  Print Summary
                </button>
                {motherData.hospitalName !== currentHospital && (
                  <button 
                    onClick={() => setShowAdmitConfirmModal(true)}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-xs rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Admit to {currentHospital}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </HospitalLayout>
  );
};

const StatCard = ({ title, value, icon, highlight = false }) => (
  <div className={`p-5 rounded-2xl border ${
    highlight ? 'bg-red-50/50 border-red-200' : 'bg-slate-50 border-slate-200/70'
  }`}>
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
      <span className="text-lg">{icon}</span>
    </div>
    <div className={`text-xl font-black ${highlight ? 'text-red-700' : 'text-slate-800'}`}>
      {value || '—'}
    </div>
  </div>
);

const InfoRow = ({ label, value, isPhone = false, highlight = false, span = false }) => (
  <div className={span ? 'sm:col-span-2' : ''}>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
    <p className={`text-xs font-bold mt-0.5 ${
      highlight ? 'text-indigo-900 font-black' : 'text-slate-800'
    } ${isPhone ? 'font-mono' : ''}`}>
      {value || '—'}
    </p>
  </div>
);

export default SearchMother;