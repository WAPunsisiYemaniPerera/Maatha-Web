import React, { useState } from "react";
import { auth, db } from "../firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
          setError("ඔබට මෙම පද්ධතියට ඇතුළු වීමට අවසර නැත. (Unauthorized Access)");
        }
      } else {
        setError("ගිණුම් දත්ත හමු නොවීය. (User data not found)");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("ඊමේල් ලිපිනය හෝ මුරපදය වැරදියි. (Invalid Credentials)");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="bg-white/95 backdrop-blur-md p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/20 transform transition-all">
        
        {/* Logo/Header Section */}
        <div className="text-center mb-10">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-500/50 mb-4 rotate-3">
            <span className="text-white text-3xl font-black italic">M</span>
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter">
            MAATHA <span className="text-blue-600">PORTAL</span>
          </h2>
          <div className="mt-2">
            <p className="text-slate-500 font-medium text-sm">පරිපාලන පද්ධතියට ඇතුළු වන්න</p>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">Administrative Login Panel</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl animate-in fade-in slide-in-from-top duration-300">
            <p className="text-red-600 text-xs font-bold leading-tight">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email Field */}
          <div>
            <label className="block text-slate-700 text-xs font-black uppercase tracking-wider mb-2 ml-1">
              ඊමේල් ලිපිනය (Email Address)
            </label>
            <div className="relative">
              <input 
                type="email" 
                className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-slate-800 font-medium"
                placeholder="example@maatha.lk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-slate-700 text-xs font-black uppercase tracking-wider mb-2 ml-1">
              මුරපදය (Password)
            </label>
            <input 
              type="password" 
              className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 text-slate-800"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Login Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-500/30 transition-all duration-300 transform active:scale-95 flex flex-col items-center justify-center space-y-0.5"
          >
            <span className="text-base font-bold">{loading ? "පරීක්ෂා කරමින්..." : "ඇතුළු වන්න"}</span>
            {!loading && <span className="text-[10px] opacity-80 uppercase tracking-tighter">Sign In to System</span>}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
            © 2026 Maatha Health System. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;