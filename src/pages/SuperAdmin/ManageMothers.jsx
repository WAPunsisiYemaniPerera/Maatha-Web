import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import AdminLayout from '../../components/AdminLayout';

const ManageMothers = () => {
  const [mothers, setMothers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMothers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "mothers"));
        const mothersList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMothers(mothersList);
      } catch (error) {
        console.error("Error fetching mothers: ", error);
      }
      setLoading(false);
    };

    fetchMothers();
  }, []);

  return (
    <AdminLayout>
      <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-slate-700">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">ලියාපදිංචි මව්වරුන් කළමනාකරණය</h2>
            <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Registered Mothers Management</div>
          </div>
          <div className="text-right">
            <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
              මුළු එකතුව: {mothers.length}
            </span>
            <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">Total Records</div>
          </div>
        </div>
        
        {loading ? (
          <p className="text-center py-10 text-blue-600 animate-pulse font-medium italic">
            මව්වරුන්ගේ දත්ත පද්ධතියෙන් ලබාගනිමින් පවතී... (Fetching Data...)
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase tracking-tighter">
                  <th className="py-3 px-6 text-left">
                    <div className="text-sm font-bold">මවගේ නම</div>
                    <div className="text-[10px] font-black text-gray-400">Mother's Name</div>
                  </th>
                  <th className="py-3 px-6 text-left">
                    <div className="text-sm font-bold">හැඳුනුම්පත් අංකය</div>
                    <div className="text-[10px] font-black text-gray-400">NIC Number</div>
                  </th>
                  <th className="py-3 px-6 text-center">
                    <div className="text-sm font-bold">අවදානම් තත්ත්වය</div>
                    <div className="text-[10px] font-black text-gray-400">Risk Status</div>
                  </th>
                  <th className="py-3 px-6 text-center">
                    <div className="text-sm font-bold">දිස්ත්‍රික්කය</div>
                    <div className="text-[10px] font-black text-gray-400">District</div>
                  </th>
                  <th className="py-3 px-6 text-center">
                    <div className="text-sm font-bold">ක්‍රියාකාරකම්</div>
                    <div className="text-[10px] font-black text-gray-400">Actions</div>
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm font-light">
                {mothers.length > 0 ? mothers.map((mother) => (
                  <tr key={mother.id} className="border-b border-gray-200 hover:bg-gray-50 transition duration-150">
                    <td className="py-3 px-6 text-left whitespace-nowrap">
                      <div className="font-medium text-gray-800">{mother.fullName}</div>
                    </td>
                    <td className="py-3 px-6 text-left font-mono">
                      {mother.nic || mother.id}
                    </td>
                    <td className="py-3 px-6 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        mother.riskStatus === 'High-Risk' 
                        ? 'bg-red-100 text-red-600' 
                        : 'bg-green-100 text-green-600'
                      }`}>
                        {mother.riskStatus === 'High-Risk' ? 'අධි අවදානම් (High-Risk)' : 'සාමාන්‍ය (Normal)'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center font-medium">
                      {mother.district || "සටහන් කර නැත"}
                    </td>
                    <td className="py-3 px-6 text-center">
                      <div className="flex item-center justify-center space-x-4 font-bold">
                        <button className="text-blue-600 hover:text-blue-900 transition text-xs uppercase tracking-tighter">විස්තර (View)</button>
                        <button className="text-red-500 hover:text-red-700 transition text-xs uppercase tracking-tighter">ඉවත් කරන්න (Delete)</button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="py-20 text-center text-gray-400 italic">
                      <div>පද්ධතිය තුළ තවමත් මව්වරුන් ලියාපදිංචි වී නොමැත.</div>
                      <div className="text-[11px] font-black uppercase tracking-widest mt-1">No mothers registered in the system yet.</div>
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

export default ManageMothers;