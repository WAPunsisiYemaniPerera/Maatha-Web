import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import AdminLayout from '../../components/AdminLayout';

const AddHospitalAdmin = () => {
  const [formData, setFormData] = useState({
    name: '',
    hospitalName: '',
    district: '',
    email: '',
    password: ''
  });
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null); // ඉවත් කිරීමට අවශ්‍ය ID එක තබා ගැනීමට

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (editingId) {
        await updateDoc(doc(db, "hospital_admins", editingId), {
          fullName: formData.name,
          hospitalName: formData.hospitalName,
          district: formData.district
        });
        setMessage("රෝහල් පාලක විස්තර සාර්ථකව යාවත්කාලීන කරන ලදී! (Details Updated Successfully)");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const uid = userCredential.user.uid;

        await setDoc(doc(db, "users", uid), {
          email: formData.email,
          role: "hospital_admin",
          uid: uid
        });

        await setDoc(doc(db, "hospital_admins", uid), {
          fullName: formData.name,
          hospitalName: formData.hospitalName,
          district: formData.district,
          email: formData.email,
          adminId: uid,
          createdAt: new Date()
        });
        setMessage("රෝහල් පාලකවරයා සාර්ථකව පද්ධතියට එක් කරන ලදී! (Admin Added Successfully)");
      }

      setFormData({ name: '', hospitalName: '', district: '', email: '', password: '' });
      setEditingId(null);
      fetchHospitalAdmins();
      // තත්පර 3කට පසු පණිවිඩය ඉවත් කිරීම
      setTimeout(() => setMessage(''), 3000);

    } catch (error) {
      setMessage("දෝෂයක් සිදු විය: " + error.message);
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, "hospital_admins", showDeleteModal));
        await deleteDoc(doc(db, "users", showDeleteModal));
        fetchHospitalAdmins();
        setMessage("රෝහල් පාලකවරයා සාර්ථකව ඉවත් කරන ලදී. (Admin Removed Successfully)");
        setShowDeleteModal(null);
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage("ඉවත් කිරීමේදී දෝෂයක් සිදු විය.");
      }
    }
  };

  const startEdit = (admin) => {
    setEditingId(admin.id);
    setFormData({
      name: admin.fullName,
      hospitalName: admin.hospitalName,
      district: admin.district,
      email: admin.email,
      password: '*****' 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AdminLayout>
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center">
              <div className="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800">රෝහල් පාලකවරයා ඉවත් කරන්නද?</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Are you sure you want to remove this hospital admin?</p>
              <div className="flex space-x-3">
                <button onClick={() => setShowDeleteModal(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold text-xs uppercase">නැත (No)</button>
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs uppercase shadow-lg shadow-red-200">ඔව් (Yes)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Popup (Toast) */}
      {message && (
        <div className="fixed top-5 right-5 z-[110] bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl border-l-4 border-blue-500 flex items-center space-x-4 animate-in slide-in-from-right duration-500">
          <div className="bg-blue-500 rounded-full p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-bold tracking-tight">{message}</p>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-10 transition-all duration-500">
        {/* ඇතුළත් කිරීමේ Form එක */}
        <div className="bg-white p-8 rounded-lg shadow-md border-t-4 border-blue-600">
          <div className="mb-6 border-b pb-2">
            <h2 className="text-2xl font-bold text-gray-800">
              {editingId ? "රෝහල් පාලක විස්තර සංස්කරණය" : "අලුත් රෝහල් පාලකවරයෙකු එක් කිරීම"}
            </h2>
            <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              {editingId ? "Edit Hospital Admin Details" : "Add New Hospital Administrator"}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">පාලකවරයාගේ නම (Admin Name)</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full p-2 border rounded mt-1 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700">රෝහලේ නම (Hospital Name)</label>
                <input type="text" name="hospitalName" value={formData.hospitalName} onChange={handleChange} required className="w-full p-2 border rounded mt-1 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700">දිස්ත්‍රික්කය (District)</label>
                <input type="text" name="district" value={formData.district} onChange={handleChange} required className="w-full p-2 border rounded mt-1 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            {!editingId && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">ඊමේල් ලිපිනය (Email Address)</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full p-2 border rounded mt-1 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700">මුරපදය (Password)</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} required className="w-full p-2 border rounded mt-1 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </>
            )}

            <div className="flex space-x-3 pt-4">
              <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-all shadow-lg active:scale-95">
                <div className="text-base">{loading ? "ක්‍රියාත්මක වෙමින්..." : (editingId ? "යාවත්කාලීන කරන්න" : "රෝහල් පාලකවරයා ඇතුළත් කරන්න")}</div>
                <div className="text-[10px] uppercase opacity-80">{loading ? "Processing..." : (editingId ? "Update Admin" : "Register Hospital Admin")}</div>
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setFormData({name:'', hospitalName:'', district:'', email:'', password:''}) }} className="bg-gray-500 text-white px-6 rounded-lg font-bold hover:bg-gray-600 transition-all">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ලැයිස්තුව පෙන්වන Table එක */}
        <div className="bg-white p-8 rounded-lg shadow-md border-t-4 border-slate-700">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800">දැනට සිටින රෝහල් පාලකවරුන්</h2>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registered Hospital Administrators</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left text-sm font-bold text-gray-600 uppercase">
                  <th className="p-3">නම (Name)</th>
                  <th className="p-3">රෝහල (Hospital)</th>
                  <th className="p-3">දිස්ත්‍රික්කය (District)</th>
                  <th className="p-3 text-center">ක්‍රියාකාරකම් (Actions)</th>
                </tr>
              </thead>
              <tbody className="text-sm text-gray-700 divide-y divide-gray-100">
                {admins.length > 0 ? admins.map(admin => (
                  <tr key={admin.id} className="hover:bg-gray-50 transition">
                    <td className="p-3 font-semibold text-gray-700">{admin.fullName}</td>
                    <td className="p-3">{admin.hospitalName}</td>
                    <td className="p-3">{admin.district}</td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center space-x-2">
                        <button onClick={() => startEdit(admin)} title="සංස්කරණය / Edit" className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setShowDeleteModal(admin.id)} title="ඉවත් කරන්න / Delete" className="p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-gray-400 italic">කිසිදු රෝහල් පාලකවරයෙකු හමු නොවීය. No administrators found.</td>
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