import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import ModalPortal from './ModalPortal';

const MOHLayout = ({ children }) => {
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

  const isActive = (path) => location.pathname === path ? 'bg-blue-600 shadow-md' : 'hover:bg-slate-800';

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-blue-950/70 backdrop-blur-md p-4 flex min-h-screen items-center justify-center animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setShowLogoutModal(false)} aria-hidden="true" />
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center z-10 my-auto animate-in zoom-in-95 duration-200">
              <div className="text-center">
                <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-800">පද්ධතියෙන් ඉවත් වන්නද?</h3>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mt-1 mb-6">Are you sure you want to logout?</p>
                <div className="flex space-x-3">
                  <button onClick={() => setShowLogoutModal(false)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase transition-all">නැත (Cancel)</button>
                  <button onClick={confirmLogout} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-red-200 transition-all">ඔව් (Logout)</button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* MOH Admin Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10 shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <div className="text-2xl font-bold text-green-400 tracking-tight">MOH Portal</div>
          <div className="text-[10px] font-bold text-green-300/70 uppercase tracking-widest mt-1">Health Officer Panel</div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <Link to="/moh-admin/dashboard" className={`block p-3 rounded-lg transition-all duration-300 ${isActive('/moh-admin/dashboard')}`}>
            <div className="text-base font-medium">පාලන පුවරුව</div>
            <div className="text-[11px] font-bold opacity-80 uppercase tracking-wide">MOH Dashboard</div>
          </Link>
          
          <Link to="/moh-admin/add-midwife" className={`block p-3 rounded-lg transition-all duration-300 ${isActive('/moh-admin/add-midwife')}`}>
            <div className="text-base font-medium">නිලධාරීන් එක් කරන්න</div>
            <div className="text-[11px] font-bold opacity-80 uppercase tracking-wide">Register Midwife (PHM)</div>
          </Link>

          <Link to="/moh-admin/manage-midwives" className={`block p-3 rounded-lg transition-all duration-300 ${isActive('/moh-admin/manage-midwives')}`}>
            <div className="text-base font-medium">නිලධාරීන් කළමනාකරණය</div>
            <div className="text-[11px] font-bold opacity-80 uppercase tracking-wide">Midwife Management</div>
          </Link>

          <Link to="/moh-admin/area-mothers" className={`block p-3 rounded-lg transition-all duration-300 ${isActive('/moh-admin/area-mothers')}`}>
            <div className="text-base font-medium">ප්‍රදේශයේ මව්වරුන්</div>
            <div className="text-[11px] font-bold opacity-80 uppercase tracking-wide">Mothers in Area</div>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="w-full bg-red-600/90 p-2.5 rounded-lg hover:bg-red-700 transition-all duration-300 font-bold shadow-lg active:scale-95 text-center"
          >
            <div className="text-sm font-bold leading-tight">නික්ම වන්න</div>
            <div className="text-[10px] font-black uppercase tracking-tighter opacity-90">Logout Account</div>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
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

export default MOHLayout;