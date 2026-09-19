import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import AdminLayout from '../../components/AdminLayout';
import { DISTRICTS, getMohAreas, findDistrictByMohArea } from '../../data/sriLankaLocations';
import PasswordSecurityField from '../../components/PasswordSecurityField';
import { checkEmailUniqueness, checkNICUniqueness, evaluatePasswordStrength, formatAuthError, formatDisplayDate, isValidEmail, isValidNIC, safeRenderText } from '../../utils/securityValidators';

const DESIGNATIONS = [
  'Medical Officer of Health (MOH)',
  'Additional Medical Officer of Health (AMOH)',
  'Medical Officer - Maternal & Child Health (MO-MCH)',
  'Regional Epidemiologist (RE)',
  'Supervising Public Health Inspector (SPHI)'
];

const AddMOHAdmin = () => {
  const initialFormState = {
    fullName: '',
    nic: '',
    slmcNumber: '',
    designation: 'Medical Officer of Health (MOH)',
    gender: 'Male',
    phone: '',
    officePhone: '',
    email: '',
    officeAddress: '',
    district: '',
    mohArea: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    password: '',
    status: 'Active'
  };

  const [formData, setFormData] = useState(initialFormState);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [editingId, setEditingId] = useState(null);
  const [viewingAdmin, setViewingAdmin] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tableDistrictFilter, setTableDistrictFilter] = useState('All');

  const fetchAdmins = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "moh_admins"));
      const adminData = querySnapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          fullName: safeRenderText(data.fullName, ''),
          nic: safeRenderText(data.nic, ''),
          slmcNumber: safeRenderText(data.slmcNumber, ''),
          email: safeRenderText(data.email, ''),
          phone: safeRenderText(data.phone, ''),
          officePhone: safeRenderText(data.officePhone, ''),
          officeAddress: safeRenderText(data.officeAddress, ''),
          mohArea: safeRenderText(data.mohArea, ''),
          district: safeRenderText(data.district, ''),
          designation: safeRenderText(data.designation, 'Medical Officer of Health (MOH)'),
          gender: safeRenderText(data.gender, 'Male'),
          status: safeRenderText(data.status, 'Active'),
          appointmentDate: formatDisplayDate(data.appointmentDate, '—')
        };
      });
      setAdmins(adminData);
    } catch (error) {
      console.error("Error fetching MOH admins:", error);
    }
  };

  useEffect(() => { 
    fetchAdmins(); 
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'district') {
      setFormData(prev => ({ ...prev, district: value, mohArea: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const showToast = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.district) {
      showToast("කරුණාකර දිස්ත්‍රික්කය තෝරන්න (Please select a District)", 'error');
      return;
    }
    if (!formData.mohArea) {
      showToast("කරුණාකර MOH ප්‍රදේශය තෝරන්න (Please select an MOH Area)", 'error');
      return;
    }

    const cleanNIC = (formData.nic || '').trim().toUpperCase();
    const cleanEmail = (formData.email || '').trim().toLowerCase();

    if (!cleanNIC) {
      showToast("කරුණාකර ජාතික හැඳුනුම්පත් අංකය (NIC) ඇතුළත් කරන්න", 'error');
      return;
    }

    if (!isValidNIC(cleanNIC)) {
      showToast("වලංගු ජාතික හැඳුනුම්පත් අංකයක් (NIC) ඇතුළත් කරන්න (උදා: 198512345678 හෝ 851234567V)", 'error');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      showToast("වලංගු නොවන ඊමේල් ලිපිනයකි. (Please provide a valid email format)", 'error');
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
      const emailUnique = await checkEmailUniqueness(db, cleanEmail, editingId);
      if (!emailUnique) {
        showToast(`මෙම ඊමේල් ලිපිනය (${cleanEmail}) දැනටමත් පද්ධතියේ ලියාපදිංචි කර ඇත. කරුණාකර වෙනත් ඊමේල් ලිපිනයක් භාවිතා කරන්න.`, 'error');
        setLoading(false);
        return;
      }

      if (editingId) {
        await updateDoc(doc(db, "moh_admins", editingId), {
          fullName: formData.fullName.trim(),
          nic: cleanNIC,
          slmcNumber: formData.slmcNumber.trim(),
          designation: formData.designation,
          gender: formData.gender,
          phone: formData.phone.trim(),
          officePhone: formData.officePhone.trim(),
          officeAddress: formData.officeAddress.trim(),
          district: formData.district,
          mohArea: formData.mohArea,
          appointmentDate: formData.appointmentDate,
          status: formData.status,
          updatedAt: new Date()
        });
        showToast("MOH නිලධාරී විස්තර සාර්ථකව යාවත්කාලීන කරන ලදී! (Officer Details Updated)");
      } else {
        // Password strength validation
        const strength = evaluatePasswordStrength(formData.password);
        if (!strength.isValid || strength.score < 3) {
          showToast("මුරපදය ප්‍රමාණවත් තරම් ශක්තිමත් නැත. අවම වශයෙන් අකුරු 8ක්, ලොකු/කුඩා අකුරු, අංක සහ විශේෂ සංකේත යොදන්න.", 'error');
          setLoading(false);
          return;
        }

        // Firebase Auth user creation (scrypt salt & hash)
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, formData.password);
        const uid = userCredential.user.uid;

        // Note: Password is encrypted & salted on Firebase Auth via scrypt. NEVER stored in plaintext in Firestore!
        await setDoc(doc(db, "users", uid), {
          email: cleanEmail,
          role: "moh_admin",
          fullName: formData.fullName.trim(),
          nic: cleanNIC,
          uid,
          createdAt: new Date()
        });

        await setDoc(doc(db, "moh_admins", uid), {
          fullName: formData.fullName.trim(),
          nic: cleanNIC,
          slmcNumber: formData.slmcNumber.trim(),
          designation: formData.designation,
          gender: formData.gender,
          phone: formData.phone.trim(),
          officePhone: formData.officePhone.trim(),
          email: cleanEmail,
          officeAddress: formData.officeAddress.trim(),
          district: formData.district,
          mohArea: formData.mohArea,
          appointmentDate: formData.appointmentDate,
          status: formData.status || 'Active',
          adminId: uid,
          createdAt: new Date()
        });
        showToast("MOH නිලධාරියා සාර්ථකව ලියාපදිංචි කරන ලදී! (MOH Officer Registered Securely)");
      }
      setFormData(initialFormState);
      setEditingId(null);
      fetchAdmins();
    } catch (error) {
      showToast(formatAuthError(error), 'error');
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, "moh_admins", showDeleteModal));
        await deleteDoc(doc(db, "users", showDeleteModal));
        fetchAdmins();
        showToast("MOH නිලධාරියා පද්ධතියෙන් ඉවත් කරන ලදී. (Officer Removed)");
        setShowDeleteModal(null);
      } catch (err) {
        showToast("ඉවත් කිරීම අසාර්ථකයි: " + err.message, 'error');
      }
    }
  };

  const startEdit = (admin) => {
    const inferredDistrict = admin.district || findDistrictByMohArea(admin.mohArea) || '';
    setEditingId(admin.id);
    setFormData({
      fullName: admin.fullName || '',
      nic: admin.nic || '',
      slmcNumber: admin.slmcNumber || '',
      designation: admin.designation || 'Medical Officer of Health (MOH)',
      gender: admin.gender || 'Male',
      phone: admin.phone || '',
      officePhone: admin.officePhone || '',
      email: admin.email || '',
      officeAddress: admin.officeAddress || '',
      district: inferredDistrict,
      mohArea: admin.mohArea || '',
      appointmentDate: admin.appointmentDate || new Date().toISOString().split('T')[0],
      status: admin.status || 'Active',
      password: '••••••••'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormState);
  };

  const availableMohAreas = getMohAreas(formData.district);

  const filteredAdmins = admins.filter(admin => {
    const adminDistrict = admin.district || findDistrictByMohArea(admin.mohArea) || '';
    const matchesDistrict = tableDistrictFilter === 'All' || adminDistrict === tableDistrictFilter;
    
    if (!searchTerm.trim()) return matchesDistrict;
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (admin.fullName || '').toLowerCase().includes(term) ||
      (admin.nic || '').toLowerCase().includes(term) ||
      (admin.slmcNumber || '').toLowerCase().includes(term) ||
      (admin.mohArea || '').toLowerCase().includes(term) ||
      (admin.email || '').toLowerCase().includes(term);

    return matchesDistrict && matchesSearch;
  });

  return (
    <AdminLayout>
      {/* Officer Full Profile Dossier Modal */}
      {viewingAdmin && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 p-6 text-white relative">
              <button 
                onClick={() => setViewingAdmin(null)}
                className="absolute top-5 right-5 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-black shadow-inner">
                  🩺
                </div>
                <div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[10px] font-black uppercase tracking-wider mb-1 border border-emerald-400/30">
                    {viewingAdmin.designation || 'Medical Officer of Health'}
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">{viewingAdmin.fullName}</h3>
                  <p className="text-xs text-teal-100 font-medium">{viewingAdmin.mohArea} MOH Division, {viewingAdmin.district || findDistrictByMohArea(viewingAdmin.mohArea)}</p>
                </div>
              </div>
            </div>

            {/* Modal Content / Details Grid */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Status & SLMC Quick Badge */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">සේවා තත්ත්වය (Status)</span>
                  <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold ${
                    viewingAdmin.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {viewingAdmin.status || 'Active'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">SLMC ලියාපදිංචිය</span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block font-mono">{viewingAdmin.slmcNumber || 'නැත (N/A)'}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">ජාතික හැඳුනුම්පත (NIC)</span>
                  <span className="text-xs font-bold text-slate-800 mt-1 block font-mono">{viewingAdmin.nic || 'නැත (N/A)'}</span>
                </div>
              </div>

              {/* Personal & Professional Section */}
              <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-3">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  පෞද්ගලික සහ වෘත්තීය විස්තර (Personal & Professional Profile)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 font-bold block">සම්පූර්ණ නම:</span>
                    <span className="font-bold text-gray-800">{viewingAdmin.fullName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">ස්ත්‍රී / පුරුෂ භාවය (Gender):</span>
                    <span className="font-semibold text-gray-700">{viewingAdmin.gender || 'නොදක්වා ඇත'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">තනතුර (Designation):</span>
                    <span className="font-semibold text-gray-700">{viewingAdmin.designation || 'Medical Officer of Health (MOH)'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">පත් කළ දිනය (Appointment Date):</span>
                    <span className="font-semibold text-gray-700">{viewingAdmin.appointmentDate || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Contact & Office Section */}
              <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-100 space-y-3">
                <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  සම්බන්ධීකරණ සහ කාර්යාල තොරතුරු (Contact & Office Details)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 font-bold block">ජංගම දුරකථන අංකය:</span>
                    <a href={`tel:${viewingAdmin.phone}`} className="font-bold text-blue-600 hover:underline">{viewingAdmin.phone || '—'}</a>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">කාර්යාල දුරකථන අංකය:</span>
                    <span className="font-semibold text-gray-700">{viewingAdmin.officePhone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">රාජකාරි ඊමේල් ලිපිනය:</span>
                    <a href={`mailto:${viewingAdmin.email}`} className="font-bold text-blue-600 hover:underline">{viewingAdmin.email}</a>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold block">MOH කාර්යාල ලිපිනය:</span>
                    <span className="font-semibold text-gray-700">{viewingAdmin.officeAddress || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3">
              <button 
                onClick={() => {
                  const adminToEdit = viewingAdmin;
                  setViewingAdmin(null);
                  startEdit(adminToEdit);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                සංස්කරණය (Edit Profile)
              </button>
              <button 
                onClick={() => setViewingAdmin(null)}
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
            <h3 className="text-lg font-bold text-gray-800">MOH නිලධාරියා ඉවත් කරන්නද?</h3>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-1 mb-6">Are you sure you want to remove this officer?</p>
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
          messageType === 'error' ? 'bg-red-900 border-l-4 border-red-500' : 'bg-slate-900 border-l-4 border-emerald-500'
        }`}>
          <div className={`rounded-full p-1.5 ${messageType === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
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
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-8 rounded-3xl shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-2 border border-emerald-400/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              MOH Administration & Officer Registry
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">සෞඛ්‍ය වෛද්‍ය නිලධාරී (MOH) කළමනාකරණය</h1>
            <p className="text-emerald-100/70 text-xs font-medium mt-1">
              සෞඛ්‍ය වෛද්‍ය නිලධාරීන්ගේ සම්පූර්ණ තොරතුරු (NIC, SLMC No, රාජකාරි බලප්‍රදේශය) ලියාපදිංචිය සහ අධීක්ෂණය
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] font-black text-emerald-200 uppercase tracking-wider block">ලියාපදිංචි නිලධාරීන්</span>
              <span className="text-2xl font-black text-white">{admins.length}</span>
            </div>
          </div>
        </div>

        {/* Registration / Edit Form */}
        <div className="bg-white p-8 rounded-3xl shadow-md border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>

          <div className="mb-6 border-b border-gray-100 pb-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {editingId ? "MOH නිලධාරී තොරතුරු සංස්කරණය" : "අලුත් MOH වෛද්‍ය/පාලක නිලධාරියෙකු ලියාපදිංචි කිරීම"}
              </h2>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                {editingId ? "Update MOH Officer Dossier" : "Register New Medical Officer of Health (MOH Officer)"}
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
            {/* Section 1: Personal & Professional Identity */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold">1</div>
                <h3 className="text-sm font-bold text-gray-800">පෞද්ගලික සහ වෘත්තීය තොරතුරු (Personal & Professional Identity)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Full Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    සම්පූර්ණ නම (Full Name with Initials) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="වෛද්‍යවරයාගේ සම්පූර්ණ නම"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all text-sm font-medium"
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
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none text-sm font-medium"
                  >
                    <option value="Male">පිරිමි (Male)</option>
                    <option value="Female">ගැහැණු (Female)</option>
                  </select>
                </div>

                {/* NIC Number */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ජාතික හැඳුනුම්පත් අංකය (NIC No.) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nic"
                    placeholder="ජාතික හැඳුනුම්පත් අංකය (NIC)"
                    value={formData.nic}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all text-sm font-medium font-mono"
                  />
                </div>

                {/* SLMC Reg Number */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ශ්‍රී ලංකා වෛද්‍ය සභා අංකය (SLMC Reg No.)
                  </label>
                  <input
                    type="text"
                    name="slmcNumber"
                    placeholder="SLMC ලියාපදිංචි අංකය"
                    value={formData.slmcNumber}
                    onChange={handleChange}
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all text-sm font-medium font-mono"
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
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none text-sm font-medium"
                  >
                    {DESIGNATIONS.map(desig => (
                      <option key={desig} value={desig}>{desig}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Contact & Office Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center text-sm font-bold">2</div>
                <h3 className="text-sm font-bold text-gray-800">සම්බන්ධීකරණ සහ කාර්යාල තොරතුරු (Contact & Office Information)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Personal Phone */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    ජංගම දුරකථන අංකය (Mobile Number) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="07X XXXXXXX"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>

                {/* Office Phone */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    MOH කාර්යාල දුරකථන අංකය (Office Phone)
                  </label>
                  <input
                    type="tel"
                    name="officePhone"
                    placeholder="0XX XXXXXXX"
                    value={formData.officePhone}
                    onChange={handleChange}
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>

                {/* Office Address */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    MOH කාර්යාලයේ නිල ලිපිනය (MOH Office Official Address)
                  </label>
                  <input
                    type="text"
                    name="officeAddress"
                    placeholder="කාර්යාල ලිපිනය ඇතුළත් කරන්න"
                    value={formData.officeAddress}
                    onChange={handleChange}
                    autoComplete="off"
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Jurisdiction & Assignment */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center text-sm font-bold">3</div>
                <h3 className="text-sm font-bold text-gray-800">පරිපාලන බලප්‍රදේශය සහ පත්වීම් තොරතුරු (Jurisdiction & Regional Assignment)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none text-sm font-medium"
                  >
                    <option value="">-- දිස්ත්‍රික්කය තෝරන්න --</option>
                    {DISTRICTS.map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>

                {/* Cascading MOH Area */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    MOH ප්‍රදේශය (MOH Area) <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="mohArea"
                    value={formData.mohArea}
                    onChange={handleChange}
                    required
                    disabled={!formData.district}
                    className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium ${
                      !formData.district ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-gray-50/70 border-gray-200 focus:bg-white'
                    }`}
                  >
                    <option value="">
                      {formData.district ? "-- MOH ප්‍රදේශය තෝරන්න --" : "-- පළමුව දිස්ත්‍රික්කය තෝරන්න --"}
                    </option>
                    {availableMohAreas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>

                {/* Appointment Date */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    පත් කළ දිනය (Appointment Date)
                  </label>
                  <input
                    type="date"
                    name="appointmentDate"
                    value={formData.appointmentDate}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none text-sm font-medium"
                  />
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
                    className="w-full p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none text-sm font-medium"
                  >
                    <option value="Active">සක්‍රීය (Active)</option>
                    <option value="On Leave">නිවාඩු මත (On Leave)</option>
                    <option value="Transferred">ස්ථාන මාරු වූ (Transferred)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4: Authentication Credentials (Email & Password) */}
            <div className="space-y-4 bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-200/60">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">4</div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-800">පද්ධති පිවිසුම් ගිණුම් තොරතුරු (System Login & Access Credentials)</h3>
                  <p className="text-[11px] text-gray-500 font-medium">MOH නිලධාරියා පද්ධතියට ලොග් වීම සඳහා භාවිත කරන ඊමේල් ලිපිනය සහ ආරක්‍ෂිත මුරපදය</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    රාජකාරි පිවිසුම් ඊමේල් ලිපිනය (Official Login Email) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    placeholder="officer@moh.health.gov.lk"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={!!editingId}
                    className={`w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm font-medium ${
                      editingId ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-white border-gray-200 focus:border-emerald-500 shadow-sm'
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

            {/* Submit Button */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
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
                    <span>{editingId ? "MOH නිලධාරී විස්තර යාවත්කාලීන කරන්න (Update Officer)" : "MOH නිලධාරියා පද්ධතියට එක් කරන්න (Register MOH Officer)"}</span>
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

        {/* Existing Admins Directory Table */}
        <div className="bg-white p-8 rounded-3xl shadow-md border border-gray-100 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">ලියාපදිංචි සෞඛ්‍ය වෛද්‍ය නිලධාරීන් (MOH Directory)</h2>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                Registered MOH Administrators ({filteredAdmins.length} Officers)
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="නම, NIC, SLMC හෝ MOH ප්‍රදේශය..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none w-64"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* District Filter */}
              <div className="flex items-center space-x-2">
                <select
                  value={tableDistrictFilter}
                  onChange={(e) => setTableDistrictFilter(e.target.value)}
                  className="p-2 border border-gray-200 rounded-xl text-xs font-bold bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="All">සියලුම දිස්ත්‍රික්ක (All Districts)</option>
                  {DISTRICTS.map(dist => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="p-4">නිලධාරියා (Officer & NIC)</th>
                  <th className="p-4">තනතුර සහ SLMC</th>
                  <th className="p-4">MOH ප්‍රදේශය & දිස්ත්‍රික්කය</th>
                  <th className="p-4">සම්බන්ධීකරණය (Contact)</th>
                  <th className="p-4 text-center">තත්ත්වය</th>
                  <th className="p-4 text-center">ක්‍රියාකාරකම් (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAdmins.length > 0 ? filteredAdmins.map(admin => {
                  const displayDistrict = admin.district || findDistrictByMohArea(admin.mohArea) || '—';
                  return (
                    <tr key={admin.id} className="hover:bg-emerald-50/20 transition-colors">
                      {/* Name & NIC */}
                      <td className="p-4">
                        <div className="font-bold text-gray-800 text-sm flex items-center gap-2">
                          <span>{admin.fullName}</span>
                        </div>
                        <div className="text-[11px] font-bold text-emerald-700 font-mono mt-0.5">
                          NIC: {admin.nic || 'නොදක්වා ඇත'}
                        </div>
                      </td>

                      {/* Designation & SLMC */}
                      <td className="p-4">
                        <div className="text-xs font-semibold text-gray-700">{admin.designation || 'Medical Officer of Health'}</div>
                        <div className="text-[10px] font-bold text-gray-400 font-mono">
                          {admin.slmcNumber ? `SLMC: ${admin.slmcNumber}` : '—'}
                        </div>
                      </td>

                      {/* Jurisdiction */}
                      <td className="p-4">
                        <div className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg inline-block border border-teal-100">
                          {admin.mohArea}
                        </div>
                        <div className="text-[11px] text-gray-500 font-medium mt-0.5">{displayDistrict}</div>
                      </td>

                      {/* Contact */}
                      <td className="p-4">
                        <div className="text-xs font-bold text-gray-700">{admin.phone || '—'}</div>
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

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          {/* View Full Profile */}
                          <button
                            onClick={() => setViewingAdmin(admin)}
                            title="සම්පූර්ණ තොරතුරු බලන්න (View Full Profile)"
                            className="p-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
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
                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setShowDeleteModal(admin.id)}
                            title="ඉවත් කරන්න (Remove Officer)"
                            className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="6" className="p-10 text-center text-gray-400 italic">
                      කිසිදු MOH නිලධාරියෙකුගේ තොරතුරු හමු නොවීය. (No MOH officers found)
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

export default AddMOHAdmin;