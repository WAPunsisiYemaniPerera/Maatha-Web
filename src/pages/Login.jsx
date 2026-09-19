import React, { useState } from "react";
import { auth, db } from "../firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { formatAuthError } from "../utils/securityValidators";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanEmail = email.trim().toLowerCase();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role;

        if (role === 'super_admin') {
          window.location.href = '/super-admin/dashboard';
        } else if (role === 'moh_admin') {
          window.location.href = '/moh-admin/dashboard';
        } else if (role === 'hospital_admin') {
          window.location.href = '/hospital-admin/dashboard';
        } else {
          setError("ඔබට මෙම පරිපාලන පද්ධතියට ඇතුළු වීමට අවසර නැත. (Unauthorized Role)");
        }
      } else {
        setError("ගිණුම් දත්ත හමු නොවීය. කරුණාකර ප්‍රධාන පරිපාලක අමතන්න. (User profile not found)");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(formatAuthError(err));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/20 relative z-10">
        
        {/* Logo/Header Section */}
        <div className="text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-5">
            <div className="absolute inset-0 bg-blue-600/20 rounded-2xl rotate-6 scale-105"></div>
            <div className="relative w-full h-full bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 border border-slate-100 overflow-hidden transform transition-transform hover:rotate-0 -rotate-2">
              <img 
                src="/logo512.png" 
                alt="Maatha Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
          
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            MAATHA <span className="text-blue-600">PORTAL</span>
          </h2>
          <div className="mt-1">
            <p className="text-slate-600 font-medium text-xs">පරිපාලන සහ සෞඛ්‍ය නිලධාරී පිවිසුම</p>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-0.5">Secure Administrative Gateway</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3.5 mb-5 rounded-r-xl animate-in fade-in slide-in-from-top duration-300">
            <p className="text-red-700 text-xs font-bold leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-slate-700 text-[11px] font-black uppercase tracking-wider mb-1.5 ml-0.5">
              ඊමේල් ලිපිනය (Official Email)
            </label>
            <div className="relative">
              <input 
                type="email" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 text-sm font-medium"
                placeholder="example@health.gov.lk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex justify-between items-center mb-1.5 ml-0.5">
              <label className="block text-slate-700 text-[11px] font-black uppercase tracking-wider">
                මුරපදය (Password)
              </label>
            </div>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800 text-sm font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 transform active:scale-98 flex flex-col items-center justify-center space-y-0.5"
            >
              <span className="text-sm font-extrabold">{loading ? "තහවුරු කරමින්..." : "පද්ධතියට ඇතුළු වන්න"}</span>
              {!loading && <span className="text-[10px] opacity-80 uppercase tracking-tight">Sign In to Dashboard</span>}
            </button>
          </div>
        </form>

        {/* Security badge footer */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-500">
            <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Scrypt Salt & Hash Encrypted Security</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            © 2026 Maatha Health System • Sri Lanka
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;