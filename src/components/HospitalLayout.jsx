import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import ModalPortal from './ModalPortal';

const HospitalLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [hospitalName, setHospitalName] = useState('General Hospital');

  useEffect(() => {
    setAnimate(false);
    const timer = setTimeout(() => setAnimate(true), 10);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    const fetchHospital = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const adminDoc = await getDoc(doc(db, "hospital_admins", user.uid));
          if (adminDoc.exists() && adminDoc.data().hospitalName) {
            setHospitalName(adminDoc.data().hospitalName);
          } else {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().hospitalName) {
              setHospitalName(userDoc.data().hospitalName);
            }
          }
        } catch (err) {
          console.error("Error fetching hospital name in layout:", err);
        }
      }
    };
    fetchHospital();
  }, []);

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (path) => location.pathname === path 
    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-900/40 font-bold' 
    : 'text-slate-300 hover:bg-slate-800/80 hover:text-cyan-300 font-medium';

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Logout Modal */}
      {showLogoutModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/70 backdrop-blur-md p-4 flex min-h-screen items-center justify-center animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setShowLogoutModal(false)} aria-hidden="true" />
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-teal-100 text-center z-10 my-auto animate-in zoom-in-95 duration-200">
              <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-800">පද්ධතියෙන් ඉවත් වන්නද?</h3>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1 mb-6">Confirm Logout</p>
              <div className="flex space-x-3">
                <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase transition-all">නැත</button>
                <button onClick={confirmLogout} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-red-200 transition-all">ඔව්</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Hospital Sidebar - Medical Teal Theme */}
      <div className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10 shadow-2xl border-r border-slate-800">
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-b from-slate-900 to-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-teal-500/30 text-xl font-black">
              🏥
            </div>
            <div>
              <div className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-300 tracking-tight">
                Hospital Portal
              </div>
              <div className="text-[9px] font-black text-teal-400/80 uppercase tracking-widest">
                Clinical Medical Care
              </div>
            </div>
          </div>

          <div className="mt-4 p-2.5 rounded-xl bg-teal-950/60 border border-teal-800/40">
            <div className="text-[9px] font-black text-teal-400 uppercase tracking-wider">Active Facility</div>
            <div className="text-xs font-bold text-slate-200 truncate mt-0.5" title={hospitalName}>
              {hospitalName}
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link to="/hospital-admin/dashboard" className={`block p-3 rounded-2xl transition-all ${isActive('/hospital-admin/dashboard')}`}>
            <div className="text-sm">පාලන පුවරුව</div>
            <div className="text-[10px] opacity-75 uppercase tracking-wide">Main Dashboard</div>
          </Link>
          
          <Link to="/hospital-admin/search-mother" className={`block p-3 rounded-2xl transition-all ${isActive('/hospital-admin/search-mother')}`}>
            <div className="text-sm">මව්වරුන් සෙවීම</div>
            <div className="text-[10px] opacity-75 uppercase tracking-wide">Emergency Search</div>
          </Link>

          <Link to="/hospital-admin/admissions" className={`block p-3 rounded-2xl transition-all ${isActive('/hospital-admin/admissions')}`}>
            <div className="text-sm">නේවාසික මව්වරුන්</div>
            <div className="text-[10px] opacity-75 uppercase tracking-wide">Admitted Patients</div>
          </Link>

          <Link to="/hospital-admin/reports" className={`block p-3 rounded-2xl transition-all ${isActive('/hospital-admin/reports')}`}>
            <div className="text-sm">වෛද්‍ය වාර්තා</div>
            <div className="text-[10px] opacity-75 uppercase tracking-wide">Clinical Reports</div>
          </Link>
        </nav>

        {/* User / Logout */}
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setShowLogoutModal(true)} 
            className="w-full bg-red-600/80 hover:bg-red-600 text-white p-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <span>🔒</span> Logout
          </button>
        </div>
      </div>

      <div className="flex-1 ml-64 min-h-screen">
        <main className={`p-6 sm:p-8 transition-opacity duration-300 ${
          animate ? 'opacity-100' : 'opacity-0'
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default HospitalLayout;