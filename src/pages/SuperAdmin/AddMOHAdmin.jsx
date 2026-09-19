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
        showToast(`මෙම හැඳුනුම්පත් අංකය (NIC: ${cleanNIC}) දැනටමත් පද්ධතියේ ${nicCheck.role} සඳහා ලියාපදිංචි කර ඇත!`, 'error');
        setLoading(false);
        return;
      }

      // 2. Strict Email Uniqueness Check across the system
      const isEmailUnique = await checkEmailUniqueness(db, cleanEmail, editingId);
      if (!isEmailUnique) {
        showToast(`මෙම ඊමේල් ලිපිනය (${cleanEmail}) දැනටමත් වෙනත් ගිණුමක් සඳහා ලියාපදිංචි කර ඇත!`, 'error');
        setLoading(false);
        return;
      }

      if (editingId) {
        // Edit Mode
        const updatePayload = {
          fullName: formData.fullName.trim(),
          nic: cleanNIC,
          slmcNumber: (formData.slmcNumber || '').trim(),
          designation: formData.designation,
          gender: formData.gender,
          phone: (formData.phone || '').trim(),
          officePhone: (formData.officePhone || '').trim(),
          email: cleanEmail,
          officeAddress: (formData.officeAddress || '').trim(),
          district: formData.district,
          mohArea: formData.mohArea,
          appointmentDate: formData.appointmentDate,
          status: formData.status,
          updatedAt: new Date()
        };

        await updateDoc(doc(db, "moh_admins", editingId), updatePayload);
        
        // Also update users collection
        await updateDoc(doc(db, "users", editingId), {
          fullName: formData.fullName.trim(),
          email: cleanEmail,
          nic: cleanNIC,
          district: formData.district,
          mohArea: formData.mohArea,
          updatedAt: new Date()
        });

        showToast("MOH නිලධාරී තොරතුරු සාර්ථකව යාවත්කාලීන කරන ලදී! (Officer Updated)");
        setEditingId(null);
        setFormData(initialFormState);
        fetchAdmins();
      } else {
        // Create Mode - Requires strong encrypted password validation
        if (!formData.password) {
          showToast("කරුණාකර පිවිසුම් මුරපදයක් (Password) ඇතුළත් කරන්න", 'error');
          setLoading(false);
          return;
        }

        const pwdEval = evaluatePasswordStrength(formData.password);
        if (!pwdEval.isValid) {
          showToast("මුරපදය ප්‍රමාණවත් තරම් ශක්තිමත් නැත. කරුණාකර අවම අක්ෂර 8ක්, අංක සහ සංකේත ඇතුළත් කරන්න.", 'error');
          setLoading(false);
          return;
        }

        // Firebase Auth User Creation (Scrypt password encryption with Salt & Pepper)
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, formData.password);
        const user = userCredential.user;

        // Save to users collection
        await setDoc(doc(db, "users", user.uid), {
          fullName: formData.fullName.trim(),
          email: cleanEmail,
          nic: cleanNIC,
          role: "moh_admin",
          district: formData.district,
          mohArea: formData.mohArea,
          createdAt: new Date()
        });

        // Save detailed profile to moh_admins collection (Zero plaintext passwords saved)
        await setDoc(doc(db, "moh_admins", user.uid), {
          fullName: formData.fullName.trim(),
          nic: cleanNIC,
          slmcNumber: (formData.slmcNumber || '').trim(),
          designation: formData.designation,
          gender: formData.gender,
          phone: (formData.phone || '').trim(),
          officePhone: (formData.officePhone || '').trim(),
          email: cleanEmail,
          officeAddress: (formData.officeAddress || '').trim(),
          district: formData.district,
          mohArea: formData.mohArea,
          appointmentDate: formData.appointmentDate,
          status: formData.status,
          createdAt: new Date()
        });

        showToast("MOH වෛද්‍ය/පාලක නිලධාරියා සාර්ථකව ලියාපදිංචි කරන ලදී! (MOH Admin Registered)");
        setFormData(initialFormState);
        fetchAdmins();
      }
    } catch (error) {
      console.error("Submission error:", error);
      const friendlyError = formatAuthError(error);
      showToast(friendlyError, 'error');
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
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-blue-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-blue-100 animate-in zoom-in-95 duration-300">
            {/* Modal Header (Blue & White) */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 p-6 sm:p-8 text-white relative">
              <button 
                onClick={() => setViewingAdmin(null)}
                className="absolute top-5 right-5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-18 h-18 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl font-black shadow-inner shrink-0">
                  🩺
                </div>
                <div>
                  <div className="inline-block px-3 py-1 rounded-full bg-blue-500/30 text-blue-200 text-xs font-black uppercase tracking-wider mb-1.5 border border-blue-400/30">
                    {viewingAdmin.designation || 'Medical Officer of Health'}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight">{viewingAdmin.fullName}</h3>
                  <p className="text-sm text-blue-200 font-medium mt-0.5">{viewingAdmin.mohArea} MOH Division, {viewingAdmin.district || findDistrictByMohArea(viewingAdmin.mohArea)}</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[72vh] overflow-y-auto custom-scrollbar">
              {/* Status & SLMC Quick Badge */}
              <div className="grid grid-cols-3 gap-3.5">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">සේවා තත්ත්වය</span>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${
                    viewingAdmin.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {viewingAdmin.status || 'Active'}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">SLMC ලියාපදිංචිය</span>
                  <span className="text-sm sm:text-base font-black text-slate-800 mt-1 block font-mono">{viewingAdmin.slmcNumber || 'නැත (N/A)'}</span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider block">ජාතික හැඳුනුම්පත (NIC)</span>
                  <span className="text-sm sm:text-base font-black text-slate-800 mt-1 block font-mono">{viewingAdmin.nic || 'නැත (N/A)'}</span>
                </div>
              </div>

              {/* Personal & Professional Section */}
              <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-100 space-y-3">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  පෞද්ගලික සහ වෘත්තීය විස්තර (Personal & Professional Profile)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 font-bold block">සම්පූර්ණ නම:</span>
                    <span className="font-bold text-slate-900 text-base">{viewingAdmin.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">ස්ත්‍රී / පුරුෂ භාවය (Gender):</span>
                    <span className="font-semibold text-slate-700">{viewingAdmin.gender || 'නොදක්වා ඇත'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">තනතුර (Designation):</span>
                    <span className="font-semibold text-slate-700">{viewingAdmin.designation || 'Medical Officer of Health (MOH)'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">පත් කළ දිනය (Appointment Date):</span>
                    <span className="font-semibold text-slate-700">{viewingAdmin.appointmentDate || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Contact & Office Section */}
              <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-100 space-y-3">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  සම්බන්ධීකරණ සහ කාර්යාල තොරතුරු (Contact & Office Details)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400 font-bold block">ජංගම දුරකථන අංකය:</span>
                    <a href={`tel:${viewingAdmin.phone}`} className="font-bold text-blue-700 hover:underline">{viewingAdmin.phone || '—'}</a>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">කාර්යාල දුරකථන අංකය:</span>
                    <span className="font-semibold text-slate-700">{viewingAdmin.officePhone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">රාජකාරි ඊමේල් ලිපිනය:</span>
                    <a href={`mailto:${viewingAdmin.email}`} className="font-bold text-blue-700 hover:underline font-mono">{viewingAdmin.email}</a>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">MOH කාර්යාල ලිපිනය:</span>
                    <span className="font-semibold text-slate-700">{viewingAdmin.officeAddress || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
              <button 
                onClick={() => {
                  const adminToEdit = viewingAdmin;
                  setViewingAdmin(null);
                  startEdit(adminToEdit);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                සංස්කරණය (Edit Profile)
              </button>
              <button 
                onClick={() => setViewingAdmin(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-xl transition-all"
              >
                වසන්න (Close)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-blue-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-7 max-w-sm w-full shadow-2xl border border-blue-100 text-center animate-in zoom-in-95 duration-200">
            <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-inner">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-900">MOH නිලධාරියා ඉවත් කරන්නද?</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-6">Are you sure you want to remove this officer?</p>
            <div className="flex space-x-3">
              <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase transition-all">
                නැත (Cancel)
              </button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-red-200 transition-all">
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

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Title (Blue and White) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 text-white p-6 sm:p-8 lg:p-10 rounded-3xl shadow-2xl border border-blue-800/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs sm:text-sm font-bold mb-2 border border-blue-400/20">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              MOH Administration & Officer Registry
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">සෞඛ්‍ය වෛද්‍ය නිලධාරී (MOH) කළමනාකරණය</h1>
            <p className="text-blue-100/80 text-xs sm:text-sm font-medium mt-1.5 max-w-2xl">
              සෞඛ්‍ය වෛද්‍ය නිලධාරීන්ගේ සම්පූර්ණ තොරතුරු (NIC, SLMC No, රාජකාරි බලප්‍රදේශය) ලියාපදිංචිය, සංස්කරණය සහ අධීක්ෂණය
            </p>
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 text-center">
              <span className="text-xs font-black text-blue-200 uppercase tracking-wider block">ලියාපදිංචි නිලධාරීන්</span>
              <span className="text-3xl font-black text-white">{admins.length}</span>
            </div>
          </div>
        </div>

        {/* Registration / Edit Form (Blue & White) */}
        <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-3xl shadow-sm border border-blue-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-400"></div>

          <div className="mb-8 border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {editingId ? "MOH නිලධාරී තොරතුරු සංස්කරණය" : "අලුත් MOH වෛද්‍ය/පාලක නිලධාරියෙකු ලියාපදිංචි කිරීම"}
              </h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                {editingId ? "Update MOH Officer Dossier" : "Register New Medical Officer of Health (MOH Officer)"}
              </p>
            </div>
            {editingId && (
              <button 
                onClick={cancelEdit}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all w-fit"
              >
                සංස්කරණය අවලංගු කරන්න (Cancel)
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-8">
            {/* Section 1: Personal & Professional Identity */}
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm border border-blue-200 shadow-sm">1</div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">පෞද්ගලික සහ වෘත්තීය තොරතුරු (Personal & Professional Identity)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    සම්පූර්ණ නම (Full Name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="උදා: Dr. කසුන් බණ්ඩාර පෙරේරා"
                    required
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-semibold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                  />
                </div>

                {/* NIC */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    ජාතික හැඳුනුම්පත (NIC) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="nic"
                    value={formData.nic}
                    onChange={handleChange}
                    placeholder="198512345678 හෝ 851234567V"
                    required
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-mono font-bold uppercase focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                  />
                </div>

                {/* SLMC Reg Number */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    SLMC ලියාපදිංචි අංකය (SLMC Reg No)
                  </label>
                  <input
                    type="text"
                    name="slmcNumber"
                    value={formData.slmcNumber}
                    onChange={handleChange}
                    placeholder="SLMC/MED/XXXXX"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    තනතුර (Designation) <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                  >
                    {DESIGNATIONS.map(des => (
                      <option key={des} value={des}>{des}</option>
                    ))}
                  </select>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    ස්ත්‍රී / පුරුෂ භාවය (Gender)
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                  >
                    <option value="Male">පුරුෂ (Male)</option>
                    <option value="Female">ස්ත්‍රී (Female)</option>
                    <option value="Other">වෙනත් (Other)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Regional Jurisdiction */}
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm border border-blue-200 shadow-sm">2</div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">පරිපාලන බලප්‍රදේශය (Regional Jurisdiction)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* District */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    දිස්ත්‍රික්කය (District) <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    required
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                  >
                    <option value="">-- දිස්ත්‍රික්කය තෝරන්න --</option>
                    {DISTRICTS.map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>

                {/* MOH Area */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    MOH ප්‍රදේශය (MOH Area) <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="mohArea"
                    value={formData.mohArea}
                    onChange={handleChange}
                    required
                    disabled={!formData.district}
                    className={`w-full p-3.5 border rounded-2xl text-sm sm:text-base font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all ${
                      !formData.district ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <option value="">-- MOH ප්‍රදේශය තෝරන්න --</option>
                    {availableMohAreas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    සේවා තත්ත්වය (Account Status)
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                  >
                    <option value="Active">Active (ක්‍රියාකාරී)</option>
                    <option value="Inactive">Inactive (අක්‍රිය)</option>
                    <option value="On Leave">On Leave (නිවාඩු මත)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Contact & Office Details */}
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm border border-blue-200 shadow-sm">3</div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">සම්බන්ධීකරණ සහ කාර්යාල තොරතුරු (Contact & Office Details)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Personal Phone */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    ජංගම දුරකථන අංකය (Mobile) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0771234567"
                    required
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-semibold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                  />
                </div>

                {/* Office Phone */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    MOH කාර්යාල දුරකථන අංකය
                  </label>
                  <input
                    type="tel"
                    name="officePhone"
                    value={formData.officePhone}
                    onChange={handleChange}
                    placeholder="0112345678"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-semibold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                  />
                </div>

                {/* Appointment Date */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    පත් කළ දිනය (Appointment Date)
                  </label>
                  <input
                    type="date"
                    name="appointmentDate"
                    value={formData.appointmentDate}
                    onChange={handleChange}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-semibold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                  />
                </div>

                {/* Office Address */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    MOH කාර්යාලයේ ලිපිනය (Office Address)
                  </label>
                  <input
                    type="text"
                    name="officeAddress"
                    value={formData.officeAddress}
                    onChange={handleChange}
                    placeholder="උදා: සෞඛ්‍ය වෛද්‍ය නිලධාරී කාර්යාලය, ගාලු පාර, මොරටුව"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-semibold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Login Account & Encrypted Password */}
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-sm border border-blue-200 shadow-sm">4</div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">පද්ධති පිවිසුම් ගිණුම (Login Credentials)</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Official Email */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    රාජකාරි ඊමේල් ලිපිනය (Login Email) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="doctor@moh.gov.lk"
                    required
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm sm:text-base font-mono font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all"
                  />
                  <p className="text-xs text-slate-400 mt-1">මෙම ඊමේල් ලිපිනය මඟින් නිලධාරියා පද්ධතියට ලොග් වේ.</p>
                </div>

                {/* Password Field with Security Gauge */}
                {!editingId ? (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      ආරක්ෂිත මුරපදය (Encrypted Password) <span className="text-red-500">*</span>
                    </label>
                    <PasswordSecurityField
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="ශක්තිමත් මුරපදයක් ඇතුළත් කරන්න..."
                      required={!editingId}
                    />
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center text-xs sm:text-sm text-slate-600 font-medium">
                    🔒 ආරක්ෂක හේතුන් මත මුරපදය මෙතැනින් වෙනස් කළ නොහැක. (Encrypted Password Protected)
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button Bar */}
            <div className="pt-5 border-t border-slate-100 flex justify-end items-center space-x-4">
              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-2xl transition-all"
                >
                  අවලංගු කරන්න
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white text-sm sm:text-base font-bold rounded-2xl shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>සුරකිමින් පවතී...</span>
                  </>
                ) : (
                  <>
                    <span>{editingId ? "යාවත්කාලීන කරන්න (Update MOH Admin)" : "MOH නිලධාරියා ලියාපදිංචි කරන්න (Register Admin)"}</span>
                    <span>&rarr;</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Officers Directory & Management Table (Blue & White) */}
        <div className="bg-white rounded-3xl shadow-sm border border-blue-100 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">ලියාපදිංචි MOH නිලධාරීන් නාමාවලිය</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                Medical Officers of Health (MOH) Directory & Management
              </p>
            </div>

            {/* Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="සොයන්න (නම, NIC, MOH, Email)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none w-full sm:w-64"
              />

              <select
                value={tableDistrictFilter}
                onChange={(e) => setTableDistrictFilter(e.target.value)}
                className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none"
              >
                <option value="All">සියලුම දිස්ත්‍රික්ක (All Districts)</option>
                {DISTRICTS.map(dist => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-black text-slate-600 uppercase tracking-wider">
                  <th className="p-4">නිලධාරියා (Officer & NIC)</th>
                  <th className="p-4">තනතුර සහ SLMC</th>
                  <th className="p-4">MOH ප්‍රදේශය & දිස්ත්‍රික්කය</th>
                  <th className="p-4">සම්බන්ධීකරණය (Contact)</th>
                  <th className="p-4 text-center">තත්ත්වය</th>
                  <th className="p-4 text-center">ක්‍රියාකාරකම් (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdmins.length > 0 ? filteredAdmins.map(admin => {
                  const displayDistrict = admin.district || findDistrictByMohArea(admin.mohArea) || '—';
                  return (
                    <tr key={admin.id} className="hover:bg-blue-50/30 transition-colors">
                      {/* Name & NIC */}
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                          <span>{admin.fullName}</span>
                        </div>
                        <div className="text-xs font-bold text-blue-700 font-mono mt-0.5">
                          NIC: {admin.nic || 'නොදක්වා ඇත'}
                        </div>
                      </td>

                      {/* Designation & SLMC */}
                      <td className="p-4">
                        <div className="text-sm font-semibold text-slate-800">{admin.designation || 'Medical Officer of Health'}</div>
                        <div className="text-xs font-bold text-slate-400 font-mono mt-0.5">
                          {admin.slmcNumber ? `SLMC: ${admin.slmcNumber}` : '—'}
                        </div>
                      </td>

                      {/* Jurisdiction */}
                      <td className="p-4">
                        <div className="text-xs font-bold text-blue-800 bg-blue-50 px-3 py-1 rounded-xl inline-block border border-blue-100">
                          {admin.mohArea}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-1">{displayDistrict}</div>
                      </td>

                      {/* Contact */}
                      <td className="p-4">
                        <div className="text-sm font-bold text-slate-800">{admin.phone || '—'}</div>
                        <div className="text-xs text-blue-600 font-mono mt-0.5">{admin.email}</div>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                          (admin.status || 'Active') === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {admin.status || 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-2">
                          {/* View Full Profile */}
                          <button
                            onClick={() => setViewingAdmin(admin)}
                            title="සම්පූර්ණ තොරතුරු බලන්න (View Full Profile)"
                            className="p-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
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
                            className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setShowDeleteModal(admin.id)}
                            title="ඉවත් කරන්න (Remove Officer)"
                            className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
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
                    <td colSpan="6" className="p-12 text-center text-slate-400 italic text-sm">
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