import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import AdminLayout from '../../components/AdminLayout';
import { DISTRICTS } from '../../data/sriLankaLocations';
import { isValidEmail, isValidNIC, checkEmailUniqueness, checkNICUniqueness, evaluatePasswordStrength, formatAuthError } from '../../utils/securityValidators';
import PasswordSecurityField from '../../components/PasswordSecurityField';

const HOSPITAL_TYPES = [
  'National Hospital (ජාතික රෝහල)',
  'Teaching Hospital (ශික්ෂණ රෝහල)',
  'Provincial General Hospital (පළාත් මහා රෝහල)',
  'District General Hospital (දිස්ත්‍රික් මහා රෝහල)',
  'Base Hospital - Type A (මූලික රෝහල - A)',
  'Base Hospital - Type B (මූලික රෝහල - B)',
  'Specialized Women / Maternity Hospital (විශේෂිත මාතෘ රෝහල)',
  'Divisional Hospital (ප්‍රාදේශීය රෝහල)'
];

const ADMIN_DESIGNATIONS = [
  'Hospital Director (රෝහල් අධ්‍යක්ෂ)',
  'Medical Superintendent (වෛද්‍ය අධිකාරී - MS)',
  'Medical Officer In Charge (ස්ථානභාර වෛද්‍ය නිලධාරී - MOIC)',
  'Administrative Officer (පරිපාලන නිලධාරී)',
  'Lead Obstetrician & Gynaecologist (ප්‍රසව හා නාරිවේද විශේෂඥ)'
];

