import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useParams, useNavigate } from 'react-router-dom';
import HospitalLayout from '../../components/HospitalLayout';

const UpdateClinical = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mother, setMother] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [checkup, setCheckup] = useState({
    bp: '',
    weight: '',
    sugarLevel: '',
    fetalHeartRate: '',
    notes: '',
    checkedBy: 'Hospital Medical Staff'
  });

  useEffect(() => {
    const fetchMother = async () => {
      const docRef = doc(db, "mothers", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMother(docSnap.data());
      }
    };
    fetchMother();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const motherRef = doc(db, "mothers", id);
      await updateDoc(motherRef, {
        clinicalHistory: arrayUnion({
          ...checkup,
          date: new Date().toLocaleString('si-LK')
        })
      });
      setMessage("පරීක්ෂණ වාර්තාව සාර්ථකව සුරැකිණි! (Record Saved)");
      setTimeout(() => navigate('/hospital-admin/admissions'), 2000);
    } catch (error) {
      setMessage("දෝෂයක් සිදු විය. නැවත උත්සාහ කරන්න.");
    }
    setLoading(false);
  };

  if (!mother) return <HospitalLayout><div className="p-10 text-center italic text-gray-400">Loading Patient Data...</div></HospitalLayout>;

  return (
    <HospitalLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-indigo-50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{mother.fullName}</h2>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">NIC: {mother.nic} | Hospital In-patient Update</p>
          </div>
          <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${mother.riskStatus === 'High-Risk' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
            {mother.riskStatus}
          </div>
        </div>

        {message && (
          <div className="p-4 bg-slate-900 text-white text-xs font-bold rounded-2xl border-l-4 border-green-500 animate-in fade-in duration-300">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">වෛද්‍ය පරීක්ෂණ දත්ත (Checkup Details)</h3>
          </div>

          <InputField label="රුධිර පීඩනය (Blood Pressure)" placeholder="120/80" value={checkup.bp} onChange={(e) => setCheckup({...checkup, bp: e.target.value})} required />
          <InputField label="බර (Weight - kg)" placeholder="65.5" value={checkup.weight} onChange={(e) => setCheckup({...checkup, weight: e.target.value})} required />
          <InputField label="රුධිරයේ සීනි මට්ටම (Sugar Level)" placeholder="95 mg/dL" value={checkup.sugarLevel} onChange={(e) => setCheckup({...checkup, sugarLevel: e.target.value})} />
          <InputField label="කලලයේ හෘද ස්පන්දනය (Fetal Heart Rate)" placeholder="140 bpm" value={checkup.fetalHeartRate} onChange={(e) => setCheckup({...checkup, fetalHeartRate: e.target.value})} />
          
          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">විශේෂ වෛද්‍ය සටහන් (Doctor's Notes)</label>
            <textarea 
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              rows="4"
              value={checkup.notes}
              onChange={(e) => setCheckup({...checkup, notes: e.target.value})}
            ></textarea>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="md:col-span-2 bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all uppercase text-xs tracking-widest"
          >
            {loading ? "සුරකිමින්..." : "වාර්තාව යාවත්කාලීන කරන්න (Save Checkup)"}
          </button>
        </form>
      </div>
    </HospitalLayout>
  );
};

const InputField = ({ label, ...props }) => (
  <div>
    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">{label}</label>
    <input 
      className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
      {...props}
    />
  </div>
);

export default UpdateClinical;