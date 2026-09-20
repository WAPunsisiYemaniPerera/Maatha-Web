import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, getDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import MOHLayout from '../../components/MOHLayout';
import ModalPortal from '../../components/ModalPortal';
import { DISTRICTS, getMohAreas, findDistrictByMohArea } from '../../data/sriLankaLocations';
import { isValidEmail, isValidNIC, checkEmailUniqueness, checkNICUniqueness, evaluatePasswordStrength, formatAuthError } from '../../utils/securityValidators';
import PasswordSecurityField from '../../components/PasswordSecurityField';

const AddMidwife = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    nic: '',
    phone: '',
    email: '',
    employeeId: '',
    district: 'Colombo',
    mohOffice: 'Colombo', 
    serviceArea: '',
    gnDivisions: '',
    password: ''
  });

  const [midwives, setMidwives] = useState([]);
  const [phmAreas, setPhmAreas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [editingId, setEditingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [useCustomArea, setUseCustomArea] = useState(false);

  const showToast = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  // Load logged-in MOH Admin details
  useEffect(() => {
    const loadAdminData = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, "moh_admins", user.uid));
          if (docSnap.exists()) {
            const data = docSnap.data();
            const adminDistrict = data.district || findDistrictByMohArea(data.mohArea) || 'Colombo';
            const adminMoh = data.mohArea || 'Colombo';
            setFormData(prev => ({
              ...prev,
              district: adminDistrict,
              mohOffice: adminMoh
            }));
          }
        } catch (err) {
          console.error("Error loading admin area:", err);
        }
      }
    };
    loadAdminData();
  }, []);

  // Fetch midwives & PHM areas for the currently active MOH office
  const fetchData = async () => {
    try {
      const [midSnap, areasSnap] = await Promise.all([
        getDocs(query(collection(db, "midwives"), where("mohArea", "==", formData.mohOffice))),
        getDocs(query(collection(db, "phm_areas"), where("mohArea", "==", formData.mohOffice)))
      ]);

      const midwifeList = midSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMidwives(midwifeList);

      const areaList = areasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPhmAreas(areaList);
    } catch (err) {
      console.error("Error fetching MOH data:", err);
    }
  };

  useEffect(() => { 
    if (formData.mohOffice) {
      fetchData(); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.mohOffice]);

  // Map of PHM area names to assigned midwives
  const areaAssignmentMap = useMemo(() => {
    const map = {};
    midwives.forEach(m => {
      if (m.serviceArea) {
        map[m.serviceArea.trim().toLowerCase()] = m;
      }
    });
    return map;
  }, [midwives]);

  // Find if currently selected service area is assigned to someone else
  const activeAreaAssignedTo = useMemo(() => {
    if (!formData.serviceArea) return null;
    const clean = formData.serviceArea.trim().toLowerCase();
    const assigned = areaAssignmentMap[clean];
    if (assigned && assigned.id !== editingId) {
      return assigned.fullName;
    }
    return null;
  }, [formData.serviceArea, areaAssignmentMap, editingId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'district') {
      const mohs = getMohAreas(value);
      setFormData(prev => ({
        ...prev,
        district: value,
        mohOffice: mohs.length > 0 ? mohs[0] : '',
        serviceArea: '',
        gnDivisions: ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // When MOH changes, reset area
  const handleMohChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      mohOffice: val,
      serviceArea: '',
      gnDivisions: ''
    }));
  };

  // When PHM area is selected from dropdown
  const handlePHMAreaSelect = (e) => {
    const selectedAreaName = e.target.value;
    if (selectedAreaName === '__CUSTOM__') {
      setUseCustomArea(true);
      return;
    }

    setUseCustomArea(false);
    const chosenArea = phmAreas.find(a => a.areaName === selectedAreaName);
    setFormData(prev => ({
      ...prev,
      serviceArea: selectedAreaName,
      gnDivisions: chosenArea?.gnDivisions || prev.gnDivisions
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.district || !formData.mohOffice) {
      showToast("කරුණාකර දිස්ත්‍රික්කය සහ MOH ප්‍රදේශය තෝරන්න.", 'error');
      return;
    }

    const cleanNIC = (formData.nic || '').trim().toUpperCase();
    const cleanEmail = (formData.email || '').trim().toLowerCase();
    const cleanArea = (formData.serviceArea || '').trim();

    if (!cleanNIC) {
      showToast("කරුණාකර ජාතික හැඳුනුම්පත් අංකය (NIC) ඇතුළත් කරන්න", 'error');
      return;
    }

    if (!isValidNIC(cleanNIC)) {
      showToast("වලංගු ජාතික හැඳුනුම්පත් අංකයක් (NIC) ඇතුළත් කරන්න (උදා: 198512345678 හෝ 851234567V)", 'error');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      showToast("වලංගු ඊමේල් ලිපිනයක් ඇතුළත් කරන්න (Please enter a valid email address)", 'error');
      return;
    }

    if (!cleanArea) {
      showToast("කරුණාකර PHM සේවා කොට්ඨාසය තෝරන්න හෝ ඇතුළත් කරන්න.", 'error');
      return;
    }

    setLoading(true);
    try {
      // 1. Strict NIC Uniqueness Check across the entire health system
      const nicCheck = await checkNICUniqueness(db, cleanNIC, editingId);
      if (!nicCheck.isUnique) {
        showToast(`මෙම ජාතික හැඳුනුම්පත් අංකය (NIC: ${cleanNIC}) දැනටමත් ${nicCheck.role} සඳහා ලියාපදිංචි කර ඇත. එක් අයෙකුට ලියාපදිංචි විය හැක්කේ එක් වරක් පමණි.`, 'error');
        setLoading(false);
        return;
      }

      // 2. Strict Email Uniqueness Check across the entire health system
      const emailAvailable = await checkEmailUniqueness(db, cleanEmail, editingId);
      if (!emailAvailable) {
        showToast(`මෙම ඊමේල් ලිපිනය (${cleanEmail}) දැනටමත් පද්ධතියේ ලියාපදිංචි කර ඇත. කරුණාකර වෙනත් ඊමේල් ලිපිනයක් භාවිතා කරන්න.`, 'error');
        setLoading(false);
        return;
      }

      if (editingId) {
        await updateDoc(doc(db, "midwives", editingId), {
          fullName: formData.fullName.trim(),
          nic: cleanNIC,
          phone: formData.phone.trim(),
          district: formData.district,
          mohArea: formData.mohOffice,
          serviceArea: cleanArea,
          gnDivisions: (formData.gnDivisions || '').trim(),
          employeeId: formData.employeeId.trim(),
          updatedAt: new Date()
        });
        showToast("නිලධාරිනියගේ විස්තර සාර්ථකව යාවත්කාලීන කරන ලදී! (Details Updated)");
      } else {
        // Strong Password Validation
        const strength = evaluatePasswordStrength(formData.password);
        if (strength.score < 3 || !strength.criteria.hasMinLength) {
          showToast("මුරපදය ප්‍රමාණවත් තරම් ශක්තිමත් නැත. අවම වශයෙන් අකුරු 8ක්, ලොකු/කුඩා අකුරු, අංක සහ විශේෂ ලක්ෂණ ඇතුළත් කරන්න.", 'error');
          setLoading(false);
          return;
        }

        // Firebase Auth secure hashing with scrypt
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, formData.password);
        const uid = userCredential.user.uid;

        // Secure User Document (Strictly NO plaintext password)
        await setDoc(doc(db, "users", uid), {
          email: cleanEmail,
          role: "midwife",
          fullName: formData.fullName.trim(),
          nic: cleanNIC,
          mohArea: formData.mohOffice,
          uid: uid,
          createdAt: new Date()
        });

        // Midwife Profile Document (Strictly NO plaintext password)
        await setDoc(doc(db, "midwives", uid), {
          fullName: formData.fullName.trim(),
          nic: cleanNIC,
          phone: formData.phone.trim(),
          email: cleanEmail,
          employeeId: formData.employeeId.trim(),
          district: formData.district,
          mohArea: formData.mohOffice,
          serviceArea: cleanArea,
          gnDivisions: (formData.gnDivisions || '').trim(),
          midwifeId: uid,
          createdAt: new Date()
        });
        showToast("නිලධාරිනිය සාර්ථකව පද්ධතියට එක් කරන ලදී! (Midwife Registered)");
      }

      setFormData(prev => ({ 
        ...prev, 
        fullName: '', 
        nic: '', 
        phone: '', 
        email: '', 
        employeeId: '', 
        serviceArea: '', 
        gnDivisions: '', 
        password: '' 
      }));
      setUseCustomArea(false);
      setEditingId(null);
      fetchData();
    } catch (error) {
      showToast("දෝෂයක් සිදු විය: " + formatAuthError(error), 'error');
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, "midwives", showDeleteModal));
        await deleteDoc(doc(db, "users", showDeleteModal));
        fetchData();
        showToast("නිලධාරිනිය පද්ධතියෙන් ඉවත් කරන ලදී. (Removed)");
        setShowDeleteModal(null);
      } catch (err) {
        showToast("දෝෂයක් සිදු විය: " + err.message, 'error');
      }
    }
  };

  const startEdit = (midwife) => {
    const midwifeDistrict = midwife.district || findDistrictByMohArea(midwife.mohArea) || formData.district;
    setEditingId(midwife.id);
    setFormData({ 
      ...midwife, 
      district: midwifeDistrict,
      mohOffice: midwife.mohArea,
      password: '*****' 
    });
    // Check if the service area is not in defined phmAreas
    const exists = phmAreas.some(a => a.areaName === midwife.serviceArea);
    if (!exists && midwife.serviceArea) {
      setUseCustomArea(true);
    } else {
      setUseCustomArea(false);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const availableMohAreas = getMohAreas(formData.district);

  return (
    <MOHLayout>
      {/* Popups & Modals */}
      {showDeleteModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/75 backdrop-blur-md p-4 flex min-h-screen items-center justify-center animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setShowDeleteModal(null)} aria-hidden="true" />
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center z-10 my-auto animate-in zoom-in-95 duration-200">
              <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-inner">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">නිලධාරිනිය ඉවත් කරන්නද?</h3>
              <p className="font-bold text-slate-400 text-xs mt-1 mb-6">Are you sure you want to remove this midwife?</p>
              <div className="flex space-x-3">
                <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase transition-all">නැත (Cancel)</button>
                <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-red-200 transition-all">ඔව් (Remove)</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {message && (
        <div className={`fixed top-5 right-5 z-[120] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-right duration-300 ${
          messageType === 'error' ? 'bg-red-900 border-l-4 border-red-500' : 'bg-slate-900 border-l-4 border-emerald-500'
        }`}>
          <div className={`rounded-full p-1 ${messageType === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {messageType === 'error' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              )}
            </svg>
          </div>
          <p className="text-sm font-bold tracking-tight">{message}</p>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Form Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border-t-4 border-emerald-600 border border-slate-100">
          <div className="mb-6 border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                {editingId ? "නිලධාරිනියගේ විස්තර සංස්කරණය" : "අලුත් පවුල් සෞඛ්‍ය සේවා නිලධාරිනියක (PHM) ලියාපදිංචිය"}
              </h2>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                Official Public Health Midwife (PHM) Profile & Jurisdiction Registration
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{formData.district} &gt; {formData.mohOffice}</span>
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Personal / Identification */}
              <div className="space-y-4">
                <InputField label="සම්පූර්ණ නම" sub="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="උදා: ඩබ්. එම්. සුනේත්‍රා පෙරේරා මහත්මිය" required />
                <InputField label="ජාතික හැඳුනුම්පත් අංකය" sub="NIC Number" name="nic" value={formData.nic} onChange={handleChange} placeholder="උදා: 198654321098 / 865432109V" required disabled={!!editingId} />
                <InputField label="දුරකථන අංකය" sub="Phone Number" name="phone" value={formData.phone} onChange={handleChange} placeholder="උදා: 0771234567" required />
                <InputField label="සේවක / නිල හැඳුනුම් අංකය" sub="PHM Employee ID" name="employeeId" value={formData.employeeId} onChange={handleChange} placeholder="උදා: PHM-HOM-042" required />

                {/* District Selector */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">
                    දිස්ත්‍රික්කය <span className="text-[10px] text-slate-400 font-normal ml-1">(District)</span>
                  </label>
                  <select
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs sm:text-sm font-semibold text-slate-800 transition-all"
                  >
                    {DISTRICTS.map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Right Column: Work & PHM Service Assignment */}
              <div className="space-y-4">
                <InputField label="නිල විද්‍යුත් තැපෑල (App Login)" sub="Official Email Address" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="උදා: sunethra.phm@maatha.lk" required disabled={!!editingId} />

                {/* MOH Area Selector */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">
                    MOH බලප්‍රදේශය <span className="text-[10px] text-slate-400 font-normal ml-1">(MOH Division)</span>
                  </label>
                  <select
                    name="mohOffice"
                    value={formData.mohOffice}
                    onChange={handleMohChange}
                    required
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs sm:text-sm font-semibold text-slate-800 transition-all"
                  >
                    {availableMohAreas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>

                {/* Smart PHM Service Area Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                      PHM සේවා කොට්ඨාසය <span className="text-red-500">*</span>
                      <span className="text-[10px] text-slate-400 font-normal ml-1">(Public Health Midwife Area)</span>
                    </label>
                    <Link
                      to="/moh-admin/phm-areas"
                      className="text-emerald-700 hover:text-emerald-900 font-bold text-[11px] underline flex items-center gap-1"
                    >
                      <span>📍 කොට්ඨාස කළමනාකරණය</span>
                    </Link>
                  </div>

                  {!useCustomArea ? (
                    <div className="space-y-2">
                      <select
                        name="serviceArea"
                        value={formData.serviceArea}
                        onChange={handlePHMAreaSelect}
                        required
                        className={`w-full p-3 bg-slate-50 border rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs sm:text-sm font-bold text-slate-800 transition-all ${
                          activeAreaAssignedTo ? 'border-amber-400 bg-amber-50/40' : 'border-slate-200'
                        }`}
                      >
                        <option value="">-- PHM කොට්ඨාසයක් තෝරන්න (Select PHM Division) --</option>
                        {phmAreas.length > 0 && (
                          <optgroup label={`📌 ${formData.mohOffice} MOH හි ලියාපදිංචි කොට්ඨාස`}>
                            {phmAreas.map(area => {
                              const assignedTo = areaAssignmentMap[area.areaName.toLowerCase()];
                              const isCurrentEditing = assignedTo && assignedTo.id === editingId;
                              const isAssignedToOther = assignedTo && !isCurrentEditing;

                              return (
                                <option key={area.id} value={area.areaName}>
                                  {isAssignedToOther
                                    ? `⚠️ ${area.areaName} ${area.areaCode ? `[${area.areaCode}]` : ''} — (දැනට පවරා ඇත: ${assignedTo.fullName})`
                                    : `✅ ${area.areaName} ${area.areaCode ? `[${area.areaCode}]` : ''} — (පුරප්පාඩුයි / Available)`}
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                        <option value="__CUSTOM__">➕ වෙනත් අලුත් කොට්ඨාසයක් ඇතුළත් කරන්න (Enter Custom Area)...</option>
                      </select>

                      {phmAreas.length === 0 && (
                        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium">
                          💡 <strong>{formData.mohOffice}</strong> MOH සඳහා තවමත් PHM කොට්ඨාස සකස් කර නොමැත.{' '}
                          <Link to="/moh-admin/phm-areas" className="font-bold underline text-emerald-700">
                            මෙහි ක්ලික් කර කොට්ඨාස සකස් කරන්න
                          </Link>{' '}
                          හෝ ඉහතින් වෙනත් නමක් ඇතුළත් කරන්න.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          name="serviceArea"
                          placeholder="උදා: 602-B Homagama Town / Pitipana"
                          value={formData.serviceArea}
                          onChange={handleChange}
                          required
                          className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setUseCustomArea(false)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold shrink-0 transition-all"
                        >
                          ✕ List එකට යන්න
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Active Area Assignment Warning Banner */}
                  {activeAreaAssignedTo && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 font-medium flex items-start gap-2 animate-in fade-in duration-200">
                      <span className="text-base leading-none">⚠️</span>
                      <div>
                        <strong className="font-bold">අවධානයට:</strong> මෙම PHM කොට්ඨාසය දැනටමත්{' '}
                        <strong className="font-bold text-amber-950">{activeAreaAssignedTo}</strong> නිලධාරිනියට පවරා ඇත.
                        එකම කොට්ඨාසයට නිලධාරිනියන් දෙදෙනෙකු පත් කිරීම මඟින් Mobile App දත්ත පටලැවිලි ඇති විය හැක.
                      </div>
                    </div>
                  )}
                </div>

                {/* GN Divisions */}
                <InputField 
                  label="ආවරණය වන ග්‍රාම නිලධාරී වසම්" 
                  sub="GN Divisions (Comma separated)" 
                  name="gnDivisions" 
                  value={formData.gnDivisions} 
                  onChange={handleChange} 
                  placeholder="උදා: Pitipana North, Pitipana South, Moragahahena"
                  required 
                />
              </div>
            </div>

            {/* Password Field (Only on creation) */}
            {!editingId && (
              <div className="border-t border-slate-100 pt-5">
                <div className="max-w-xl">
                  <PasswordSecurityField
                    label="පද්ධති පිවිසුම් මුරපදය (Security Login Password)"
                    value={formData.password}
                    onChange={handleChange}
                    name="password"
                    placeholder="ශක්තිමත් මුරපදයක් ඇතුළත් කරන්න (Mobile App Login)"
                    required
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button 
                type="submit" 
                disabled={loading} 
                className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-950/20 active:scale-98 transition-all uppercase tracking-wider text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? "ක්‍රියාත්මක වෙමින්... (Processing)" : (editingId ? "💾 යාවත්කාලීන කරන්න (Update Details)" : "➕ නිලධාරිනිය පද්ධතියට එක් කරන්න (Register Midwife)")}
              </button>
              {editingId && (
                <button 
                  type="button" 
                  onClick={() => { 
                    setEditingId(null); 
                    setFormData(prev => ({ ...prev, fullName:'', nic:'', phone:'', email:'', employeeId:'', serviceArea:'', gnDivisions:'', password:'' })); 
                    setUseCustomArea(false);
                  }} 
                  className="px-6 py-4 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all text-xs uppercase"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Registered Midwives Table List */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                {formData.mohOffice} ප්‍රදේශයේ ලියාපදිංචි පවුල් සෞඛ්‍ය සේවා නිලධාරිනියන්
              </h2>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                Registered PHM Officers in {formData.mohOffice} MOH Division ({formData.district})
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-100 self-start sm:self-auto">
              මුළු නිලධාරිනියන්: {midwives.length}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4">නම හා සේවක අංකය (Name & ID)</th>
                  <th className="p-4">ජාතික හැඳුනුම්පත (NIC)</th>
                  <th className="p-4">MOH ප්‍රදේශය (MOH Area)</th>
                  <th className="p-4">පවරා ඇති PHM කොට්ඨාසය (Jurisdiction)</th>
                  <th className="p-4 text-center">ක්‍රියාකාරකම් (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {midwives.length > 0 ? midwives.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{m.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-bold">{m.employeeId || 'ID —'} &bull; {m.phone || 'Phone —'}</div>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-600 text-xs">
                      {m.nic || '—'}
                    </td>
                    <td className="p-4 text-xs font-semibold text-emerald-700">
                      {m.mohArea}
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-100 inline-block">
                        📍 {m.serviceArea || 'සාමාන්‍ය (General)'}
                      </span>
                      {m.gnDivisions && (
                        <div className="text-[10px] text-slate-400 mt-1 truncate max-w-xs" title={m.gnDivisions}>
                          GN: {m.gnDivisions}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          onClick={() => startEdit(m)} 
                          title="සංස්කරණය කරන්න" 
                          className="p-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        </button>
                        <button 
                          onClick={() => setShowDeleteModal(m.id)} 
                          title="ඉවත් කරන්න" 
                          className="p-2 bg-slate-100 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-400 italic">
                      {formData.mohOffice} ප්‍රදේශය සඳහා තවමත් නිලධාරිනියන් ලියාපදිංචි කර නොමැත.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MOHLayout>
  );
};

const InputField = ({ label, sub, ...props }) => (
  <div>
    <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">
      {label} <span className="text-[10px] text-slate-400 font-normal ml-1">({sub})</span>
    </label>
    <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-xs sm:text-sm font-semibold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400" {...props} />
  </div>
);

export default AddMidwife;