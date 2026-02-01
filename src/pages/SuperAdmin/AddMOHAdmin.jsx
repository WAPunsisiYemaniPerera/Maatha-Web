import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import AdminLayout from '../../components/AdminLayout';

const AddMOHAdmin = () => {
  const [formData, setFormData] = useState({ name: '', mohArea: '', district: '', email: '', password: '' });
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null); 

  const fetchAdmins = async () => {
    const querySnapshot = await getDocs(collection(db, "moh_admins"));
    const adminData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setAdmins(adminData);
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "moh_admins", editingId), {
          fullName: formData.name,
          mohArea: formData.mohArea,
          district: formData.district
        });
        setMessage("විස්තර සාර්ථකව යාවත්කාලීන කරන ලදී! (Details Updated Successfully)");
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const uid = userCredential.user.uid;

        await setDoc(doc(db, "users", uid), { email: formData.email, role: "moh_admin", uid });
        await setDoc(doc(db, "moh_admins", uid), {
          fullName: formData.name,
          mohArea: formData.mohArea,
          district: formData.district,
          email: formData.email,
          adminId: uid,
          createdAt: new Date()
        });
        setMessage("MOH Admin සාර්ථකව එක් කරන ලදී! (Admin Added Successfully)");
      }
      setFormData({ name: '', mohArea: '', district: '', email: '', password: '' });
      setEditingId(null);
      fetchAdmins();
      // තත්පර 3කට පසු පණිවිඩය ඉවත් කිරීම
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage("දෝෂයක් සිදු විය ");
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (showDeleteModal) {
      await deleteDoc(doc(db, "moh_admins", showDeleteModal));
      await deleteDoc(doc(db, "users", showDeleteModal));
      fetchAdmins();
      setMessage("පාලකවරයා ඉවත් කරන ලදී. (Admin Removed Successfully)");
      setShowDeleteModal(null);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const startEdit = (admin) => {
    setEditingId(admin.id);
    setFormData({ name: admin.fullName, mohArea: admin.mohArea, district: admin.district, email: admin.email, password: '*****' });
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
              <h3 className="text-lg font-bold text-gray-800">පාලකවරයා ඉවත් කරන්නද?</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Are you sure you want to remove this admin?</p>
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

      <div className="max-w-4xl mx-auto space-y-8 transition-all duration-500">
        {/* Form එක */}
        <div className="bg-white p-8 rounded-lg shadow-md border-t-4 border-blue-600">
          <div className="mb-6 border-b pb-2">
            <h2 className="text-2xl font-bold text-gray-800">
              {editingId ? "පාලක විස්තර සංස්කරණය" : "අලුත් MOH පාලකවරයෙකු එක් කිරීම"}
            </h2>
            <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
              {editingId ? "Edit Admin Details" : "Add New MOH Administrator"}
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input type="text" name="name" placeholder="සම්පූර්ණ නම (Full Name)" value={formData.name} onChange={handleChange} required className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" name="mohArea" placeholder="MOH ප්‍රදේශය (MOH Area)" value={formData.mohArea} onChange={handleChange} required className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              <input type="text" name="district" placeholder="දිස්ත්‍රික්කය (District)" value={formData.district} onChange={handleChange} required className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            {!editingId && (
              <>
                <input type="email" name="email" placeholder="ඊමේල් ලිපිනය (Email Address)" value={formData.email} onChange={handleChange} required className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                <input type="password" name="password" placeholder="මුරපදය (Password)" value={formData.password} onChange={handleChange} required className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
              </>
            )}
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow-lg active:scale-95 transition-all">
              <div className="text-base">{loading ? "ක්‍රියාත්මක වෙමින්..." : (editingId ? "යාවත්කාලීන කරන්න" : "පද්ධතියට එක් කරන්න")}</div>
              <div className="text-[10px] uppercase opacity-80">{loading ? "Processing..." : (editingId ? "Update Details" : "Register Admin")}</div>
            </button>
            {editingId && (
               <button type="button" onClick={() => { setEditingId(null); setFormData({name:'', mohArea:'', district:'', email:'', password:''}) }} className="w-full bg-gray-500 text-white font-bold py-2 rounded-lg mt-2 hover:bg-gray-600 transition-all">
                Cancel Edit
               </button>
            )}
          </form>
        </div>

        {/* ලැයිස්තුව (Table) */}
        <div className="bg-white p-8 rounded-lg shadow-md border-t-4 border-slate-700">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800">දැනට සිටින MOH පාලකවරුන්</h2>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current MOH Administrators</div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left text-sm font-bold text-gray-600 uppercase">
                  <th className="p-3">නම (Name)</th>
                  <th className="p-3">ප්‍රදේශය (Area)</th>
                  <th className="p-3 text-center">ක්‍රියාකාරකම් (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {admins.map(admin => (
                  <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-sm font-semibold text-gray-700">{admin.fullName}</td>
                    <td className="p-3 text-sm text-gray-600">{admin.mohArea}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AddMOHAdmin;