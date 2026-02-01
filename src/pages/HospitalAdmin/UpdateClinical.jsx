import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import HospitalLayout from '../../components/HospitalLayout';

const UpdateClinical = () => {
  const { id } = useParams(); // මවගේ ID එක URL එකෙන් ලබා ගනී
  const navigate = useNavigate();
  const [mother, setMother] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updateType, setUpdateType] = useState('clinical'); // 'clinical' හෝ 'delivery'

  const [clinicalData, setClinicalData] = useState({ bp: '', weight: '', notes: '' });
  const [deliveryData, setDeliveryData] = useState({ date: '', time: '', weight: '', outcome: 'Normal', complications: '' });

  useEffect(() => {
    const fetchMother = async () => {
      const docRef = doc(db, "mothers", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setMother(docSnap.data());
    };
    fetchMother();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const motherRef = doc(db, "mothers", id);
      if (updateType === 'clinical') {
        await updateDoc(motherRef, {
          clinicalHistory: arrayUnion({ ...clinicalData, date: new Date() })
        });
      } else {
        await updateDoc(motherRef, {
          deliveryRecord: { ...deliveryData, updatedAt: new Date() },
          status: "Post-natal"
        });
      }
      alert("දත්ත සාර්ථකව යාවත්කාලීන කරන ලදී!");
      navigate('/hospital-admin/admissions');
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (!mother) return <HospitalLayout><p className="p-10 italic text-gray-400 text-center">මවගේ දත්ත පද්ධතියෙන් සොයමින්...</p></HospitalLayout>;

  return (
    <HospitalLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 border-b pb-4 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black text-slate-800">{mother.fullName}</h2>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Medical History Update</p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setUpdateType('clinical')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${updateType === 'clinical' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}>Clinical Note</button>
            <button onClick={() => setUpdateType('delivery')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${updateType === 'delivery' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}>Delivery Record</button>
          </div>
        </div>

        <form onSubmit={handleUpdate} className="bg-white p-8 rounded-3xl shadow-sm border border-indigo-50 space-y-6">
          {updateType === 'clinical' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="රුධිර පීඩනය (Blood Pressure)" placeholder="120/80" value={clinicalData.bp} onChange={(e) => setClinicalData({...clinicalData, bp: e.target.value})} />
              <Input label="බර (Current Weight - kg)" placeholder="65" value={clinicalData.weight} onChange={(e) => setClinicalData({...clinicalData, weight: e.target.value})} />
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">විශේෂ සටහන් (Clinical Notes)</label>
                <textarea className="w-full p-4 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 text-sm italic" rows="4" value={clinicalData.notes} onChange={(e) => setClinicalData({...clinicalData, notes: e.target.value})}></textarea>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="ප්‍රසූත කළ දිනය (Delivery Date)" type="date" value={deliveryData.date} onChange={(e) => setDeliveryData({...deliveryData, date: e.target.value})} />
              <Input label="ප්‍රසූත කළ වේලාව (Time)" type="time" value={deliveryData.time} onChange={(e) => setDeliveryData({...deliveryData, time: e.target.value})} />
              <Input label="බිළිඳාගේ බර (Infant Weight - kg)" placeholder="3.2" value={deliveryData.weight} onChange={(e) => setDeliveryData({...deliveryData, weight: e.target.value})} />
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">ප්‍රසූත අවස්ථාව (Outcome)</label>
                <select className="w-full p-3 bg-gray-50 rounded-xl border-none text-sm font-bold" value={deliveryData.outcome} onChange={(e) => setDeliveryData({...deliveryData, outcome: e.target.value})}>
                  <option value="Normal">Normal Delivery</option>
                  <option value="LSCS">LSCS (Cesarean)</option>
                  <option value="Forceps">Forceps/Vacuum</option>
                </select>
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest">
            {loading ? "යාවත්කාලීන වෙමින්..." : "දත්ත ගබඩා කරන්න (Save Records)"}
          </button>
        </form>
      </div>
    </HospitalLayout>
  );
};

const Input = ({ label, ...props }) => (
  <div>
    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">{label}</label>
    <input className="w-full p-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" {...props} />
  </div>
);

export default UpdateClinical;