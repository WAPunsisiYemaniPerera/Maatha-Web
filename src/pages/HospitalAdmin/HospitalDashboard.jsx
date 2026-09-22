import React, { useEffect, useState } from 'react';
import { db, auth } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import HospitalLayout from '../../components/HospitalLayout';
import { Link } from 'react-router-dom';
import { isHighRiskMother } from '../../utils/securityValidators';

const HospitalDashboard = () => {
  const [stats, setStats] = useState({ admitted: 0, highRisk: 0, normal: 0 });
  const [recentAdmissions, setRecentAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hospitalName, setHospitalName] = useState('General Hospital Colombo');
  const [hospitalDetails, setHospitalDetails] = useState(null);

  useEffect(() => {
    const fetchHospitalAndStats = async () => {
      setLoading(true);
      let currentHosp = "General Hospital Colombo";
      const user = auth.currentUser;
      
      if (user) {
        try {
          const adminDoc = await getDoc(doc(db, "hospital_admins", user.uid));
          if (adminDoc.exists()) {
            const data = adminDoc.data();
            currentHosp = data.hospitalName || currentHosp;
            setHospitalDetails(data);
          } else {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().hospitalName) {
              currentHosp = userDoc.data().hospitalName;
            }
          }
        } catch (err) {
          console.error("Error fetching hospital profile:", err);
        }
      }
      setHospitalName(currentHosp);

      try {
        const q = query(collection(db, "mothers"), where("hospitalName", "==", currentHosp));
        const snap = await getDocs(q);
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const highRisk = docs.filter(d => isHighRiskMother(d)).length;

        setStats({
          admitted: docs.length,
          highRisk: highRisk,
          normal: docs.length - highRisk
        });
        setRecentAdmissions(docs.slice(0, 5));
      } catch (err) {
        console.error("Error fetching admissions stats:", err);
      }
      setLoading(false);
    };

    fetchHospitalAndStats();
  }, []);

  return (
    <HospitalLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Header banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 p-8 rounded-3xl text-white shadow-xl border border-teal-900/40">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-black uppercase tracking-wider">
              <span>🏥</span> Active Clinical Terminal
            </div>
            <h1 className="text-3xl font-black tracking-tight">{hospitalName}</h1>
            <p className="text-slate-300 text-xs font-semibold">
              {hospitalDetails?.district ? `${hospitalDetails.district} District` : 'National Health Network'} • Maternal & Inpatient Care Unit
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/hospital-admin/search-mother"
              className="px-6 py-3.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-900/40 transition-all flex items-center gap-2 active:scale-95"
            >
              <span>🔍</span> හදිසි මව්වරුන් සෙවීම (Emergency Search)
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 border-l-8 border-teal-600">
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-xs font-black uppercase tracking-wider">ඇතුළත් කරගත් මව්වරුන්</p>
              <span className="text-2xl">🤰</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-1 mb-3">Total In-Patient Admissions</p>
            <p className="text-4xl font-black text-slate-900">{loading ? '...' : stats.admitted}</p>
          </div>

          <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 border-l-8 border-red-500">
            <div className="flex items-center justify-between">
              <p className="text-red-600 text-xs font-black uppercase tracking-wider">අධි-අවදානම් අවස්ථා</p>
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-1 mb-3">Critical High-Risk Cases</p>
            <p className="text-4xl font-black text-red-600">{loading ? '...' : stats.highRisk}</p>
          </div>

          <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 border-l-8 border-cyan-500">
            <div className="flex items-center justify-between">
              <p className="text-cyan-700 text-xs font-black uppercase tracking-wider">සාමාන්‍ය තත්ත්වයේ මව්වරුන්</p>
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-1 mb-3">Stable / Normal Care</p>
            <p className="text-4xl font-black text-cyan-700">{loading ? '...' : stats.normal}</p>
          </div>
        </div>

        {/* Quick Access Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/hospital-admin/search-mother"
            className="p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-teal-500 hover:shadow-md transition-all group"
          >
            <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">🔍</div>
            <div className="text-xs font-black text-slate-800 uppercase">Search by NIC</div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">දිවයිනේ ඕනෑම මවකගේ ඉතිහාසය</div>
          </Link>

          <Link
            to="/hospital-admin/admissions"
            className="p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-teal-500 hover:shadow-md transition-all group"
          >
            <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📋</div>
            <div className="text-xs font-black text-slate-800 uppercase">Manage In-Patients</div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">නේවාසික මව්වරුන් සහ මාරු කිරීම්</div>
          </Link>

          <Link
            to="/hospital-admin/reports"
            className="p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-teal-500 hover:shadow-md transition-all group"
          >
            <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📊</div>
            <div className="text-xs font-black text-slate-800 uppercase">Hospital Reports</div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">වාර්තා සහ CSV Export</div>
          </Link>

          <div className="p-5 bg-teal-50/60 rounded-2xl border border-teal-100 flex flex-col justify-center">
            <div className="text-[10px] font-black text-teal-700 uppercase tracking-widest mb-1">Maatha Cloud Network</div>
            <div className="text-xs font-bold text-teal-950 leading-snug">සම්බන්ධිත ජාතික සෞඛ්‍ය දත්ත පද්ධතිය සක්‍රියයි.</div>
          </div>
        </div>

        {/* Recent Admissions table */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">මෑතකදී ඇතුළත් කරගත් මව්වරුන්</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">Recently Admitted In-Patients in {hospitalName}</p>
            </div>
            <Link to="/hospital-admin/admissions" className="text-xs font-black text-teal-600 hover:underline">
              සියල්ල බලන්න ➔
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="p-4">මවගේ නම සහ NIC</th>
                  <th className="p-4">අවදානම් තත්ත්වය</th>
                  <th className="p-4">MOH / සේවා කොට්ඨාශය</th>
                  <th className="p-4 text-right">ක්‍රියා</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAdmissions.length > 0 ? (
                  recentAdmissions.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{m.fullName || 'නම දක්වා නැත'}</div>
                        <div className="text-[10px] font-mono text-slate-400 font-bold">{m.nic || '—'}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                          isHighRiskMother(m) ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-700'
                        }`}>
                          {isHighRiskMother(m) ? 'High-Risk' : 'Normal'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {m.serviceArea || m.mohArea || '—'}
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          to={`/hospital-admin/update-clinical/${m.id}`}
                          className="px-3 py-1.5 bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-700 font-bold rounded-lg transition-all"
                        >
                          View & Update
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-10 text-center text-slate-400 italic">
                      දැනට මෙම රෝහලේ ඇතුළත් කරගත් මව්වරුන් නොමැත.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </HospitalLayout>
  );
};

export default HospitalDashboard;