const AddHospitalAdmin = () => {
  const initialFormState = {
    hospitalName: '',
    hospitalType: 'District General Hospital (දිස්ත්‍රික් මහා රෝහල)',
    hospitalCode: '',
    district: '',
    city: '',
    hospitalAddress: '',
    hospitalPhone: '',
    maternityWardCapacity: '',
    hasNicu: 'Yes',
    hasBloodBank: 'Yes',
    hasLabourRoom: 'Yes',
    adminName: '',
    adminNic: '',
    slmcNumber: '',
    designation: 'Medical Superintendent (වෛද්‍ය අධිකාරී - MS)',
    gender: 'Male',
    adminPhone: '',
    email: '',
    status: 'Active',
    password: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [editingId, setEditingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null); 
  const [viewingHospital, setViewingHospital] = useState(null);
  const [tableDistrictFilter, setTableDistrictFilter] = useState('All');
  const [tableTypeFilter, setTableTypeFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchHospitalAdmins = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "hospital_admins"));
      const adminData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdmins(adminData);
    } catch (error) {
      console.error("Error fetching hospital admins:", error);
    }
  };

  useEffect(() => {
    fetchHospitalAdmins();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const showToast = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.district) {
      showToast("කරුණාකර දිස්ත්‍රික්කය තෝරන්න (Please select a District)", 'error');
      return;
    }

    const cleanNIC = (formData.adminNic || '').trim().toUpperCase();
    const cleanEmail = (formData.email || '').trim().toLowerCase();

    if (!cleanNIC) {
      showToast("කරුණාකර පාලකවරයාගේ ජාතික හැඳුනුම්පත් අංකය (NIC) ඇතුළත් කරන්න", 'error');
      return;
    }

    if (!isValidNIC(cleanNIC)) {
      showToast("වලංගු ජාතික හැඳුනුම්පත් අංකයක් (NIC) ඇතුළත් කරන්න (උදා: 198012345678 හෝ 801234567V)", 'error');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      showToast("වලංගු ඊමේල් ලිපිනයක් ඇතුළත් කරන්න (Please enter a valid email address)", 'error');
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
        await updateDoc(doc(db, "hospital_admins", editingId), {
          hospitalName: formData.hospitalName.trim(),
          hospitalType: formData.hospitalType,
          hospitalCode: formData.hospitalCode.trim(),
          district: formData.district,
          city: formData.city.trim(),
          hospitalAddress: formData.hospitalAddress.trim(),
          hospitalPhone: formData.hospitalPhone.trim(),
          maternityWardCapacity: formData.maternityWardCapacity,
          hasNicu: formData.hasNicu,
          hasBloodBank: formData.hasBloodBank,
          hasLabourRoom: formData.hasLabourRoom,
          fullName: formData.adminName.trim(),
          adminNic: cleanNIC,
          slmcNumber: formData.slmcNumber.trim(),
          designation: formData.designation,
          gender: formData.gender,
          adminPhone: formData.adminPhone.trim(),
          status: formData.status,
          updatedAt: new Date()
        });
        showToast("රෝහල් සහ පාලක විස්තර සාර්ථකව යාවත්කාලීන කරන ලදී! (Details Updated Successfully)");
      } else {
        // Password Strength Validation (Salted & Hashed by Firebase Auth)
        const strength = evaluatePasswordStrength(formData.password);
        if (strength.score < 3 || !strength.criteria.hasMinLength) {
          showToast("මුරපදය ප්‍රමාණවත් තරම් ශක්තිමත් නැත. අවම වශයෙන් අකුරු 8ක්, ලොකු/කුඩා අකුරු, අංක සහ විශේෂ ලක්ෂණ ඇතුළත් කරන්න.", 'error');
          setLoading(false);
          return;
        }

        // Create Firebase Auth user (Firebase Auth securely salts & hashes with scrypt)
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, formData.password);
        const uid = userCredential.user.uid;

        // Secure User Document (Strictly NO plaintext password)
        await setDoc(doc(db, "users", uid), {
          email: cleanEmail,
          role: "hospital_admin",
          fullName: formData.adminName.trim(),
          hospitalName: formData.hospitalName.trim(),
          nic: cleanNIC,
          uid: uid,
          createdAt: new Date()
        });

        // Hospital Administrator Profile (Strictly NO plaintext password)
        await setDoc(doc(db, "hospital_admins", uid), {
          hospitalName: formData.hospitalName.trim(),
          hospitalType: formData.hospitalType,
          hospitalCode: formData.hospitalCode.trim() || `HOSP-${formData.district.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
          district: formData.district,
          city: formData.city.trim(),
          hospitalAddress: formData.hospitalAddress.trim(),
          hospitalPhone: formData.hospitalPhone.trim(),
          maternityWardCapacity: formData.maternityWardCapacity || '50',
          hasNicu: formData.hasNicu,
          hasBloodBank: formData.hasBloodBank,
          hasLabourRoom: formData.hasLabourRoom,
          fullName: formData.adminName.trim(),
          adminNic: cleanNIC,
          slmcNumber: formData.slmcNumber.trim(),
          designation: formData.designation,
          gender: formData.gender,
          adminPhone: formData.adminPhone.trim(),
          email: cleanEmail,
          status: formData.status || 'Active',
          adminId: uid,
          createdAt: new Date()
        });
        showToast("රෝහල සහ පාලකවරයා සාර්ථකව පද්ධතියට එක් කරන ලදී! (Hospital & Admin Registered)");
      }

      setFormData(initialFormState);
      setEditingId(null);
      fetchHospitalAdmins();
    } catch (error) {
      showToast("දෝෂයක් සිදු විය: " + formatAuthError(error), 'error');
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, "hospital_admins", showDeleteModal));
        await deleteDoc(doc(db, "users", showDeleteModal));
        fetchHospitalAdmins();
        showToast("රෝහල සහ පාලකවරයා පද්ධතියෙන් ඉවත් කරන ලදී. (Hospital & Admin Removed)");
        setShowDeleteModal(null);
      } catch (error) {
        showToast("ඉවත් කිරීම අසාර්ථකයි: " + error.message, 'error');
      }
    }
  };

  const startEdit = (admin) => {
    setEditingId(admin.id);
    setFormData({
      hospitalName: admin.hospitalName || '',
      hospitalType: admin.hospitalType || 'District General Hospital (දිස්ත්‍රික් මහා රෝහල)',
      hospitalCode: admin.hospitalCode || '',
      district: admin.district || '',
      city: admin.city || '',
      hospitalAddress: admin.hospitalAddress || '',
      hospitalPhone: admin.hospitalPhone || '',
      maternityWardCapacity: admin.maternityWardCapacity || '',
      hasNicu: admin.hasNicu || 'Yes',
      hasBloodBank: admin.hasBloodBank || 'Yes',
      hasLabourRoom: admin.hasLabourRoom || 'Yes',
      adminName: admin.fullName || '',
      adminNic: admin.adminNic || '',
      slmcNumber: admin.slmcNumber || '',
      designation: admin.designation || 'Medical Superintendent (වෛද්‍ය අධිකාරී - MS)',
      gender: admin.gender || 'Male',
      adminPhone: admin.adminPhone || '',
      email: admin.email || '',
      status: admin.status || 'Active',
      password: '••••••••'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormState);
  };

  const filteredAdmins = admins.filter(admin => {
    const matchesDistrict = tableDistrictFilter === 'All' || admin.district === tableDistrictFilter;
    const matchesType = tableTypeFilter === 'All' || admin.hospitalType === tableTypeFilter;

    if (!searchTerm.trim()) return matchesDistrict && matchesType;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (admin.hospitalName || '').toLowerCase().includes(term) ||
      (admin.hospitalCode || '').toLowerCase().includes(term) ||
      (admin.fullName || '').toLowerCase().includes(term) ||
      (admin.adminNic || '').toLowerCase().includes(term) ||
      (admin.email || '').toLowerCase().includes(term);

    return matchesDistrict && matchesType && matchesSearch;
  });

  return (
    <AdminLayout>
      {/* Full Hospital & Director Dossier Modal */}
      {viewingHospital && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 text-white relative">
              <button 
                onClick={() => setViewingHospital(null)}
                className="absolute top-5 right-5 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl shadow-inner">
                  🏥
                </div>
                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-black uppercase tracking-wider mb-1 border border-blue-400/30">
                    {viewingHospital.hospitalType || 'Hospital'}
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">{viewingHospital.hospitalName}</h3>
                  <p className="text-xs text-blue-100 font-medium">Code: {viewingHospital.hospitalCode || 'HOSP-LK'} | District: {viewingHospital.district}</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Facilities Badge Row */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-100">
                  <span className="text-[10px] font-black text-blue-500 uppercase block">මාතෘ ඇඳන් ධාරිතාව</span>
                  <span className="text-xl font-black text-blue-900 mt-0.5 block">{viewingHospital.maternityWardCapacity || '50+'} ඇඳන්</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-gray-400 uppercase block">NICU / PICU ඒකකය</span>
                  <span className={`inline-block text-xs font-bold mt-1 px-2.5 py-0.5 rounded-full ${
                    viewingHospital.hasNicu === 'Yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {viewingHospital.hasNicu === 'Yes' ? '✅ ඇත (Available)' : 'නැත'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black text-gray-400 uppercase block">රුධිර බැංකුව (Blood Bank)</span>
                  <span className={`inline-block text-xs font-bold mt-1 px-2.5 py-0.5 rounded-full ${
                    viewingHospital.hasBloodBank === 'Yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {viewingHospital.hasBloodBank === 'Yes' ? '✅ ඇත (Available)' : 'නැත'}
                  </span>
                </div>
              </div>

              {/* Hospital Location Section */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  රෝහලේ පිහිටීම සහ සම්බන්ධීකරණය (Hospital Location & Contact)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 font-bold block">දිස්ත්‍රික්කය සහ නගරය:</span>
                    <span className="font-bold text-gray-800">{viewingHospital.city ? `${viewingHospital.city}, ` : ''}{viewingHospital.district}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">රෝහල් ප්‍රධාන දුරකථන අංකය:</span>
                    <a href={`tel:${viewingHospital.hospitalPhone}`} className="font-bold text-blue-600 hover:underline">{viewingHospital.hospitalPhone || '—'}</a>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-gray-400 font-bold block">රෝහල් නිල ලිපිනය:</span>
                    <span className="font-semibold text-gray-700">{viewingHospital.hospitalAddress || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Hospital Administrator Profile */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  පරිපාලක / අධ්‍යක්ෂක තොරතුරු (Administrator / Director Dossier)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 font-bold block">පාලකවරයාගේ නම:</span>
                    <span className="font-bold text-gray-800">{viewingHospital.fullName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">ජාතික හැඳුනුම්පත (NIC):</span>
                    <span className="font-bold text-emerald-700 font-mono">{viewingHospital.adminNic || 'නොදක්වා ඇත'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">තනතුර (Designation):</span>
                    <span className="font-semibold text-gray-700">{viewingHospital.designation || 'Medical Superintendent'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">SLMC අංකය:</span>
                    <span className="font-mono text-gray-700">{viewingHospital.slmcNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">ජංගම දුරකථන අංකය:</span>
                    <a href={`tel:${viewingHospital.adminPhone}`} className="font-bold text-blue-600 hover:underline">{viewingHospital.adminPhone || '—'}</a>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">රාජකාරි ඊමේල් ලිපිනය:</span>
                    <a href={`mailto:${viewingHospital.email}`} className="font-bold text-blue-600 hover:underline">{viewingHospital.email}</a>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
              <button 
                onClick={() => {
                  const hospToEdit = viewingHospital;
                  setViewingHospital(null);
                  startEdit(hospToEdit);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                සංස්කරණය (Edit Profile)
              </button>
              <button 
                onClick={() => setViewingHospital(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-all"
              >
                වසන්න (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-center animate-in zoom-in-95 duration-200">
            <div className="bg-red-100 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-inner">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800">රෝහල් පාලකවරයා ඉවත් කරන්නද?</h3>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-1 mb-6">Are you sure you want to remove this hospital administrator?</p>
            <div className="flex space-x-3">
              <button onClick={() => setShowDeleteModal(null)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase transition-all">
                නැත (Cancel)
              </button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-red-200 transition-all">
                ඔව් (Delete)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {message && (
        <div className={`fixed top-5 right-5 z-[130] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-4 animate-in slide-in-from-right duration-500 ${
          messageType === 'error' ? 'bg-red-900 border-l-4 border-red-500' : 'bg-slate-900 border-l-4 border-blue-500'
        }`}>
          <div className={`rounded-full p-1.5 ${messageType === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
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

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Title Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-800 via-indigo-900 to-slate-900 text-white p-8 rounded-3xl shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-2 border border-blue-400/20">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              Hospital Management & Institutional Registry
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">රෝහල් කළමනාකරණය සහ ලියාපදිංචිය</h1>
            <p className="text-blue-100/70 text-xs font-medium mt-1">
              දිවයිනේ රෝහල් ජාලය, මාතෘ වාට්ටු ධාරිතාව, සහ රෝහල් පරිපාලක අධ්‍යක්ෂවරුන්ගේ සම්පූර්ණ තොරතුරු (NIC, SLMC) කළමනාකරණය
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] font-black text-blue-200 uppercase tracking-wider block">ලියාපදිංචි රෝහල්</span>
              <span className="text-2xl font-black text-white">{admins.length}</span>
            </div>
          </div>
        </div>

        {/* Registration & Edit Form */}
        <div className="bg-white p-8 rounded-3xl shadow-md border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500"></div>

          <div className="mb-6 border-b border-gray-100 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {editingId ? "රෝහල් සහ පාලක තොරතුරු සංස්කරණය" : "අලුත් රෝහලක් සහ පරිපාලකයෙකු ලියාපදිංචි කිරීම"}
              </h2>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                {editingId ? "Update Hospital & Administrator Dossier" : "Register New Hospital & Medical Administrator"}
              </p>
            </div>
            {editingId && (
              <button 
                onClick={cancelEdit}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-all"
              >
                සංස්කරණය අවලංගු කරන්න (Cancel)
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-8">
            {/* Section 1: Hospital Profile */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-sm font-bold">1</div>
                <h3 className="text-sm font-bold text-gray-800">රෝහලේ මූලික තොරතුරු සහ වර්ගීකරණය (Hospital Profile & Classification)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Hospital Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    රෝහලේ නම (Hospital Name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="hospitalName"
                    placeholder="රෝහලේ නම ඇතුළත් කරන්න"
                    value={formData.hospitalName}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>

                {/* Hospital Type */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    රෝහල් වර්ගය (Hospital Type) <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="hospitalType"
                    value={formData.hospitalType}
                    onChange={handleChange}
                    required
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm font-medium"
                  >
                    {HOSPITAL_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Hospital Code */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    සෞඛ්‍ය අමාත්‍යාංශ රෝහල් කේතය (Hospital Code)
                  </label>
                  <input
                    type="text"
                    name="hospitalCode"
                    placeholder="රෝහල් කේතය (විකල්ප)"
                    value={formData.hospitalCode}
                    onChange={handleChange}
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium font-mono"
                  />
                </div>

                {/* District */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    දිස්ත්‍රික්කය (District) <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    required
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm font-medium"
                  >
                    <option value="">-- දිස්ත්‍රික්කය තෝරන්න --</option>
                    {DISTRICTS.map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    නගරය / ප්‍රදේශය (City / Town)
                  </label>
                  <input
                    type="text"
                    name="city"
                    placeholder="නගරය"
                    value={formData.city}
                    onChange={handleChange}
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>

                {/* Hospital General Phone */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    රෝහල් ප්‍රධාන දුරකථන අංකය (General Line)
                  </label>
                  <input
                    type="tel"
                    name="hospitalPhone"
                    placeholder="0XX XXXXXXX"
                    value={formData.hospitalPhone}
                    onChange={handleChange}
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>

                {/* Hospital Physical Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    රෝහලේ නිල ලිපිනය (Official Hospital Address)
                  </label>
                  <input
                    type="text"
                    name="hospitalAddress"
                    placeholder="රෝහලේ ලිපිනය ඇතුළත් කරන්න"
                    value={formData.hospitalAddress}
                    onChange={handleChange}
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Maternity & Health Facilities */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center text-sm font-bold">2</div>
                <h3 className="text-sm font-bold text-gray-800">මාතෘ සහ සෞඛ්‍ය පහසුකම් (Maternal Healthcare Facilities)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Maternity Bed Capacity */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    මාතෘ වාට්ටු ධාරිතාව (Maternity Beds)
                  </label>
                  <input
                    type="number"
                    name="maternityWardCapacity"
                    placeholder="ඇඳන් ගණන"
                    value={formData.maternityWardCapacity}
                    onChange={handleChange}
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>

                {/* NICU Facility */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    NICU / ළදරු දැඩි සත්කාර
                  </label>
                  <select
                    name="hasNicu"
                    value={formData.hasNicu}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm font-medium"
                  >
                    <option value="Yes">ඇත (Yes)</option>
                    <option value="No">නැත (No)</option>
                  </select>
                </div>

                {/* Blood Bank */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    රුධිර බැංකුව (Blood Bank)
                  </label>
                  <select
                    name="hasBloodBank"
                    value={formData.hasBloodBank}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm font-medium"
                  >
                    <option value="Yes">ඇත (Yes)</option>
                    <option value="No">නැත (No)</option>
                  </select>
                </div>

                {/* Labour Room */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ප්‍රසූති කාමර (Labour Room)
                  </label>
                  <select
                    name="hasLabourRoom"
                    value={formData.hasLabourRoom}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm font-medium"
                  >
                    <option value="Yes">ඇත (Yes)</option>
                    <option value="No">නැත (No)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Hospital Administrator / Director Profile */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-sm font-bold">3</div>
                <h3 className="text-sm font-bold text-gray-800">පරිපාලක / වෛද්‍ය අධ්‍යක්ෂක තොරතුරු (Administrator / Director Dossier)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Admin Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    පාලකවරයාගේ / අධ්‍යක්ෂකගේ නම (Full Name with Initials) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="adminName"
                    placeholder="පාලකවරයාගේ සම්පූර්ණ නම"
                    value={formData.adminName}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>

                {/* Admin NIC */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ජාතික හැඳුනුම්පත් අංකය (NIC No.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="adminNic"
                    placeholder="ජාතික හැඳුනුම්පත් අංකය (NIC)"
                    value={formData.adminNic}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium font-mono"
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    තනතුර (Designation / Role) <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    required
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm font-medium"
                  >
                    {ADMIN_DESIGNATIONS.map(desig => (
                      <option key={desig} value={desig}>{desig}</option>
                    ))}
                  </select>
                </div>

                {/* SLMC Reg No */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    SLMC ලියාපදිංචි අංකය (SLMC Reg No.)
                  </label>
                  <input
                    type="text"
                    name="slmcNumber"
                    placeholder="SLMC ලියාපදිංචි අංකය"
                    value={formData.slmcNumber}
                    onChange={handleChange}
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium font-mono"
                  />
                </div>

                {/* Admin Mobile Phone */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    පාලක ජංගම දුරකථන අංකය (Mobile Phone) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="adminPhone"
                    placeholder="07X XXXXXXX"
                    value={formData.adminPhone}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ස්ත්‍රී / පුරුෂ භාවය (Gender)
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm font-medium"
                  >
                    <option value="Male">පිරිමි (Male)</option>
                    <option value="Female">ගැහැණු (Female)</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    සේවා තත්ත්වය (Status)
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm font-medium"
                  >
                    <option value="Active">සක්‍රීය (Active)</option>
                    <option value="Maintenance">නඩත්තු වෙමින් (Maintenance)</option>
                    <option value="Inactive">අක්‍රීය (Inactive)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: System Login Credentials (Email & Password) */}
            <div className="space-y-4 bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-2 pb-2 border-b border-indigo-200/60">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">4</div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-800">පද්ධති පිවිසුම් ගිණුම් තොරතුරු (System Login & Access Credentials)</h3>
                  <p className="text-[11px] text-gray-500 font-medium">රෝහල් පරිපාලකවරයා පද්ධතියට ලොග් වීම සඳහා භාවිත කරන ඊමේල් ලිපිනය සහ ආරක්‍ෂිත මුරපදය</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Official Login Email */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    රාජකාරි පිවිසුම් ඊමේල් ලිපිනය (Official Login Email) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="director.hospital@health.gov.lk"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={!!editingId}
                    className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium ${
                      editingId ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-white border-gray-200 focus:border-blue-500 shadow-sm'
                    }`}
                  />
                  <p className="text-[10px] text-gray-500 font-semibold mt-1">
                    {editingId ? "ලියාපදිංචි කළ ඊමේල් ලිපිනය වෙනස් කළ නොහැක." : "මෙම ඊමේල් ලිපිනය පද්ධතියේ වෙනත් කිසිදු ගිණුමකට භාවිත කර නොතිබිය යුතුය."}
                  </p>
                </div>

                {/* Password Field (Only on creation) */}
                {!editingId ? (
                  <div>
                    <PasswordSecurityField
                      label="ආරම්භක මුරපදය (Initial Password)"
                      value={formData.password}
                      onChange={handleChange}
                      name="password"
                      placeholder="ශක්තිමත් මුරපදයක් ඇතුළත් කරන්න"
                      required
                    />
                  </div>
                ) : (
                  <div className="flex items-center p-3 bg-white rounded-xl border border-gray-200 text-xs text-gray-500">
                    🔒 මුරපදය සංස්කරණය සඳහා වෙනම මුරපද යළි පිහිටුවීමේ ක්‍රමවේදය (Reset Password) භාවිත කරන්න.
                  </div>
                )}
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>ක්‍රියාත්මක වෙමින් පවතී...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{editingId ? "රෝහල් සහ පාලක විස්තර යාවත්කාලීන කරන්න (Update Hospital)" : "රෝහල පද්ධතියට එක් කරන්න (Register Hospital & Admin)"}</span>
                  </>
                )}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-sm transition-all"
                >
                  අවලංගු කරන්න
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing Hospital Admins Table */}
        <div className="bg-white p-8 rounded-3xl shadow-md border border-gray-100 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">ලියාපදිංචි රෝහල් ජාලය (Hospital Directory)</h2>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                Registered Hospital Administrators ({filteredAdmins.length} Hospitals)
              </p>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="රෝහලේ නම, කේතය, අධ්‍යක්ෂක, NIC..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none w-64"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* District Filter */}
              <select
                value={tableDistrictFilter}
                onChange={(e) => setTableDistrictFilter(e.target.value)}
                className="p-2 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="All">සියලුම දිස්ත්‍රික්ක (All Districts)</option>
                {DISTRICTS.map(dist => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>

              {/* Hospital Type Filter */}
              <select
                value={tableTypeFilter}
                onChange={(e) => setTableTypeFilter(e.target.value)}
                className="p-2 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="All">සියලුම රෝහල් වර්ග (All Types)</option>
                {HOSPITAL_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="p-4">රෝහල සහ කේතය (Hospital)</th>
                  <th className="p-4">පාලකවරයා සහ NIC (Admin)</th>
                  <th className="p-4">දිස්ත්‍රික්කය සහ නගරය</th>
                  <th className="p-4">සම්බන්ධීකරණය (Contact)</th>
                  <th className="p-4 text-center">තත්ත්වය</th>
                  <th className="p-4 text-center">ක්‍රියාකාරකම් (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAdmins.length > 0 ? filteredAdmins.map(admin => (
                  <tr key={admin.id} className="hover:bg-blue-50/20 transition-colors">
                    {/* Hospital Name & Code */}
                    <td className="p-4">
                      <div className="font-bold text-gray-800 text-sm">{admin.hospitalName}</div>
                      <div className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                        {admin.hospitalCode || 'HOSP-LK'} • {admin.hospitalType?.split('(')[0] || 'General'}
                      </div>
                    </td>

                    {/* Admin Name & NIC */}
                    <td className="p-4">
                      <div className="font-semibold text-gray-800 text-xs">{admin.fullName}</div>
                      <div className="text-[11px] font-bold text-indigo-700 font-mono mt-0.5">
                        NIC: {admin.adminNic || 'නොදක්වා ඇත'}
                      </div>
                    </td>

                    {/* District & Location */}
                    <td className="p-4">
                      <div className="text-xs font-bold text-slate-700">{admin.district}</div>
                      <div className="text-[11px] text-gray-400">{admin.city || admin.hospitalAddress || '—'}</div>
                    </td>

                    {/* Contact */}
                    <td className="p-4">
                      <div className="text-xs font-bold text-gray-700">{admin.adminPhone || admin.hospitalPhone || '—'}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{admin.email}</div>
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        (admin.status || 'Active') === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {admin.status || 'Active'}
                      </span>
                    </td>

                    {/* Actions: View, Edit, Delete */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {/* View Full Profile */}
                        <button
                          onClick={() => setViewingHospital(admin)}
                          title="සම්පූර්ණ තොරතුරු බලන්න (View Full Hospital Dossier)"
                          className="p-2 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => startEdit(admin)}
                          title="සංස්කරණය (Edit Details)"
                          className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setShowDeleteModal(admin.id)}
                          title="ඉවත් කරන්න (Remove Hospital)"
                          className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-gray-400 italic">
                      කිසිදු රෝහලක තොරතුරු හමු නොවීය. (No hospitals found)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AddHospitalAdmin;