import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';

const AdminLayout = ({ children }) => {
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl transform transition-all scale-100 animate-in fade-in zoom-in duration-300">
            <div className="text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">පද්ධතියෙන් ඉවත් වන්න අවශ්‍යද?</h3>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">Are you sure you want to logout?</p>
              
              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all text-sm uppercase tracking-tighter"
                >
                  නැත (Cancel)
                </button>
                <button 
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all text-sm uppercase tracking-tighter"
                >
                  ඔව් (Logout)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-10 shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <div className="text-2xl font-bold text-blue-400 tracking-tight">Maatha Admin</div>
          <div className="text-[10px] font-bold text-blue-300/70 uppercase tracking-widest mt-1">Management Portal</div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <Link to="/super-admin/dashboard" className={`block p-3 rounded-lg transition-all duration-300 transform ${isActive('/super-admin/dashboard')}`}>
            <div className="text-base font-medium">ප්‍රධාන පුවරුව</div>
            <div className="text-[11px] font-bold opacity-80 uppercase tracking-wide">Home / Dashboard</div>
          </Link>
          
          <Link to="/super-admin/add-moh" className={`block p-3 rounded-lg transition-all duration-300 transform ${isActive('/super-admin/add-moh')}`}>
            <div className="text-base font-medium">MOH පාලනය</div>
            <div className="text-[11px] font-bold opacity-80 uppercase tracking-wide">MOH Management</div>
          </Link>

          <Link to="/super-admin/add-hospital" className={`block p-3 rounded-lg transition-all duration-300 transform ${isActive('/super-admin/add-hospital')}`}>
            <div className="text-base font-medium">රෝහල් පාලනය</div>
            <div className="text-[11px] font-bold opacity-80 uppercase tracking-wide">Hospital Management</div>
          </Link>

          <Link to="/super-admin/manage-midwives" className={`block p-3 rounded-lg transition-all duration-300 transform ${isActive('/super-admin/manage-midwives')}`}>
            <div className="text-base font-medium">පවුල් සෞඛ්‍ය නිලධාරීන්</div>
            <div className="text-[11px] font-bold opacity-80 uppercase tracking-wide">Midwives / PHMs</div>
          </Link>

          <Link to="/super-admin/manage-mothers" className={`block p-3 rounded-lg transition-all duration-300 transform ${isActive('/super-admin/manage-mothers')}`}>
            <div className="text-base font-medium">මව්වරුන් කළමනාකරණය</div>
            <div className="text-[11px] font-bold opacity-80 uppercase tracking-wide">Maternal Management</div>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="w-full bg-red-600/90 p-2.5 rounded-lg hover:bg-red-700 transition-all duration-300 font-bold shadow-lg active:scale-95 text-center"
          >
            <div className="text-sm">නික්ම වන්න</div>
            <div className="text-[10px] font-bold uppercase tracking-tighter opacity-90">Logout Account</div>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 min-h-screen overflow-hidden">
        <main className={`p-8 transition-all duration-700 ease-out transform ${
          animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;