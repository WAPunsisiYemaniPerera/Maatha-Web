import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import HospitalLayout from '../../components/HospitalLayout';
import ModalPortal from '../../components/ModalPortal';
import { sanitizeNICInput, formatDisplayDate, safeRenderText, isHighRiskMother, normalizeRiskStatus } from '../../utils/securityValidators';
import { Link } from 'react-router-dom';

const calculatePOA = (lmpObj, eddObj) => {
  try {
    let startDate;
    if (lmpObj && lmpObj.toDate) {
      startDate = lmpObj.toDate();
    } else if (eddObj && eddObj.toDate) {
      // Calculate backward from EDD (LMP is EDD - 280 days)
      startDate = new Date(eddObj.toDate().getTime() - 280 * 24 * 60 * 60 * 1000);
    } else {
      return null;
    }
    const now = new Date();
    const diffTime = now - startDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return '—';
    const weeks = Math.floor(diffDays / 7);
    const days = diffDays % 7;
    return `${weeks} Weeks ${days} Days`;
  } catch (e) {
    return null;
  }
};

const SearchMother = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [motherData, setMotherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [admitting, setAdmitting] = useState(false);
  const [showAdmitConfirmModal, setShowAdmitConfirmModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [submittingDelivery, setSubmittingDelivery] = useState(false);
  const [currentHospital, setCurrentHospital] = useState('General Hospital Colombo');
  const [deliveryForm, setDeliveryForm] = useState({
    date: new Date().toISOString().split('T')[0],
    birthWeight: '',
    poa: '',
    modeOfDelivery: 'Normal Vaginal',
    babySex: 'Female (ගැහැණු)',
    birthOutcome: 'Live birth',
    episiotomy: false,
    notes: ''
  });

  const calculatePOA = (eddInput) => {
    if (!eddInput) return null;
    try {
      let eddDate;
      if (eddInput.toDate) eddDate = eddInput.toDate();
      else eddDate = new Date(eddInput);
      if (isNaN(eddDate.getTime())) return null;
      
      const diffTime = eddDate.getTime() - new Date().getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const daysCompleted = 280 - diffDays; 
      
      if (daysCompleted < 0 || daysCompleted > 300) return null;
      const weeks = Math.floor(daysCompleted / 7);
      const days = daysCompleted % 7;
      return `${weeks} weeks${days > 0 ? ` ${days} days` : ''}`;
    } catch (e) {
      return null;
    }
  };

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
      const cleanNIC = term.toUpperCase();
      const q = query(collection(db, "mothers"), where("nic", "==", cleanNIC));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const rawDoc = querySnapshot.docs[0];
        const data = rawDoc.data();
        const isHigh = isHighRiskMother(data);
        
        // Fetch clinic reports
        let clinicRecords = [];
        try {
          const clinicQ = query(collection(db, "clinic_reports"), where("motherId", "==", rawDoc.id));
          const clinicSnap = await getDocs(clinicQ);
          clinicRecords = clinicSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          clinicRecords.sort((a, b) => {
            const t1 = a.visitDate ? a.visitDate.toMillis() : 0;
            const t2 = b.visitDate ? b.visitDate.toMillis() : 0;
            return t2 - t1;
          });
        } catch (e) {
          console.error("Error fetching clinic reports:", e);
        }

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
          district: safeRenderText(data.district || data.districtName || data.city || data.mohArea, '—'),
          serviceArea: safeRenderText(data.serviceArea || data.phmArea, '—'),
          midwifeName: safeRenderText(data.midwifeName || data.assignedMidwife || data.phmName || data.midwife, 'නොදනී'),
          midwifePhone: safeRenderText(data.midwifePhone || data.phmPhone, 'නොදක්වා ඇත (N/A)'),
          hospitalName: safeRenderText(data.hospitalName, ''),
          pregnancyStatus: safeRenderText(data.pregnancyStatus, 'Antenatal'),
          hospitalStatus: safeRenderText(data.hospitalStatus, 'None'),
          riskStatus: isHigh ? 'High-Risk' : normalizeRiskStatus(data),
          isHighRisk: isHigh,
          riskReason: safeRenderText(data.riskReason || data.notes || data.riskNotes, ''),
          allergies: safeRenderText(data.allergies || data.allergyNotes, 'විශේෂ අසාත්මිකතා සටහන් කර නොමැත (No known allergies)'),
          chronicConditions: safeRenderText(data.chronicConditions || data.medicalHistory, 'පෙර රෝග තත්ත්ව නොමැත (None reported)'),
          medicalNotes: safeRenderText(data.medicalNotes || data.doctorNotes, ''),
          edd: formatDisplayDate(data.edd, 'නොදක්වා ඇත'),
          lmp: data.lmp,
          gestationalAge: safeRenderText(data.gestationalAge || data.poa || data.weeks || calculatePOA(data.lmp, data.edd), '—'),
          gravida: safeRenderText(data.gravida || data.gravidity, '1'),
          para: safeRenderText(data.para || data.parity, '0'),
          age: safeRenderText(data.age, '—'),
          height: safeRenderText(data.height, '—'),
          weight: safeRenderText(data.weight, '—'),
          bmi: safeRenderText(data.bmi, '—'),
          vaccines: Array.isArray(data.vaccines) ? data.vaccines : [],
          supplements: Array.isArray(data.supplements) ? data.supplements : [],
          deliveryDetails: data.deliveryDetails || null,
          babyDetails: data.babyDetails || null,
          postpartumVisits: Array.isArray(data.postpartumVisits) ? data.postpartumVisits : [],
          clinicalHistory: clinicRecords.length > 0 ? clinicRecords : (Array.isArray(data.clinicalHistory) ? data.clinicalHistory : [])
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
        hospitalStatus: "Admitted",
        admittedDate: serverTimestamp(),
        lastHospital: motherData.hospitalName || null
      });

      setMotherData(prev => ({
        ...prev,
        hospitalName: currentHospital,
        hospitalStatus: "Admitted"
      }));

      setSuccessMessage(`මව සාර්ථකව ${currentHospital} රෝහලට ඇතුළත් කර ගන්නා ලදී! (Admitted Successfully)`);
      setTimeout(() => setSuccessMessage(''), 6000);
    } catch (err) {
      console.error("Admission error:", err);
      setError("රෝහලට ඇතුළත් කිරීමේදී දෝෂයක් සිදු විය: " + err.message);
    }
    setAdmitting(false);
  };

  const handleRecordDelivery = async (e) => {
    e.preventDefault();
    if (!motherData || !motherData.id) return;
    setSubmittingDelivery(true);

    try {
      const summaryPayload = {
        motherId: motherData.id,
        motherName: motherData.fullName,
        motherNIC: motherData.nic,
        deliveryDate: deliveryForm.date,
        updatedAt: serverTimestamp(),
        birthWeight: deliveryForm.birthWeight,
        poa: deliveryForm.poa,
        modeOfDelivery: deliveryForm.modeOfDelivery,
        babySex: deliveryForm.babySex,
        birthOutcome: deliveryForm.birthOutcome,
        episiotomy: deliveryForm.episiotomy,
        hospitalName: currentHospital,
        recordedBy: 'Hospital Admin'
      };

      // 1. Save to postpartum_records
      await addDoc(collection(db, 'postpartum_records'), {
        ...summaryPayload,
        createdAt: serverTimestamp()
      });

      // 2. Update mother document
      const motherRef = doc(db, "mothers", motherData.id);
      
      const newDeliveryDetails = {
         date: deliveryForm.date,
         hospitalName: currentHospital,
         deliveryMethod: deliveryForm.modeOfDelivery,
         complications: deliveryForm.notes
      };
      
      const newBabyDetails = {
         gender: deliveryForm.babySex,
         birthWeight: deliveryForm.birthWeight,
         notes: deliveryForm.notes,
         apgarScore: ''
      };

      await updateDoc(motherRef, {
        pregnancyStatus: "Postnatal",
        status: "Postnatal", // legacy
        hospitalName: currentHospital,
        hospitalStatus: "Admitted",
        admittedDate: serverTimestamp(),
        deliverySummary: summaryPayload,
        deliveryDetails: newDeliveryDetails,
        babyDetails: newBabyDetails
      });

      setMotherData(prev => ({
        ...prev,
        pregnancyStatus: "Postnatal",
        hospitalName: currentHospital,
        hospitalStatus: "Admitted",
        deliveryDetails: newDeliveryDetails,
        babyDetails: newBabyDetails
      }));

      setSuccessMessage("මවගේ දරු ප්‍රසූතිය සාර්ථකව පද්ධතියට ඇතුළත් කරන ලදී! (Delivery Recorded Successfully)");
      setTimeout(() => setSuccessMessage(''), 6000);
      setShowDeliveryModal(false);
    } catch (err) {
      console.error("Delivery record error:", err);
      setError("දෝෂයක් සිදු විය: " + err.message);
    }
    setSubmittingDelivery(false);
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

      {/* Record Delivery Modal */}
      {showDeliveryModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/60 backdrop-blur-sm p-4 flex min-h-screen items-center justify-center animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setShowDeliveryModal(false)} aria-hidden="true" />
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 z-10 animate-in zoom-in-95 duration-200 my-8">
              
              <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl">🍼</div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">ප්‍රසූතිය සටහන් කිරීම</h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Hospital Delivery Record</p>
                  </div>
                </div>
                <button onClick={() => setShowDeliveryModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center transition-colors">✕</button>
              </div>

              <form onSubmit={handleRecordDelivery} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">ප්‍රසූත දිනය (Date)</label>
                    <input type="date" required value={deliveryForm.date} onChange={e => setDeliveryForm({...deliveryForm, date: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">උපත් බර (Weight - g)</label>
                    <input type="number" required placeholder="e.g. 3100" value={deliveryForm.birthWeight} onChange={e => setDeliveryForm({...deliveryForm, birthWeight: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">ප්‍රසූත ක්‍රමය (Method)</label>
                    <select value={deliveryForm.modeOfDelivery} onChange={e => setDeliveryForm({...deliveryForm, modeOfDelivery: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="Normal Vaginal">Normal Vaginal</option>
                      <option value="Elective LSCS">Elective LSCS</option>
                      <option value="Emergency LSCS">Emergency LSCS</option>
                      <option value="Forceps / Vacuum">Forceps / Vacuum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">ස්ත්‍රී/පුරුෂ (Gender)</label>
                    <select value={deliveryForm.babySex} onChange={e => setDeliveryForm({...deliveryForm, babySex: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="Female (ගැහැණු)">Female (ගැහැණු)</option>
                      <option value="Male (පිරිමි)">Male (පිරිමි)</option>
                      <option value="Twins (නිවුන්)">Twins (නිවුන්)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">ප්‍රතිඵලය (Outcome)</label>
                    <select value={deliveryForm.birthOutcome} onChange={e => setDeliveryForm({...deliveryForm, birthOutcome: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="Live birth">Live birth</option>
                      <option value="Stillbirth">Stillbirth</option>
                      <option value="Neonatal Death">Neonatal Death</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Episiotomy/Tear</label>
                    <select value={deliveryForm.episiotomy ? "Yes" : "No"} onChange={e => setDeliveryForm({...deliveryForm, episiotomy: e.target.value === "Yes"})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="No">No (නැත)</option>
                      <option value="Yes">Yes (ඔව්)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">සටහන් / සංකූලතා (Complications & Notes)</label>
                  <textarea rows="3" placeholder="If any..." value={deliveryForm.notes} onChange={e => setDeliveryForm({...deliveryForm, notes: e.target.value})} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"></textarea>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowDeliveryModal(false)} className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all">
                    අවලංගු කරන්න
                  </button>
                  <button type="submit" disabled={submittingDelivery} className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2">
                    {submittingDelivery ? "සුරකිමින්..." : "සුරකින්න (Save Record)"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 font-mono text-[10px] font-black uppercase tracking-wider border border-teal-200">
                Medical Clinical Portal
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
        <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-sm border border-teal-50">
          <div className="mb-4 pb-3 border-b border-slate-100 flex items-center gap-3">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">සෙවුම් ක්‍රමය:</span>
            <span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold border border-teal-100">ජාතික හැඳුනුම්පත (NIC) පමණි</span>
          </div>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                🔍
              </div>
              <input 
                type="text" 
                placeholder="මවගේ හැඳුනුම්පත් අංකය ඇතුළත් කරන්න (e.g. 199012345678 / 901234567V)"
                className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-sm text-slate-800 transition-all placeholder:font-normal placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(sanitizeNICInput(e.target.value))}
                maxLength={12}
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-teal-600/20 active:scale-95 flex items-center justify-center gap-2 shrink-0"
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
          <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header / Emergency Banner */}
            <div className={`relative p-8 sm:p-10 text-white overflow-hidden ${
              motherData.isHighRisk 
                ? 'bg-gradient-to-br from-red-600 via-rose-700 to-amber-800' 
                : 'bg-gradient-to-br from-teal-800 via-teal-700 to-cyan-900'
            }`}>
              {/* Background abstract decoration */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-white opacity-5 blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 rounded-full bg-black opacity-10 blur-2xl pointer-events-none"></div>

              <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-4 py-1.5 rounded-full backdrop-blur-md text-white text-[11px] font-black uppercase tracking-widest shadow-sm ${motherData.isHighRisk ? 'bg-red-950/40 border border-red-400/30' : 'bg-white/20 border border-white/20'}`}>
                      {motherData.isHighRisk ? '🚨 HIGH-RISK PREGNANCY' : '✅ NORMAL PREGNANCY'}
                    </span>
                    {motherData.bloodGroup && (
                      <span className="px-4 py-1.5 rounded-full bg-black/30 backdrop-blur-md text-white font-mono text-[11px] font-black border border-white/10 shadow-sm">
                        🩸 Blood Group: {motherData.bloodGroup}
                      </span>
                    )}
                    {motherData.hospitalName && (
                      <span className="px-4 py-1.5 rounded-full bg-indigo-950/40 backdrop-blur-md text-indigo-100 text-[11px] font-black border border-indigo-400/20 shadow-sm">
                        🏥 Hospital: {motherData.hospitalName} ({motherData.hospitalStatus})
                      </span>
                    )}
                    <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-[11px] font-black border border-white/10 shadow-sm">
                      🤰 Status: {motherData.pregnancyStatus}
                    </span>
                  </div>
                  
                  <div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight drop-shadow-md mb-2">{motherData.fullName}</h2>
                    <p className="text-white/90 text-sm font-semibold flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1.5"><span className="text-white/60">NIC:</span> <span className="font-mono font-bold text-white tracking-wider bg-black/20 px-2 py-0.5 rounded">{motherData.nic}</span></span>
                      <span>•</span>
                      <span>වයස: {motherData.age} Years</span>
                      <span>•</span>
                      <span>{motherData.serviceArea} ({motherData.mohArea} MOH)</span>
                    </p>
                  </div>
                </div>

                {/* Action Buttons in Banner */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  <button 
                    onClick={handlePrint}
                    className="px-5 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/30 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>🖨️</span> Print
                  </button>

                  <Link
                    to={`/hospital-admin/update-clinical/${motherData.id}`}
                    className="px-6 py-3.5 bg-white text-teal-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-teal-50 shadow-xl transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                  >
                    <span>🩺</span> Update Clinicals
                  </Link>

                  {/* Record Delivery Button (Only if still pregnant) */}
                  {motherData.pregnancyStatus !== 'Postnatal' && motherData.pregnancyStatus !== 'Completed' && (
                    <button 
                      onClick={() => setShowDeliveryModal(true)}
                      className="px-6 py-3.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 border border-indigo-400/50"
                    >
                      <span>👶</span> Record Delivery
                    </button>
                  )}

                  {motherData.hospitalName !== currentHospital ? (
                    <button 
                      onClick={() => setShowAdmitConfirmModal(true)}
                      className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-amber-900/20 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                    >
                      <span>🏥</span> Admit Here
                    </button>
                  ) : (
                    <span className="px-6 py-3.5 bg-emerald-500/30 backdrop-blur-md border border-emerald-300/40 text-emerald-100 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                      <span>✓</span> Admitted Here
                    </span>
                  )}
                </div>
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
                    <InfoRow label="ගර්භණී තත්ත්වය" value={motherData.pregnancyStatus} />
                    <InfoRow label="වත්මන් රෝහල් තත්ත්වය" value={motherData.hospitalName ? `${motherData.hospitalName} (${motherData.hospitalStatus})` : 'කිසිදු රෝහලකට ඇතුළත් වී නැත'} />
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      💡 <em>හදිසි අවස්ථාවකදී මවගේ භාරකාර මිඩ්වයිෆ් නිලධාරිනිය අමතා අතිරේක සෞඛ්‍ය ඉතිහාසය හෝ සායනික වාර්තා ක්ෂණිකව තහවුරු කරගත හැක.</em>
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid 2.5: Physical Details & Vaccines (Data from Midwife App) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/70 space-y-4">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span>⚖️</span> මාතෘ භෞතික තොරතුරු (Physical Details)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <InfoRow label="උස (Height)" value={motherData.height ? `${motherData.height} cm` : '—'} />
                    <InfoRow label="බර (Weight)" value={motherData.weight ? `${motherData.weight} kg` : '—'} />
                    <InfoRow label="BMI දර්ශකය" value={motherData.bmi} highlight={true} />
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/70 space-y-4">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span>💊</span> එන්නත් සහ පෝෂණ අතිරේක (Vaccines & Supplements)
                  </h3>
                  <div className="text-xs space-y-3">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">එන්නත් (Vaccines)</span>
                      {motherData.vaccines.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {motherData.vaccines.map((v, i) => (
                            <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-bold">💉 {typeof v === 'string' ? v : v.name || 'Vaccine'}</span>
                          ))}
                        </div>
                      ) : <span className="text-slate-500 font-medium">සටහන් කර නැත</span>}
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">පෝෂණ අතිරේක (Supplements)</span>
                      {motherData.supplements.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {motherData.supplements.map((s, i) => (
                            <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded text-[10px] font-bold">💊 {typeof s === 'string' ? s : s.name || 'Supplement'}</span>
                          ))}
                        </div>
                      ) : <span className="text-slate-500 font-medium">සටහන් කර නැත</span>}
                    </div>
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

              {/* Clinic Reports (from Midwife App) */}
              {motherData.clinicalHistory && motherData.clinicalHistory.length > 0 && (
                <div className="p-5 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-4">
                  <h4 className="text-xs font-black text-teal-800 uppercase tracking-widest flex items-center gap-2">
                    <span className="text-lg">🏥</span> සායනික වාර්තා (Clinic Records)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {motherData.clinicalHistory.map((visit, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-teal-50 text-xs">
                        <div className="flex justify-between font-bold text-teal-900 border-b border-slate-100 pb-2 mb-2">
                          <span>{formatDisplayDate(visit.visitDate, 'N/A')}</span>
                          <span className="bg-teal-100 px-2 py-0.5 rounded text-[10px]">වාරය #{motherData.clinicalHistory.length - idx}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-600">
                          <span className="font-semibold">බර (Weight):</span> <span>{visit.weight ? `${visit.weight} kg` : '—'}</span>
                          <span className="font-semibold">රුධිර පීඩනය:</span> <span>{visit.bloodPressure || '—'}</span>
                          <span className="font-semibold">SFH:</span> <span>{visit.sfh ? `${visit.sfh} cm` : '—'}</span>
                          <span className="font-semibold">ඉදිමීම (Edema):</span> <span className={visit.hasEdema ? 'text-red-600 font-bold' : ''}>{visit.hasEdema ? 'පවතී (Yes)' : 'නැත (No)'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delivery & Postpartum Details (If available) */}
              {(motherData.deliveryDetails || motherData.babyDetails || motherData.postpartumVisits.length > 0) && (
                <div className="p-6 sm:p-8 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-6">
                  <div className="flex items-center gap-3 border-b border-indigo-200/60 pb-3">
                    <span className="text-2xl">🍼</span>
                    <h3 className="text-sm font-black text-indigo-900 uppercase tracking-wider">
                      ප්‍රසූතිය සහ පසු ප්‍රසව තොරතුරු (Delivery & Postnatal Records)
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Delivery Info */}
                    {motherData.deliveryDetails && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-indigo-800 uppercase">ප්‍රසූති විස්තර (Delivery Details)</h4>
                        <div className="grid grid-cols-2 gap-3 text-xs bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                          <InfoRow label="දිනය (Date)" value={motherData.deliveryDetails.date} />
                          <InfoRow label="රෝහල (Hospital)" value={motherData.deliveryDetails.hospitalName} />
                          <InfoRow label="ප්‍රසූති ක්‍රමය (Method)" value={motherData.deliveryDetails.deliveryMethod} />
                          <InfoRow label="සංකූලතා (Complications)" value={motherData.deliveryDetails.complications} highlight={true} />
                        </div>
                      </div>
                    )}
                    
                    {/* Baby Info */}
                    {motherData.babyDetails && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-indigo-800 uppercase">ළදරු තොරතුරු (Baby Details)</h4>
                        <div className="grid grid-cols-2 gap-3 text-xs bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                          <InfoRow label="ස්ත්‍රී/පුරුෂ භාවය (Gender)" value={motherData.babyDetails.gender} />
                          <InfoRow label="උපත් බර (Birth Weight)" value={motherData.babyDetails.birthWeight ? `${motherData.babyDetails.birthWeight} kg` : null} />
                          <InfoRow label="APGAR අගය" value={motherData.babyDetails.apgarScore} />
                          <InfoRow label="විශේෂ සටහන් (Notes)" value={motherData.babyDetails.notes} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Postpartum Visits */}
                  {motherData.postpartumVisits.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <h4 className="text-xs font-black text-indigo-800 uppercase">පසු ප්‍රසව සායන (Postpartum Checkups by Midwife)</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
                          <thead className="bg-indigo-50 text-indigo-800 font-black uppercase text-[10px] tracking-wider">
                            <tr>
                              <th className="p-3">දිනය (Date)</th>
                              <th className="p-3">මවගේ තත්ත්වය</th>
                              <th className="p-3">ළදරුවාගේ තත්ත්වය</th>
                              <th className="p-3">පවුල් සැලසුම් (FP)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-indigo-50">
                            {motherData.postpartumVisits.map((visit, idx) => (
                              <tr key={idx}>
                                <td className="p-3 font-bold text-slate-800">{visit.date || '—'}</td>
                                <td className="p-3 text-slate-700">{visit.motherStatus || '—'}</td>
                                <td className="p-3 text-slate-700">{visit.babyStatus || '—'}</td>
                                <td className="p-3 text-slate-700">{visit.familyPlanningMethod || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
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
                    className="text-xs font-black text-teal-600 hover:text-teal-800 hover:underline flex items-center gap-1"
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
                          <th className="p-3.5">Vitals (BP/Weight/Sugar/FHR)</th>
                          <th className="p-3.5">රෝග ලක්ෂණ (Symptoms & Findings)</th>
                          <th className="p-3.5">ප්‍රතිකාර සහ සටහන් (Treatments/Notes)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {motherData.clinicalHistory.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3.5 font-bold text-slate-800 font-mono">{item.date || '—'}</td>
                            <td className="p-3.5 text-xs space-y-1">
                              <div><span className="text-slate-400 font-bold">BP:</span> <span className="font-black text-teal-700">{item.bp || '—'}</span></div>
                              <div><span className="text-slate-400 font-bold">Wt:</span> <span className="font-bold text-slate-700">{item.weight ? `${item.weight} kg` : '—'}</span></div>
                              <div><span className="text-slate-400 font-bold">Sug:</span> <span className="font-bold text-slate-700">{item.sugarLevel || '—'}</span></div>
                              <div><span className="text-slate-400 font-bold">FHR:</span> <span className="font-bold text-slate-700">{item.fetalHeartRate ? `${item.fetalHeartRate} bpm` : '—'}</span></div>
                            </td>
                            <td className="p-3.5 text-xs text-slate-700 space-y-1">
                              {item.symptoms && <div><span className="font-bold text-slate-900">Symptoms:</span> {item.symptoms}</div>}
                              {(item.urineProtein || item.urineSugar) && <div><span className="font-bold text-slate-900">Urine:</span> P: {item.urineProtein || 'N/A'}, S: {item.urineSugar || 'N/A'}</div>}
                              {item.edema && item.edema !== 'None' && <div><span className="font-bold text-amber-700">Edema:</span> {item.edema}</div>}
                              {item.scanResults && <div><span className="font-bold text-slate-900">Scan:</span> {item.scanResults}</div>}
                              {(!item.symptoms && !item.urineProtein && !item.edema && !item.scanResults) && <span className="text-slate-400 font-medium">No special findings</span>}
                            </td>
                            <td className="p-3.5 text-slate-600 text-xs space-y-1">
                              {item.treatmentGiven && <div><span className="font-bold text-teal-800">Tx:</span> {item.treatmentGiven}</div>}
                              <div className="font-semibold">{item.notes || (item.treatmentGiven ? '' : '—')}</div>
                              {item.checkedBy && (
                                <span className="text-[9px] text-slate-400 font-bold block mt-1 uppercase tracking-wider">By: {item.checkedBy}</span>
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
                    className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-black uppercase text-xs rounded-xl shadow-md transition-all active:scale-95"
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
  <div className={`p-6 rounded-3xl border shadow-sm transition-all hover:shadow-md ${
    highlight ? 'bg-red-50/80 border-red-200' : 'bg-white border-slate-200/70'
  }`}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
      <span className="text-2xl opacity-80">{icon}</span>
    </div>
    <div className={`text-2xl font-black tracking-tight ${highlight ? 'text-red-700' : 'text-slate-800'}`}>
      {value || '—'}
    </div>
  </div>
);

const InfoRow = ({ label, value, isPhone = false, highlight = false, span = false }) => (
  <div className={`${span ? 'sm:col-span-2' : ''} bg-white p-3 rounded-xl border border-slate-100 shadow-sm`}>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
    <p className={`text-xs font-bold mt-1 ${
      highlight ? 'text-teal-700 font-black' : 'text-slate-800'
    } ${isPhone ? 'font-mono tracking-wide' : ''}`}>
      {value || '—'}
    </p>
  </div>
);

export default SearchMother;