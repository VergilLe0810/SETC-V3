import React from 'react';
import { User, Mail, Calendar, Shield, CheckCircle } from 'lucide-react';
import { formatDate } from '../utils/date';

interface ProfileViewProps {
  fullName: string;
  dob: string;
  position: string;
  email: string;
  responsibilities: string[];
}

export default function ProfileView({
  fullName = "Le Minh Vuong",
  dob = "1990-08-10",
  position = "HSE Instructor",
  email = "vuongle0810@gmail.com",
  responsibilities = [
    "Training Curriculum Evaluation and Course Design coordination",
    "On-site Safety Evaluation certifications and Task assignation",
    "Training Center Membership registration, approvals, and credential indexing",
    "Standard HSE incident prevention and Emergency Safety Drill coordination",
    "Resource and classroom assignment planning to minimize training calendar collisions"
  ]
}: ProfileViewProps) {
  // Format Date of Birth
  const formattedDob = formatDate(dob);

  return (
    <div id="instructor-profile-view" className="bg-white border border-slate-200/90 rounded-2xl p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)] max-w-3xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-250">
      
      {/* Header section with profile avatar */}
      <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
        <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center shadow-inner relative border border-emerald-500/15">
          <User className="h-10 w-10" />
          <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white"></span>
        </div>
        
        <div className="text-center sm:text-left space-y-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">{fullName}</h2>
            <span className="bg-emerald-550/10 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-250/20 font-sans tracking-wide uppercase">
              {position}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">SETC Authorized Administrative Officer</p>
        </div>
      </div>

      {/* Grid for key details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Full Name */}
        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Full Name</span>
          <div className="flex items-center gap-2 text-slate-800">
            <User className="h-4 w-4 text-slate-450 shrink-0" />
            <span className="text-xs font-bold leading-normal">{fullName}</span>
          </div>
        </div>

        {/* Date of Birth */}
        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Date of Birth</span>
          <div className="flex items-center gap-2 text-slate-800">
            <Calendar className="h-4 w-4 text-slate-450 shrink-0" />
            <span className="text-xs font-bold leading-normal">{formattedDob}</span>
          </div>
        </div>

        {/* E-mail Contact */}
        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Registered Email</span>
          <div className="flex items-center gap-2 text-slate-800">
            <Mail className="h-4 w-4 text-slate-450 shrink-0" />
            <span className="text-xs font-bold truncate leading-normal" title={email}>{email}</span>
          </div>
        </div>
      </div>

      {/* Authorized Responsibilities List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Shield className="h-4 w-4 text-slate-650" />
          <span>List of Authorized Responsibilities</span>
        </h3>
        
        <div className="bg-amber-50/35 border border-amber-200/50 rounded-xl p-4.5 space-y-3.5">
          {responsibilities.map((resp, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700 leading-relaxed font-semibold">
                {resp}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
