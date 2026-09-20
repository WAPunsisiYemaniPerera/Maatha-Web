import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import HospitalLayout from '../../components/HospitalLayout';
import ModalPortal from '../../components/ModalPortal';
import { Link } from 'react-router-dom';

const Admissions = () => {
  const [admittedMothers, setAdmittedMothers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [transferId, setTransferId] = useState(null);
  const [newHospital, setNewHospital] = useState('');
  
  const hospitalName = "General Hospital Colombo"; 
  
  const fetchAdmissions = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "mothers"), where("hospitalName", "==", hospitalName));
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAdmittedMothers(list);
    } catch (error) {
      console.error("Error fetching admissions:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAdmissions();
  }, []);

  const handleDischarge = async (motherId) => {
    if (window.confirm("මෙම මව රෝහලෙන් පිටත් කිරීමට (Discharge) ඔබට සහතිකද?")) {
      try {
        const motherRef = doc(db, "mothers", motherId);
        await updateDoc(motherRef, {
          hospitalName: null,
          status: "Discharged",
          dischargedDate: new Date()
        });
        setMessage("මව සාර්ථකව රෝහලෙන් පිටත් කරන ලදී. (Discharged Successfully)");
        fetchAdmissions();
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        setMessage("දෝෂයක් සිදු විය. නැවත උත්සාහ කරන්න.");
      }
    }
  };

  const handleTransfer = async () => {
    if (!newHospital) return;
    try {
      const motherRef = doc(db, "mothers", transferId);
      await updateDoc(motherRef, {
        hospitalName: newHospital,
        transferDate: new Date(),
        lastHospital: hospitalName
      });
      setMessage(`මව සාර්ථකව ${newHospital} වෙත මාරු කරන ලදී.`);
      setTransferId(null);
      setNewHospital('');
      fetchAdmissions();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage("මාරු කිරීමේදී දෝෂයක් සිදු විය.");
    }
  };

  return (
    <HospitalLayout>
      {/* Transfer Modal */}
      {transferId && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-blue-950/70 backdrop-blur-md p-4 flex min-h-screen items-center justify-center animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setTransferId(null)} aria-hidden="true" />
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center z-10 my-auto animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-gray-800 mb-1">වෙනත් රෝහලකට මාරු කිරීම</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Transfer Mother to Another Hospital</p>
              <input 
                type="text" 
                placeholder="රෝහලේ නම (e.g. Teaching Hospital Kandy)" 
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl mb-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={newHospital}
                onChange={(e) => setNewHospital(e.target.value)}
              />
              <div className="flex space-x-2">
                <button onClick={() => setTransferId(null)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-xs uppercase text-gray-600 transition-all">Cancel</button>
                <button onClick={handleTransfer} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-xs uppercase text-white shadow-lg shadow-indigo-200 transition-all">Confirm Transfer</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">නේවාසික මව්වරුන්ගේ ලැයිස්තුව</h2>
          <div className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mt-1">
            Currently Admitted Mothers in {hospitalName}
          </div>
        </div>
        <div className="bg-indigo-50 px-6 py-2 rounded-2xl border border-indigo-100">
          <p className="text-[9px] font-black text-indigo-400 uppercase">මුළු එකතුව (Total)</p>
          <p className="text-xl font-black text-indigo-700">{admittedMothers.length}</p>
        </div>
      </div>

      {message && (
        <div className="mb-6 p-4 bg-slate-900 text-white text-xs font-bold rounded-xl border-l-4 border-indigo-500 animate-in slide-in-from-top duration-500">
          {message}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center italic text-gray-400 font-medium">දත්ත ලබාගනිමින් පවතී...</div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="p-5">මවගේ නම සහ හැඳුනුම්පත (Mother & NIC)</th>
                <th className="p-5">අවදානම් තත්ත්වය (Risk)</th>
                <th className="p-5">ඇතුළත් කළ දිනය (Admitted Date)</th>
                <th className="p-5 text-right">ක්‍රියා (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {admittedMothers.length > 0 ? admittedMothers.map((mother) => (
                <tr key={mother.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="p-5">
                    <div className="font-bold text-gray-800 text-sm">{mother.fullName}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">NIC: {mother.nic}</div>
                  </td>
                  <td className="p-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      mother.riskStatus === 'High-Risk' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                    }`}>
                      {mother.riskStatus}
                    </span>
                  </td>
                  <td className="p-5">
                    <div className="text-xs font-bold text-gray-600">
                      {mother.admittedDate?.toDate().toLocaleDateString('si-LK') || "සටහන් කර නැත"}
                    </div>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end space-x-2">
                      <Link 
  to={`/hospital-admin/update-clinical/${mother.id}`}
  className="text-[10px] font-black uppercase text-indigo-600 hover:underline px-3 py-1"
>
  View Records
</Link>
                      <button 
                        onClick={() => setTransferId(mother.id)}
                        className="bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase px-4 py-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                      >
                        Transfer
                      </button>
                      <button 
                        onClick={() => handleDischarge(mother.id)}
                        className="bg-red-50 text-red-600 text-[10px] font-black uppercase px-4 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                      >
                        Discharge
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="p-20 text-center text-gray-400 italic text-sm">
                    දැනට රෝහලේ කිසිදු මවක් ඇතුළත් වී නොමැත. (No admissions found)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </HospitalLayout>
  );
};

export default Admissions;