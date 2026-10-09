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
    symptoms: '',
    urineProtein: '',
    urineSugar: '',
    edema: 'None',
    scanResults: '',
    treatmentGiven: '',
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
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-teal-50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{mother.fullName}</h2>
            <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mt-1">NIC: {mother.nic} | Hospital In-patient Clinical Update</p>
          </div>
          <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${mother.riskStatus === 'High-Risk' ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-700'}`}>
            {mother.riskStatus || 'Normal'}
          </div>
        </div>

        {message && (
          <div className="p-4 bg-slate-900 text-white text-xs font-bold rounded-2xl border-l-4 border-teal-400 animate-in fade-in duration-300">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">වෛද්‍ය පරීක්ෂණ දත්ත (Clinical Examination Details)</h3>
          </div>

          <InputField label="රුධිර පීඩනය (Blood Pressure)" placeholder="120/80" value={checkup.bp} onChange={(e) => setCheckup({...checkup, bp: e.target.value})} required />
          <InputField label="බර (Weight - kg)" placeholder="65.5" value={checkup.weight} onChange={(e) => setCheckup({...checkup, weight: e.target.value})} required />
          <InputField label="රුධිරයේ සීනි මට්ටම (Sugar Level)" placeholder="95 mg/dL" value={checkup.sugarLevel} onChange={(e) => setCheckup({...checkup, sugarLevel: e.target.value})} />
          <InputField label="කලලයේ හෘද ස්පන්දනය (Fetal Heart Rate)" placeholder="140 bpm" value={checkup.fetalHeartRate} onChange={(e) => setCheckup({...checkup, fetalHeartRate: e.target.value})} />
          
          <div className="md:col-span-2">
            <InputField label="ප්‍රධාන රෝග ලක්ෂණ (Presenting Symptoms / Complaints)" placeholder="e.g. Headache, blurred vision, abdominal pain" value={checkup.symptoms} onChange={(e) => setCheckup({...checkup, symptoms: e.target.value})} />
          </div>

          <div className="md:col-span-2 mt-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">මුත්‍රා පරීක්ෂණ සහ වෙනත් (Urine & Physical Tests)</h3>
          </div>
          
          <InputField label="මුත්‍රා ප්‍රෝටීන් (Urine Protein)" placeholder="Nil, Trace, ++" value={checkup.urineProtein} onChange={(e) => setCheckup({...checkup, urineProtein: e.target.value})} />
          <InputField label="මුත්‍රා සීනි (Urine Sugar)" placeholder="Nil, Trace, ++" value={checkup.urineSugar} onChange={(e) => setCheckup({...checkup, urineSugar: e.target.value})} />
          
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">ඉදිමුම (Edema)</label>
            <select 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all"
              value={checkup.edema}
              onChange={(e) => setCheckup({...checkup, edema: e.target.value})}
            >
              <option value="None">නැත (None)</option>
              <option value="Mild">සුළු වශයෙන් (Mild / Ankle)</option>
              <option value="Severe">දැඩි (Severe / Generalized)</option>
            </select>
          </div>
          <InputField label="ස්කෑන් වාර්තා (Scan / USS Results)" placeholder="Normal / Low AFI / etc." value={checkup.scanResults} onChange={(e) => setCheckup({...checkup, scanResults: e.target.value})} />

          <div className="md:col-span-2 mt-4">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">ප්‍රතිකාර සහ සටහන් (Treatments & Doctor's Notes)</h3>
          </div>

          <div className="md:col-span-2">
            <InputField label="ලබාදුන් ප්‍රතිකාර (Treatment Given)" placeholder="e.g. Nifedipine 10mg, IV fluids" value={checkup.treatmentGiven} onChange={(e) => setCheckup({...checkup, treatmentGiven: e.target.value})} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">විශේෂ වෛද්‍ය සටහන් (Doctor's Notes)</label>
            <textarea 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all"
              rows="4"
              value={checkup.notes}
              onChange={(e) => setCheckup({...checkup, notes: e.target.value})}
            ></textarea>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="md:col-span-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-teal-600/20 active:scale-95 transition-all uppercase text-xs tracking-widest"
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
    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">{label}</label>
    <input 
      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 outline-none transition-all"
      {...props}
    />
  </div>
);

export default UpdateClinical;