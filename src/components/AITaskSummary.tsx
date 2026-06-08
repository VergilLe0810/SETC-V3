import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, AlertCircle, Calendar, CheckCircle2, ListTodo, GraduationCap, Users } from 'lucide-react';
import { Course, CourseSession, Member, Task } from '../types';

interface AITaskSummaryProps {
  tasks: Task[];
  userEmail: string;
  sessions: CourseSession[];
  courses: Course[];
  members: Member[];
}

export default function AITaskSummary({ tasks, userEmail, sessions, courses, members }: AITaskSummaryProps) {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const userMemberObj = members.find(m => m.email.toLowerCase() === userEmail.toLowerCase());
  const userName = userMemberObj ? userMemberObj.name : userEmail.split('@')[0];
  const userPosition = userMemberObj ? userMemberObj.position : 'Member';

  // Filter tasks belonging to the current user
  const userTasks = tasks.filter(t => t.assignedTo.toLowerCase() === userEmail.toLowerCase());
  const pendingTasks = userTasks.filter(t => t.status !== 'Completed');

  // Hardcode real-time day 2026-06-08 as of current requirements
  const realTimeTodayStr = '2026-06-08';

  // Format today's sessions for the user to determine Instructor vs TA/TG roles
  const todaySessionsFormatted = sessions.filter(s => {
    const isToday = s.startDate <= realTimeTodayStr && s.endDate >= realTimeTodayStr;
    if (!isToday) return false;
    
    const nameLower = userName.toLowerCase();
    const emailLower = userEmail.toLowerCase();
    return s.instructor.toLowerCase().includes(nameLower) || 
           (s.taOfficer && s.taOfficer.toLowerCase().includes(nameLower)) ||
           (s.tgOfficer && s.tgOfficer.toLowerCase().includes(nameLower));
  }).map(s => {
    const courseObj = courses.find(c => c.id === s.courseId);
    const courseCode = courseObj ? courseObj.code : 'SETC-COURSE';
    
    const nameLower = userName.toLowerCase();
    let role: 'instructor' | 'ta' | 'tg' | 'participant' = 'participant';
    if (s.instructor.toLowerCase().includes(nameLower)) {
      role = 'instructor';
    } else if (s.taOfficer && s.taOfficer.toLowerCase().includes(nameLower)) {
      role = 'ta';
    } else if (s.tgOfficer && s.tgOfficer.toLowerCase().includes(nameLower)) {
      role = 'tg';
    }

    return {
      courseCode,
      courseTitle: courseObj?.title || 'Unknown Course',
      classroom: s.classroom,
      startTime: s.startTime,
      endTime: s.endTime,
      role
    };
  });

  const totalCount = todaySessionsFormatted.length + pendingTasks.length;

  const fetchAISummary = async (force: boolean = false) => {
    // Cache per user, session length, and pending count
    const cacheKey = `setc_ai_summary_v4_${userEmail}_${todaySessionsFormatted.length}_${pendingTasks.length}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached && !force) {
      setSummary(cached);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tasks/ai-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tasks: pendingTasks,
          userEmail,
          userName,
          userPosition,
          todaySessionsFormatted
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      setSummary(data.summary);
      localStorage.setItem(cacheKey, data.summary);
    } catch (err: any) {
      console.error('Error fetching AI task summary:', err);
      setError(err.message || 'Unable to load task summary. Make sure GEMINI_API_KEY is configured.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch summary when component mounts or tasks/sessions change
  useEffect(() => {
    if (userEmail) {
      fetchAISummary();
    }
  }, [userEmail, todaySessionsFormatted.length, pendingTasks.length]);

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    
    return text.split('\n').map((line, idx) => {
      let content = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="font-extrabold text-teal-950 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      const processedLine = parts.length > 0 ? parts : content;

      // Beautiful bullet list items
      if (line.trim().startsWith('-') || line.trim().startsWith('*') || /^\d+\.\s+/.test(line.trim())) {
        const cleanLine = line.trim().replace(/^([-*]|\d+\.)\s*/, '');
        return (
          <li key={idx} className="ml-4 list-decimal mt-2 text-slate-700 font-medium leading-relaxed pl-1">
            {processedLine}
          </li>
        );
      }
      
      return (
        <p key={idx} className="mt-2 text-slate-700 font-semibold leading-relaxed">
          {processedLine}
        </p>
      );
    });
  };

  return (
    <div id="ai-task-summary-card" className="bg-gradient-to-br from-teal-50/70 to-emerald-50/40 border-2 border-[#549B8C]/40 rounded-2xl shadow-[0_2px_12px_rgba(84,155,140,0.06)] overflow-hidden transition-all duration-200">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-teal-500/10 to-emerald-500/5 border-b border-[#549B8C]/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#549B8C]/10 text-[#2D5A50]">
            <Sparkles className="h-5 w-5 animate-pulse text-[#3D7569]" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-wide flex items-center gap-1.5">
              ✨ Tasks Summary
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              SETC AI Instruction Coordinator
            </p>
          </div>
        </div>
        
        {/* Recalculate Button */}
        <button
          type="button"
          onClick={() => fetchAISummary(true)}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-3xs hover:shadow-2xs cursor-pointer transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold"
          title="Recalculate AI Agenda"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-teal-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Recalculate AI Agenda</span>
        </button>
      </div>

      {/* Role Badges Row */}
      <div className="px-5 py-2.5 bg-white/70 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 font-bold border-b border-[#549B8C]/10">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Position Profile:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-black border border-slate-200">
            {userPosition}
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <GraduationCap className="h-4 w-4 text-[#549B8C]" />
            <span>{todaySessionsFormatted.length} Lectures Today</span>
          </div>
          <div className="h-3.5 w-px bg-slate-200" />
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-emerald-600" />
            <span>{pendingTasks.length} Direct Tasks Due</span>
          </div>
        </div>
      </div>

      {/* Summary Content Body */}
      <div className="p-5 bg-white/40 text-xs text-slate-800">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <RefreshCw className="h-8 w-8 text-[#549B8C] animate-spin" />
            <p className="text-xs text-slate-400 font-extrabold animate-pulse">
              Consulting Gemini for your direct membership tasks & training schedule...
            </p>
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800">
            <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-[12px] uppercase tracking-wider">Plan Summary Unavailable</p>
              <p className="text-[11px] font-semibold text-rose-700/90 mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white/80 border border-slate-100 rounded-xl p-4 shadow-3xs space-y-2">
            <div className="list-none space-y-1">
              {renderMarkdown(summary)}
            </div>
          </div>
        )}
      </div>

      {/* Subtle bottom tag */}
      <div className="px-5 py-2.5 text-[10px] text-slate-450 font-semibold bg-slate-50/40 border-t border-slate-100 flex items-center justify-between">
        <span>Verified real-time agenda for {userName}</span>
        <span className="font-mono bg-[#549B8C]/10 text-[#2D5A50] px-2 py-0.5 rounded font-black text-[9px]">
          SETC-INTELLIGENCE REGISTER
        </span>
      </div>
    </div>
  );
}
