import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import MOHLayout from '../../components/MOHLayout';

const ManageMidwives = () => {
  const [midwives, setMidwives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const mohArea = "Colombo"; 

  const fetchMidwivesWithStats = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "midwives"), where("mohArea", "==", mohArea));
      const querySnapshot = await getDocs(q);
      const midwifeList = [];
      
      for (const midwifeDoc of querySnapshot.docs) {
        const midwifeData = midwifeDoc.data();
        const motherQuery = query(collection(db, "mothers"), where("serviceArea", "==", midwifeData.serviceArea));
        const motherSnap = await getDocs(motherQuery);
        const highRiskCount = motherSnap.docs.filter(d => d.data().riskStatus === 'High-Risk').length;

        midwifeList.push({
          id: midwifeDoc.id,
          ...midwifeData,
          motherCount: motherSnap.size,
          highRiskCount: highRiskCount
        });
      }
      setMidwives(midwifeList);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMidwivesWithStats();
  }, [mohArea]);

  const confirmDelete = async () => {
    if (showDeleteModal) {
      try {
        await deleteDoc(doc(db, "midwives", showDeleteModal));
        await deleteDoc(doc(db, "users", showDeleteModal));
        setShowDeleteModal(null);
        setMessage("නිලධාරිනිය සාර්ථකව ඉවත් කරන ලදී. (Removed)");
        fetchMidwivesWithStats();
        setTimeout(() => setMessage(''), 3000);
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  return (
    <MOHLayout>
      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-800">නිලධාරිනිය ඉවත් කරන්නද?</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Are you sure you want to remove this midwife?</p>
              <div className="flex space-x-3">
                <button onClick={() => setShowDeleteModal(null)} className="flex-1 py-2 bg-gray-100 rounded-lg font-bold text-xs uppercase">No</button>
                <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold text-xs uppercase shadow-lg shadow-red-200">Yes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {message && (
        <div className="fixed top-5 right-5 z-[110] bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl border-l-4 border-green-500 animate-in slide-in-from-right duration-500">
          <p className="text-sm font-bold tracking-tight">{message}</p>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">නිලධාරීන් කළමනාකරණය</h2>
        <div className="text-[11px] font-black text-green-600 uppercase tracking-widest mt-1">Midwife Performance & Contact Registry</div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm italic text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
          දත්ත ලබාගනිමින් පවතී...
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="text-[13px] p-5 italic">නිලධාරිනිය (Midwife)</th>
                <th className="text-[13px] p-5 italic">සම්බන්ධීකරණය (Contact)</th>
                <th className="text-[13px] p-5 italic">සේවා ප්‍රදේශය (Area)</th>
                <th className="text-[13px] p-5 text-center italic">මව්වරුන් (Mothers)</th>
                <th className="text-[13px] p-5 text-center italic">අවදානම් (Risk)</th>
                <th className="text-[13px] p-5 text-right italic">ක්‍රියා (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {midwives.map((midwife) => (
                <tr key={midwife.id} className="hover:bg-green-50/30 transition-colors">
                  <td className="p-5">
                    <div className="font-bold text-gray-800 text-[15px]">{midwife.fullName}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase text-[14px]">{midwife.employeeId}</div>
                  </td>
                  <td className="p-5">
                    <div className="text-xs font-bold text-slate-700 mb-0.5 text-[15px]">{midwife.phone}</div>
                    <div className="text-[10px] text-blue-500 font-medium lowercase text-[14px]">{midwife.email}</div>
                  </td>
                  <td className="p-5">
                    <div className="text-xs font-bold text-gray-600 text-[15px]">{midwife.serviceArea}</div>
                  </td>
                  <td className="p-5 text-center">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black text-[15px]">{midwife.motherCount}</span>
                  </td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${midwife.highRiskCount > 0 ? 'bg-red-50 text-red-600 text-[15px]' : 'bg-gray-50 text-gray-400'}`}>
                      {midwife.highRiskCount}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end space-x-2">
                      <a href={`mailto:${midwife.email}`} title="Email යවන්න" className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                      </a>
                      <button onClick={() => setShowDeleteModal(midwife.id)} title="ඉවත් කරන්න" className="p-2 bg-red-50 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all shadow-sm text-[15px]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MOHLayout>
  );
};

export default ManageMidwives;