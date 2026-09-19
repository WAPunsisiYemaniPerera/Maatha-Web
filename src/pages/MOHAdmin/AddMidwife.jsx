import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import MOHLayout from '../../components/MOHLayout';
import { DISTRICTS, getMohAreas, findDistrictByMohArea } from '../../data/sriLankaLocations';

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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);

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

  const fetchMidwives = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "midwives"));
      const midwifeData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMidwives(midwifeData.filter(m => m.mohArea === formData.mohOffice));
    } catch (err) {
      console.error("Error fetching midwives:", err);
    }
  };

  useEffect(() => { 
    fetchMidwives(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.mohOffice]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'district') {
      const mohs = getMohAreas(value);
      setFormData(prev => ({
        ...prev,
        district: value,
        mohOffice: mohs.length > 0 ? mohs[0] : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.district || !formData.mohOffice) {
      setMessage("කරුණාකර දිස්ත්‍රික්කය සහ MOH ප්‍රදේශය තෝරන්න.");
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "midwives", editingId), {
          fullName: formData.fullName,
          phone: formData.phone,
          district: formData.district,
          mohArea: formData.mohOffice,
          serviceArea: formData.serviceArea,
          gnDivisions: formData.gnDivisions,
          employeeId: formData.employeeId
        });
        setMessage("නිලධාරිනියගේ විස්තර යාවත්කාලීන කරන ලදී! (Details Updated)");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const uid = userCredential.user.uid;

        await setDoc(doc(db, "users", uid), { email: formData.email, role: "midwife", uid });
        await setDoc(doc(db, "midwives", uid), {
          fullName: formData.fullName,
          nic: formData.nic,
          phone: formData.phone,
          email: formData.email,
          employeeId: formData.employeeId,
          district: formData.district,
          mohArea: formData.mohOffice,
          serviceArea: formData.serviceArea,
          gnDivisions: formData.gnDivisions,
          midwifeId: uid,
          createdAt: new Date()
        });
        setMessage("නිලධාරිනිය සාර්ථකව පද්ධතියට එක් කරන ලදී! (Midwife Registered)");
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
      setEditingId(null);
      fetchMidwives();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage("දෝෂයක් සිදු විය: " + error.message);
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      await deleteDoc(doc(db, "midwives", showDeleteModal));
      await deleteDoc(doc(db, "users", showDeleteModal));
      fetchMidwives();
      setMessage("නිලධාරිනිය පද්ධතියෙන් ඉවත් කරන ලදී. (Removed)");
      setShowDeleteModal(null);
      setTimeout(() => setMessage(''), 3000);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const availableMohAreas = getMohAreas(formData.district);

  return (
    <MOHLayout>
      {/* Popups & Modals */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center text-sm">
              <h3 className="text-lg font-bold text-gray-800">නිලධාරිනිය ඉවත් කරන්නද?</h3>
              <p className="font-black text-gray-400 uppercase tracking-tighter mb-6">Remove this midwife?</p>
              <div className="flex space-x-3">
                <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-2 bg-gray-100 rounded-lg font-bold">නැත (No)</button>
                <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold shadow-lg shadow-red-200">ඔව් (Yes)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="fixed top-5 right-5 z-[110] bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl border-l-4 border-green-500 animate-in slide-in-from-right duration-500">
          <p className="text-sm font-bold tracking-tight">{message}</p>
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border-t-4 border-green-600">
          <div className="mb-6 border-b pb-2 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{editingId ? "නිලධාරිනියගේ විස්තර සංස්කරණය" : "අලුත් පවුල් සෞඛ්‍ය නිලධාරිනියක එක් කිරීම"}</h2>
              <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Midwife (PHM) Registration</div>
            </div>
            <div className="text-right">
              <span className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full border border-green-200">
                {formData.district} &gt; {formData.mohOffice}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <InputField label="සම්පූර්ණ නම" sub="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required />
              <InputField label="ජාතික හැඳුනුම්පත් අංකය" sub="NIC Number" name="nic" value={formData.nic} onChange={handleChange} required disabled={!!editingId} />
              <InputField label="දුරකථන අංකය" sub="Phone Number" name="phone" value={formData.phone} onChange={handleChange} required />
              <InputField label="සේවක අංකය" sub="Employee ID" name="employeeId" value={formData.employeeId} onChange={handleChange} required />

              {/* District Selector */}
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1">
                  දිස්ත්‍රික්කය <span className="text-[10px] font-black text-gray-400 uppercase ml-1">(District)</span>
                </label>
                <select
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  required
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                >
                  {DISTRICTS.map(dist => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <InputField label="විද්‍යුත් තැපෑල" sub="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} required disabled={!!editingId} />

              {/* MOH Area Selector */}
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1">
                  MOH ප්‍රදේශය <span className="text-[10px] font-black text-gray-400 uppercase ml-1">(MOH Area)</span>
                </label>
                <select
                  name="mohOffice"
                  value={formData.mohOffice}
                  onChange={handleChange}
                  required
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                >
                  {availableMohAreas.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              {/* PHM Service Area */}
              <InputField 
                label="සේවා ප්‍රදේශය (PHM Area)" 
                sub="Public Health Midwife Area Name / Code" 
                placeholder="උදා: 602-B Homagama Town / Pitipana"
                name="serviceArea" 
                value={formData.serviceArea} 
                onChange={handleChange} 
                required 
              />

              <InputField label="ග්‍රාම නිලධාරී වසම්" sub="GN Divisions (Comma separated)" name="gnDivisions" value={formData.gnDivisions} onChange={handleChange} required />
              {!editingId && <InputField label="මුරපදය" sub="Login Password" name="password" type="password" value={formData.password} onChange={handleChange} required />}
            </div>

            <button type="submit" disabled={loading} className="md:col-span-2 bg-green-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-green-700 active:scale-95 transition-all mt-4 uppercase tracking-tighter">
              {loading ? "ක්‍රියාත්මක වෙමින්... (Processing)" : (editingId ? "යාවත්කාලීන කරන්න (Update Details)" : "නිලධාරිනිය පද්ධතියට එක් කරන්න (Register Midwife)")}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData(prev => ({ ...prev, fullName:'', nic:'', phone:'', email:'', employeeId:'', serviceArea:'', gnDivisions:'', password:'' })); }} className="md:col-span-2 bg-gray-500 text-white font-bold py-2 rounded-xl hover:bg-gray-600 transition-all">
                Cancel Edit
              </button>
            )}
          </form>
        </div>

        {/* Table List */}
        <div className="bg-white p-8 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">ප්‍රදේශයේ ලියාපදිංචි නිලධාරිනියන්</h2>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Registered Midwives in {formData.mohOffice} ({formData.district})
              </div>
            </div>
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              එකතුව: {midwives.length}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-black">
                <tr>
                  <th className="p-4">නම හා සේවක අංකය (Name & ID)</th>
                  <th className="p-4">MOH ප්‍රදේශය (MOH Area)</th>
                  <th className="p-4">සේවා ප්‍රදේශය (PHM Area)</th>
                  <th className="p-4 text-center">ක්‍රියාකාරකම් (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {midwives.length > 0 ? midwives.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{m.fullName}</div>
                      <div className="text-[10px] text-gray-400 font-bold">{m.employeeId}</div>
                    </td>
                    <td className="p-4 text-xs font-semibold text-blue-600">{m.mohArea}</td>
                    <td className="p-4 font-medium text-gray-700 bg-green-50/50 rounded-lg">{m.serviceArea}</td>
                    <td className="p-4 flex justify-center space-x-2">
                      <button onClick={() => startEdit(m)} title="සංස්කරණය" className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                      </button>
                      <button onClick={() => setShowDeleteModal(m.id)} title="ඉවත් කරන්න" className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-400 italic">
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
    <label className="block text-[12px] font-bold text-gray-700 mb-1">{label} <span className="text-[10px] font-black text-gray-400 uppercase ml-1">({sub})</span></label>
    <input className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm font-medium" {...props} />
  </div>
);

export default AddMidwife;