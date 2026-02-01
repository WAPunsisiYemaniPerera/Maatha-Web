import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import AdminLayout from '../../components/AdminLayout';

const ManageMidwives = () => {
  const [midwives, setMidwives] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMidwives = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "midwives"));
        const midwifeList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMidwives(midwifeList);
      } catch (error) {
        console.error("Error fetching midwives: ", error);
      }
      setLoading(false);
    };

    fetchMidwives();
  }, []);

  return (
    <AdminLayout>
      <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-slate-700">
        <div className="mb-6 border-b pb-2">
          <h2 className="text-2xl font-bold text-gray-800">පවුල් සෞඛ්‍ය සේවා නිලධාරීන් කළමනාකරණය</h2>
          <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Public Health Midwives (PHM) Management</div>
        </div>
        
        {loading ? (
          <p className="text-center py-10 text-blue-600 font-semibold animate-pulse">දත්ත ලබාගනිමින් පවතී... (Fetching Data...)</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead className="bg-gray-100">
                <tr className="text-gray-700 uppercase tracking-tighter">
                  <th className="px-4 py-3 text-left">
                    <div className="text-sm font-bold">නම</div>
                    <div className="text-[10px] font-black text-gray-400">Full Name</div>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="text-sm font-bold">සේවා ප්‍රදේශය</div>
                    <div className="text-[10px] font-black text-gray-400">Service Area</div>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="text-sm font-bold">MOH ප්‍රදේශය</div>
                    <div className="text-[10px] font-black text-gray-400">MOH Division</div>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <div className="text-sm font-bold">ඊමේල්</div>
                    <div className="text-[10px] font-black text-gray-400">Email Address</div>
                  </th>
                  <th className="px-4 py-3 text-center">
                    <div className="text-sm font-bold">ක්‍රියාකාරකම්</div>
                    <div className="text-[10px] font-black text-gray-400">Actions</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {midwives.length > 0 ? midwives.map((midwife) => (
                  <tr key={midwife.id} className="hover:bg-gray-50 transition duration-150">
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">{midwife.fullName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{midwife.serviceArea}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{midwife.mohArea}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono italic">{midwife.email}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <div className="flex justify-center space-x-3 font-bold">
                        <button className="text-blue-600 hover:text-blue-800 transition transform active:scale-95">
                          සංස්කරණය (Edit)
                        </button>
                        <button className="text-red-600 hover:text-red-800 transition transform active:scale-95">
                          ඉවත් කරන්න (Delete)
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="px-4 py-20 text-center text-gray-400 italic">
                      <div>දැනට පද්ධතියට නිලධාරීන් කිසිවෙකුත් එක් කර නොමැත.</div>
                      <div className="text-xs uppercase font-black tracking-widest mt-1">No midwives registered in the system yet.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManageMidwives;