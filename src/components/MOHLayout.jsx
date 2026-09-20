import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import ModalPortal from './ModalPortal';

const MOHLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [animate, setAnimate] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);

  useEffect(() => {
    setAnimate(false);
    const timer = setTimeout(() => setAnimate(true), 10);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Load current MOH Admin details
  useEffect(() => {
    const fetchAdmin = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docSnap = await getDoc(doc(db, "moh_admins", user.uid));
          if (docSnap.exists()) {
            setAdminProfile(docSnap.data());
          }
        } catch (err) {
          console.error("Error loading MOH profile in layout:", err);
        }
      }
    };
    fetchAdmin();
  }, []);

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = [
    {
      path: '/moh-admin/dashboard',
      labelSi: 'ප්‍රධාන පාලන පුවරුව',
      labelEn: 'MOH Command Center',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      path: '/moh-admin/add-midwife',
      labelSi: 'PHM ලියාපදිංචි කිරීම',
      labelEn: 'Register Field Midwife',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      )
    },
    {
      path: '/moh-admin/manage-midwives',
      labelSi: 'පවුල් සෞඛ්‍ය සේවිකාවන්',
      labelEn: 'Midwives (PHM) Directory',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      path: '/moh-admin/area-mothers',
      labelSi: 'ප්‍රදේශයේ මව්වරුන්',
      labelEn: 'Area Maternal Registry',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )
    },
    {
      path: '/moh-admin/reports',
      labelSi: 'MOH නිල වාර්තා සහ PDF',
      labelEn: 'MOH Reports & Documents',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
      {/* Universal Logout Confirmation Modal */}
      {showLogoutModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/75 backdrop-blur-md p-4 flex min-h-screen items-center justify-center animate-in fade-in duration-200">
            <div className="fixed inset-0" onClick={() => setShowLogoutModal(false)} aria-hidden="true" />
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-emerald-100 text-center z-10 my-auto animate-in zoom-in-95 duration-200">
              <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-600 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">පද්ධතියෙන් ඉවත් වන්නද?</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-6">Are you sure you want to logout?</p>
              
              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs uppercase"
                >
                  නැත (Cancel)
                </button>
                <button 
                  onClick={confirmLogout}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all text-xs uppercase flex items-center justify-center gap-1.5"
                >
                  ඔව් (Logout)
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Desktop Sidebar (Emerald & Teal Executive Aesthetic) */}
      <aside className="hidden lg:flex w-72 bg-gradient-to-b from-teal-900 via-emerald-950 to-slate-950 text-white flex-col fixed h-full z-30 shadow-2xl border-r border-emerald-800/30">
        {/* Brand Header */}
        <div className="p-6 border-b border-emerald-800/40 bg-teal-900/40">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-white text-emerald-800 flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-emerald-500/20">
              M
            </div>
            <div>
              <div className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                <span>මාතා</span>
                <span className="text-xs bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-emerald-400/20">MOH</span>
              </div>
              <p className="text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mt-0.5">Medical Officer of Health</p>
            </div>
          </div>
        </div>

        {/* User Role & Division Badge */}
        <div className="px-6 py-4 mx-4 my-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/40 text-emerald-200 flex items-center justify-center font-bold text-lg border border-emerald-400/30">
              🩺
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-bold text-white truncate">{adminProfile?.fullName || 'MOH Administrator'}</div>
              <div className="text-[10px] font-semibold text-emerald-300 flex items-center gap-1 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{adminProfile?.mohArea ? `${adminProfile.mohArea} MOH (Live)` : 'MOH Division (Live)'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3.5 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                  active
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50 font-bold translate-x-1'
                    : 'text-emerald-100/80 hover:bg-white/10 hover:text-white font-medium'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all ${
                  active ? 'bg-white/20 text-white' : 'bg-emerald-800/30 text-emerald-300 group-hover:bg-emerald-600/30 group-hover:text-white'
                }`}>
                  {item.icon}
                </div>
                <div>
                  <div className="text-sm leading-snug">{item.labelSi}</div>
                  <div className="text-[10px] opacity-75 font-semibold uppercase tracking-wider">{item.labelEn}</div>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Logout Bottom Button */}
        <div className="p-4 border-t border-emerald-800/40 bg-emerald-950/40">
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="w-full bg-white/10 hover:bg-red-600/90 text-white p-3 rounded-2xl transition-all duration-200 font-bold border border-white/10 flex items-center justify-center space-x-2 group active:scale-98 shadow-sm"
          >
            <svg className="w-5 h-5 text-red-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm">පද්ධතියෙන් ඉවත් වන්න</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Navigation Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-teal-900 text-white px-5 py-3.5 shadow-md flex items-center justify-between border-b border-teal-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-white text-emerald-800 flex items-center justify-center font-black text-lg shadow-sm">
            M
          </div>
          <div>
            <div className="text-base font-black tracking-tight leading-tight">මාතා MOH</div>
            <div className="text-[9px] font-bold text-emerald-200 uppercase tracking-widest">{adminProfile?.mohArea || 'MOH Area'}</div>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-white border border-emerald-700 transition-all active:scale-95"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Slide-Out Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          ></div>

          <div className="relative w-72 max-w-[80vw] bg-gradient-to-b from-teal-900 via-emerald-950 to-slate-950 text-white flex flex-col h-full z-10 shadow-2xl animate-in slide-in-from-left duration-300">
            <div className="p-5 border-b border-emerald-800/40 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-white text-emerald-800 flex items-center justify-center font-black text-xl shadow-md">
                  M
                </div>
                <div>
                  <div className="text-lg font-black tracking-tight text-white">මාතා MOH</div>
                  <div className="text-[9px] font-bold text-emerald-300 uppercase tracking-widest">Medical Officer</div>
                </div>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="text-white/80 hover:text-white p-2"
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
              {navItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all ${
                      active
                        ? 'bg-emerald-600 text-white shadow-md font-bold'
                        : 'text-emerald-100 hover:bg-white/10 font-medium'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${active ? 'bg-white/20' : 'bg-emerald-800/30 text-emerald-300'}`}>
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{item.labelSi}</div>
                      <div className="text-[10px] opacity-75 uppercase tracking-wider">{item.labelEn}</div>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-emerald-800/40">
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowLogoutModal(true);
                }}
                className="w-full bg-red-600/90 text-white p-3 rounded-2xl font-bold shadow-md text-sm text-center"
              >
                පද්ධතියෙන් ඉවත් වන්න (Logout)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 lg:ml-72 min-h-screen pt-16 lg:pt-0 flex flex-col bg-slate-50">
        <main className={`flex-1 p-4 sm:p-6 lg:p-10 transition-opacity duration-300 ${
          animate ? 'opacity-100' : 'opacity-0'
        }`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default MOHLayout;