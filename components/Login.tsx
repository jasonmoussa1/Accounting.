
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock } from 'lucide-react';

export const Login: React.FC = () => {
  const { loginWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-900/50">
           <Shield size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">JasonOS Finance</h1>
        <p className="text-slate-500 mb-8">Secure Production Login</p>
        
        <button 
          onClick={loginWithGoogle}
          className="w-full py-3 px-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
          Sign in with Google
        </button>

        <div className="mt-8 pt-8 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-center gap-2">
           <Lock size={12} />
           256-bit AES Encrypted • Firebase Auth
        </div>
      </div>
    </div>
  );
};
