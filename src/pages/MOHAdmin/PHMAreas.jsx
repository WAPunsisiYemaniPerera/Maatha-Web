import React, { useEffect, useState, useMemo } from 'react';
import { auth, db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import MOHLayout from '../../components/MOHLayout';
import ModalPortal from '../../components/ModalPortal';
import { DISTRICTS, getMohAreas, findDistrictByMohArea } from '../../data/sriLankaLocations';
import { safeRenderText } from '../../utils/securityValidators';

const PHMAreas = () => {
  const [district, setDistrict] = useState('Colombo');
  const [mohArea, setMohArea] = useState('Colombo');
  const [loading, setLoading] = useState(true);
  const [phmAreas, setPhmAreas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    areaName: '',
    areaCode: '',
    gnDivisions: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  // UI / Feedback States
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [showDeleteModal, setShowDeleteModal] = useState(null);

  const showToast = (msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  // 1. Load Logged-in Admin Profile
  useEffect(() => {
    const fetchAdmin = async () => {
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
          console.error("Error loading MOH admin profile:", err);
        }
      }
    };
    fetchAdmin();
  }, []);

  // 2. Fetch PHM Areas and Midwives for the selected MOH division
  const fetchData = async () => {
    setLoading(true);
    try {
      const [areasSnap, midSnap] = await Promise.all([
        getDocs(query(collection(db, "phm_areas"), where("mohArea", "==", mohArea))),
        getDocs(query(collection(db, "midwives"), where("mohArea", "==", mohArea)))
      ]);

      const midwivesList = midSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const areasList = areasSnap.docs.map(d => {
        const data = d.data();
        // Check if any active midwife is assigned to this area
        const assignedMidwife = midwivesList.find(m => 
          (m.serviceArea || '').trim().toLowerCase() === (data.areaName || '').trim().toLowerCase()
        );

        return {
          id: d.id,
          ...data,
          areaName: safeRenderText(data.areaName, ''),
          areaCode: safeRenderText(data.areaCode, ''),
          gnDivisions: safeRenderText(data.gnDivisions, ''),
          assignedMidwife: assignedMidwife ? assignedMidwife.fullName : null,
          assignedMidwifeId: assignedMidwife ? assignedMidwife.id : null,
          assignedMidwifePhone: assignedMidwife ? assignedMidwife.phone : null
        };
      });

      setPhmAreas(areasList);
    } catch (err) {
      console.error("Error loading PHM areas:", err);
      showToast("දත්ත ලබාගැනීම අසාර්ථක විය: " + err.message, 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (mohArea) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mohArea]);

  const handleDistrictChange = (e) => {
    const newDistrict = e.target.value;
    setDistrict(newDistrict);
    const mohs = getMohAreas(newDistrict);
    if (mohs.length > 0) {
      setMohArea(mohs[0]);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = (formData.areaName || '').trim();
    const cleanCode = (formData.areaCode || '').trim();
    const cleanGN = (formData.gnDivisions || '').trim();

    if (!cleanName) {
      showToast("කරුණාකර PHM කොට්ඨාසයේ නම ඇතුළත් කරන්න (Please enter Area Name)", 'error');
      return;
    }

    // Check duplicate name in same MOH area
    const duplicate = phmAreas.find(a => 
      a.id !== editingId && 
      a.areaName.toLowerCase() === cleanName.toLowerCase()
    );

    if (duplicate) {
      showToast(`'${cleanName}' නමින් PHM කොට්ඨාසයක් දැනටමත් ${mohArea} බලප්‍රදේශයේ ලියාපදිංචි කර ඇත.`, 'error');
      return;
    }

    setFormLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "phm_areas", editingId), {
          areaName: cleanName,
          areaCode: cleanCode,
          gnDivisions: cleanGN,
          district: district,
          mohArea: mohArea,
          updatedAt: new Date()
        });
        showToast("PHM කොට්ඨාස තොරතුරු සාර්ථකව යාවත්කාලීන කරන ලදී! (Updated)");
      } else {
        const newDocRef = doc(collection(db, "phm_areas"));
        await setDoc(newDocRef, {
          areaName: cleanName,
          areaCode: cleanCode,
          gnDivisions: cleanGN,
          district: district,
          mohArea: mohArea,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        showToast("නව PHM කොට්ඨාසය සාර්ථකව පද්ධතියට එක් කරන ලදී! (Created)");
      }

      setFormData({ areaName: '', areaCode: '', gnDivisions: '' });
      setEditingId(null);
      fetchData();
    } catch (err) {
      console.error("Save error:", err);
      showToast("සුරැකීමේදී දෝෂයක් සිදු විය: " + err.message, 'error');
    }
    setFormLoading(false);
  };

  const startEdit = (area) => {
    setEditingId(area.id);
    setFormData({
      areaName: area.areaName || '',
      areaCode: area.areaCode || '',
      gnDivisions: area.gnDivisions || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ areaName: '', areaCode: '', gnDivisions: '' });
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, "phm_areas", showDeleteModal.id));
        showToast("PHM කොට්ඨාසය පද්ධතියෙන් ඉවත් කරන ලදී. (Area Removed)");
        setShowDeleteModal(null);
        fetchData();
      } catch (err) {
        showToast("ඉවත් කිරීමේදී දෝෂයක් සිදු විය: " + err.message, 'error');
      }
    }
  };

  // Pre-seed Starter standard areas if empty for this MOH
  const handleSeedStandardAreas = async () => {
    setFormLoading(true);
    try {
      const defaultAreas = [
        { name: `${mohArea} Town - 01`, code: `PHM-${mohArea.slice(0, 3).toUpperCase()}-01`, gn: `${mohArea} North, ${mohArea} Central` },
        { name: `${mohArea} South - 02`, code: `PHM-${mohArea.slice(0, 3).toUpperCase()}-02`, gn: `${mohArea} South, Polwatta` },
        { name: `${mohArea} East - 03`, code: `PHM-${mohArea.slice(0, 3).toUpperCase()}-03`, gn: `${mohArea} East, Moragahahena` },
        { name: `${mohArea} West - 04`, code: `PHM-${mohArea.slice(0, 3).toUpperCase()}-04`, gn: `${mohArea} West, Watareka` }
      ];

      for (const area of defaultAreas) {
        const newRef = doc(collection(db, "phm_areas"));
        await setDoc(newRef, {
          areaName: area.name,
          areaCode: area.code,
          gnDivisions: area.gn,
          district: district,
          mohArea: mohArea,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      showToast(`ප්‍රාදේශීය සම්මත PHM කොට්ඨාස 4ක් ${mohArea} සඳහා සාර්ථකව සකස් කරන ලදී!`);
      fetchData();
    } catch (err) {
      showToast("දෝෂයක් සිදු විය: " + err.message, 'error');
    }
    setFormLoading(false);
  };

  // Metrics
  const totalAreas = phmAreas.length;
  const assignedAreasCount = phmAreas.filter(a => a.assignedMidwife).length;
  const vacantAreasCount = totalAreas - assignedAreasCount;
  
  const totalGNDivisions = useMemo(() => {
    let count = 0;
    phmAreas.forEach(a => {
      if (a.gnDivisions) {
        const gns = a.gnDivisions.split(',').map(s => s.trim()).filter(Boolean);
        count += gns.length;
      }
    });
    return count;
  }, [phmAreas]);

  const filteredAreas = useMemo(() => {
    if (!searchTerm.trim()) return phmAreas;
    const term = searchTerm.toLowerCase();
    return phmAreas.filter(a => 
      a.areaName.toLowerCase().includes(term) ||
      a.areaCode.toLowerCase().includes(term) ||
      a.gnDivisions.toLowerCase().includes(term) ||
      (a.assignedMidwife && a.assignedMidwife.toLowerCase().includes(term))
    );
  }, [phmAreas, searchTerm]);

  const availableMohAreas = getMohAreas(district);

  return (
    <MOHLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Toast Feedback */}
        {message && (
          <div className={`fixed top-5 right-5 z-[120] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-right duration-300 ${
            messageType === 'error' ? 'bg-red-900 border-l-4 border-red-500' : 'bg-slate-900 border-l-4 border-emerald-500'
          }`}>
            <span className="text-xl">{messageType === 'error' ? '⚠️' : '✅'}</span>
            <div className="text-sm font-bold">{message}</div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <ModalPortal>
            <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/75 backdrop-blur-md p-4 flex min-h-screen items-center justify-center animate-in fade-in duration-200">
              <div className="fixed inset-0" onClick={() => setShowDeleteModal(null)} aria-hidden="true" />
              <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center z-10 my-auto animate-in zoom-in-95 duration-200">
                <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-inner">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">PHM කොට්ඨාසය ඉවත් කරන්නද?</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  '{showDeleteModal.areaName}' කොට්ඨාසය පද්ධතියෙන් ඉවත් කිරීමට ඔබට සහතිකද?
                </p>

                {showDeleteModal.assignedMidwife && (
                  <div className="my-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 text-left">
                    ⚠️ අවධානයට: මෙම ප්‍රදේශය දැනට <strong>{showDeleteModal.assignedMidwife}</strong> නිලධාරිනියට පවරා ඇත.
                  </div>
                )}

                <div className="flex space-x-3 mt-6">
                  <button 
                    onClick={() => setShowDeleteModal(null)}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs uppercase"
                  >
                    නැත (Cancel)
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all text-xs uppercase"
                  >
                    ඔව් (Delete Area)
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

        {/* Executive Header Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-900 via-emerald-950 to-slate-950 text-white shadow-xl p-6 sm:p-8 border border-emerald-800/40">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>MOH Field Jurisdiction Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
                PHM සේවා කොට්ඨාස කළමනාකරණය
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/80 font-medium">
                Configure Structured PHM Divisions & GN Jurisdiction Coverage for <strong>{mohArea} MOH ({district})</strong>
              </p>
            </div>

            {/* Area Switcher */}
            <div className="flex flex-wrap items-center gap-2 bg-white/10 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl border border-white/10 shrink-0">
              <select
                value={district}
                onChange={handleDistrictChange}
                className="p-2 bg-slate-900/90 text-white border border-white/20 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-400 outline-none"
              >
                {DISTRICTS.map(d => (
                  <option key={d} value={d} className="bg-slate-900 text-white">{d}</option>
                ))}
              </select>

              <select
                value={mohArea}
                onChange={(e) => setMohArea(e.target.value)}
                className="p-2 bg-emerald-950 text-emerald-200 border border-emerald-400/40 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-400 outline-none"
              >
                {availableMohAreas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>

              <button
                onClick={fetchData}
                disabled={loading}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5 active:scale-95"
              >
                <span>{loading ? '...' : '🔄 Re-Sync'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Live Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
              📍
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">{totalAreas}</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">මුළු PHM කොට්ඨාස (Defined)</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
              👩‍⚕️
            </div>
            <div>
              <div className="text-2xl font-black text-blue-700">{assignedAreasCount}</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">නිලධාරිනියන් පවරා ඇත</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-amber-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
              ⏳
            </div>
            <div>
              <div className="text-2xl font-black text-amber-700">{vacantAreasCount}</div>
              <div className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">පුරප්පාඩු ප්‍රදේශ (Vacant)</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
              🏘️
            </div>
            <div>
              <div className="text-2xl font-black text-purple-700">{totalGNDivisions}</div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">ආවරණය වන GN වසම්</div>
            </div>
          </div>
        </div>

        {/* Add / Edit Form Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border-t-4 border-emerald-600 border border-slate-100">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                {editingId ? "PHM කොට්ඨාසය සංස්කරණය කිරීම" : "නව PHM සේවා කොට්ඨාසයක් එක් කිරීම"}
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {editingId ? "Update PHM Division details & GN division boundaries" : `Define a new PHM division for ${mohArea} MOH`}
              </p>
            </div>
            {editingId && (
              <button
                onClick={cancelEdit}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                ✕ Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Area Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">
                  PHM කොට්ඨාසයේ නම <span className="text-red-500">*</span>
                  <span className="text-[10px] text-slate-400 font-normal ml-1">(Division / Area Name)</span>
                </label>
                <input
                  type="text"
                  name="areaName"
                  placeholder="උදා: Pitipana Division - 603 / Homagama Town"
                  value={formData.areaName}
                  onChange={handleFormChange}
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>

              {/* Area Code */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">
                  කොට්ඨාස අංකය / Code
                  <span className="text-[10px] text-slate-400 font-normal ml-1">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="areaCode"
                  placeholder="උදා: 603 / PHM-HOM-01"
                  value={formData.areaCode}
                  onChange={handleFormChange}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-mono font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>

              {/* GN Divisions */}
              <div className="md:col-span-3">
                <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase tracking-wider">
                  ආවරණය වන ග්‍රාම නිලධාරී වසම් (GN Divisions)
                  <span className="text-[10px] text-slate-400 font-normal ml-1">(Comma separated)</span>
                </label>
                <input
                  type="text"
                  name="gnDivisions"
                  placeholder="උදා: Pitipana North, Pitipana South, Moragahahena, Watareka South"
                  value={formData.gnDivisions}
                  onChange={handleFormChange}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  💡 මෙහි ඇතුළත් කරන GN වසම්, Midwife ලියාපදිංචි කිරීමේදී එම ප්‍රදේශය තේරූ විට ස්වයංක්‍රීයව Form එකට Fill වේ.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {phmAreas.length === 0 && (
                <button
                  type="button"
                  onClick={handleSeedStandardAreas}
                  disabled={formLoading}
                  className="px-4 py-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold border border-emerald-200 transition-all flex items-center gap-1.5"
                >
                  ⚡ Auto-Generate 4 Standard Divisions for {mohArea}
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-emerald-950/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <span>{formLoading ? '⏳ සුරකිමින්...' : (editingId ? '💾 යාවත්කාලීන කරන්න (Update Area)' : '➕ කොට්ඨාසය එක් කරන්න (Add Area)')}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* PHM Areas List Table Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Table Header & Search Toolbar */}
          <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                {mohArea} MOH ප්‍රදේශයේ ලියාපදිංචි PHM කොට්ඨාස නාමාවලිය
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                Active PHM Divisions Registry ({district} District)
              </p>
            </div>

            {/* Search */}
            <div className="relative min-w-[220px] max-w-sm">
              <input
                type="text"
                placeholder="කොට්ඨාසය, Code, GN හෝ Midwife..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
              />
              <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2 text-slate-400 hover:text-slate-600 font-bold text-xs">✕</button>
              )}
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black tracking-wider border-b border-slate-100">
                  <th className="p-4">#</th>
                  <th className="p-4">PHM කොට්ඨාසයේ නම (Area Name)</th>
                  <th className="p-4">අංකය / Code</th>
                  <th className="p-4">ආවරණය වන GN වසම් (GN Divisions)</th>
                  <th className="p-4 text-center">පවරා ඇති Midwife</th>
                  <th className="p-4 text-right">ක්‍රියා (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-400 italic">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-3"></div>
                      දත්ත ලබාගනිමින් පවතී...
                    </td>
                  </tr>
                ) : filteredAreas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-400 italic">
                      {mohArea} ප්‍රදේශය සඳහා තවමත් PHM කොට්ඨාස සකස් කර නැත. ඉහත Form එක මඟින් අලුතින් එක් කරන්න.
                    </td>
                  </tr>
                ) : (
                  filteredAreas.map((area, idx) => (
                    <tr key={area.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-900 text-sm">{area.areaName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">MOH: {area.mohArea} ({area.district})</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs">
                          {area.areaCode || '—'}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs">
                        {area.gnDivisions ? (
                          <div className="flex flex-wrap gap-1">
                            {area.gnDivisions.split(',').map((gn, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-100 truncate">
                                {gn.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">නොදක්වා ඇත</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {area.assignedMidwife ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-xs border border-blue-200">
                              👩‍⚕️ {area.assignedMidwife}
                            </span>
                            {area.assignedMidwifePhone && (
                              <span className="text-[10px] text-slate-400 font-mono mt-0.5">{area.assignedMidwifePhone}</span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-black text-[11px] border border-amber-200 uppercase tracking-wider inline-block">
                            ✅ පුරප්පාඩු (Vacant)
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => startEdit(area)}
                            title="සංස්කරණය කරන්න"
                            className="p-2 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-xl transition-all shadow-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setShowDeleteModal(area)}
                            title="ඉවත් කරන්න"
                            className="p-2 bg-slate-100 hover:bg-red-600 hover:text-white text-red-600 rounded-xl transition-all shadow-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </MOHLayout>
  );
};

export default PHMAreas;
