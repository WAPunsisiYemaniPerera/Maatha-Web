import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import ModalPortal from './ModalPortal';

const HospitalLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    setAnimate(false);
    const timer = setTimeout(() => setAnimate(true), 10);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (path) => location.pathname === path ? 'bg-indigo-600 shadow-md' : 'hover:bg-slate-800';

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Logout Modal */}
      {showLogoutModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-blue-950/70 backdrop-blur-md p-4 flex min-h-screen items-center justify-center animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setShowLogoutModal(false)} aria-hidden="true" />
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center z-10 my-auto animate-in zoom-in-95 duration-200">
              <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">පද්ධතියෙන් ඉවත් වන්නද?</h3>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-1 mb-6">Confirm Logout</p>
              <div className="flex space-x-3">
                <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase transition-all">නැත</button>
                <button onClick={confirmLogout} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-red-200 transition-all">ඔව්</button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Hospital Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10 shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <div className="text-2xl font-bold text-indigo-400 tracking-tight">Hospital Portal</div>
          <div className="text-[10px] font-bold text-indigo-300/70 uppercase tracking-widest mt-1">Medical Admin Panel</div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/hospital-admin/dashboard" className={`block p-3 rounded-lg transition-all ${isActive('/hospital-admin/dashboard')}`}>
            <div className="text-sm font-medium">පාලන පුවරුව</div>
            <div className="text-[10px] font-bold opacity-70 uppercase tracking-wide">Main Dashboard</div>
          </Link>
          
          <Link to="/hospital-admin/admissions" className={`block p-3 rounded-lg transition-all ${isActive('/hospital-admin/admissions')}`}>
            <div className="text-sm font-medium">ඇතුළත් කරගත් මව්වරුන්</div>
            <div className="text-[10px] font-bold opacity-70 uppercase tracking-wide">Admitted Mothers</div>
          </Link>

          <Link to="/hospital-admin/search-mother" className={`block p-3 rounded-lg transition-all ${isActive('/hospital-admin/search-mother')}`}>
            <div className="text-sm font-medium">මව්වරුන් සෙවීම</div>
            <div className="text-[10px] font-bold opacity-70 uppercase tracking-wide">Search Patients</div>
          </Link>

          {/* අලුතින් එක් කළ ලින්ක්ස් */}
          <Link to="/hospital-admin/reports" className={`block p-3 rounded-lg transition-all ${isActive('/hospital-admin/reports')}`}>
            <div className="text-sm font-medium">වෛද්‍ය වාර්තා</div>
            <div className="text-[10px] font-bold opacity-70 uppercase tracking-wide">Medical Reports</div>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={() => setShowLogoutModal(true)} className="w-full bg-red-600/90 p-2.5 rounded-lg font-bold text-sm shadow-lg">
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 ml-64 min-h-screen">
        <main className={`p-8 transition-opacity duration-300 ${
          animate ? 'opacity-100' : 'opacity-0'
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default HospitalLayout;