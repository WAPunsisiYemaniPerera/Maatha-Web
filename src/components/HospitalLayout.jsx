import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300 text-center">
            <h3 className="text-xl font-bold text-gray-800">පද්ධතියෙන් ඉවත් වන්නද?</h3>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">Confirm Logout</p>
            <div className="flex space-x-3">
              <button onClick={() => setShowLogoutModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm uppercase">නැත</button>
              <button onClick={confirmLogout} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm uppercase">ඔව්</button>
            </div>
          </div>
        </div>
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
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={() => setShowLogoutModal(true)} className="w-full bg-red-600/90 p-2.5 rounded-lg font-bold text-sm shadow-lg">
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 ml-64 min-h-screen">
        <main className={`p-8 transition-all duration-700 ease-out transform ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default HospitalLayout;