import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Sparkles, 
  ShieldAlert
} from 'lucide-react';
import { Member } from '../types';

interface LoginPageProps {
  onLogin: (email: string) => void;
  onGoogleSignIn: () => Promise<void>;
  members: Member[];
  logoSrc: string;
}

export default function LoginPage({ onLogin, onGoogleSignIn, members, logoSrc }: LoginPageProps) {
  const [email, setEmail] = useState(() => localStorage.getItem('se_latest_login_email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const CREATOR_USERNAME = 'setcadmin';
  const CREATOR_PASSWORD = 'abc123';

  const handleGoogleSignInClick = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await onGoogleSignIn();
    } catch (err: any) {
      setError(err?.message || 'Google sign in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedInput = email.trim().toLowerCase();
    if (!trimmedInput) {
      setError('Please enter your username or email address.');
      return;
    }

    const isCreator = trimmedInput === CREATOR_USERNAME || trimmedInput === 'setcadmin@safetycentre.org';

    if (!isCreator && (!trimmedInput.includes('@') || trimmedInput.length < 5)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    // Check if the user is registered in the members directory
    const matchedMember = members.find(m => 
      m.email.toLowerCase() === trimmedInput || 
      (trimmedInput === 'setcadmin' && m.email.toLowerCase() === 'setcadmin') ||
      (trimmedInput === 'setcadmin@safetycentre.org' && m.email.toLowerCase() === 'setcadmin')
    );

    if (!matchedMember) {
      if (isCreator) {
        if (password !== CREATOR_PASSWORD) {
          setError('Incorrect password for SETC Creator Admin.');
          return;
        }
        setSuccess(true);
        setTimeout(() => {
          onLogin('setcadmin');
        }, 800);
        return;
      }
      setError('Access Denied: This account is not registered under General Information.');
      return;
    }

    const expectedPassword = matchedMember.password || CREATOR_PASSWORD;
    if (password !== expectedPassword) {
      setError(`Incorrect password for ${matchedMember.name}.`);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      onLogin(trimmedInput);
    }, 800);
  };

  return (
    <div id="login-page-wrapper" className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden font-sans p-4">
      {/* Background soft color blob with theme primary color */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#549B8C]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-[#549B8C]/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-xl p-8 relative z-10 transition-all">
        {/* Header containing Logo & Business Name */}
        <div className="flex flex-col items-center text-center mb-8">
          {/* Logo container */}
          <div className="w-16 h-16 bg-white rounded-2xl p-1 flex items-center justify-center shadow-md border border-slate-100 mb-5 transition-transform hover:scale-105 duration-300">
            <img 
              src={logoSrc} 
              alt="Logo" 
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          
          {/* Subtitle / Unit label */}
          <p className="text-[10px] font-black tracking-widest text-[#549B8C] uppercase mb-1">
            PETROVIETNAM • PV COLLEGE
          </p>

          {/* Business Name */}
          <h2 className="text-lg font-extrabold tracking-tight text-slate-800 leading-snug">
            Safety & Environment Training Centre
          </h2>
        </div>

        {/* Google Sign In button */}
        <div className="space-y-4">
          <button
            type="button"
            disabled={success || isGoogleLoading}
            onClick={handleGoogleSignInClick}
            className="w-full h-12 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl shadow-xs transition-all transform active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <span className="animate-pulse">Connecting Google Auth...</span>
            ) : (
              <>
                <img 
                  src="https://www.google.com/favicon.ico" 
                  className="w-4 h-4" 
                  alt="Google logo" 
                  referrerPolicy="no-referrer" 
                />
                <span>Sign in with Google Account</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 my-4">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">or Email Credentials</span>
            <div className="h-px bg-slate-200 flex-1" />
          </div>
        </div>

        {/* Action Form */}
        <form onSubmit={validateAndSubmit} className="space-y-5">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex items-start gap-2.5"
            >
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
              <span className="font-medium">{error}</span>
            </motion.div>
          )}

          {/* Username Field */}
          <div className="space-y-1.5 label-input-group animate-fade-in">
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Username or Email
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={email}
                disabled={success}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email or username"
                className="w-full bg-slate-50 text-slate-900 border border-slate-200 focus:border-[#549B8C] focus:ring-1 focus:ring-[#549B8C]/20 rounded-xl pl-10 pr-3 py-3 text-xs outline-none transition-all placeholder:text-slate-400 focus:bg-white"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5 label-input-group">
            <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                disabled={success}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-slate-50 text-slate-900 border border-slate-200 focus:border-[#549B8C] focus:ring-1 focus:ring-[#549B8C]/20 rounded-xl pl-10 pr-10 py-3 text-xs outline-none transition-all placeholder:text-slate-400 focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={success}
            className="w-full h-12 bg-[#549B8C] hover:bg-[#437C70] disabled:bg-[#437C70]/70 text-white font-bold text-xs rounded-xl shadow-md transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {success ? (
              <>
                <Sparkles className="h-4.5 w-4.5 animate-spin text-white animate-pulse" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
