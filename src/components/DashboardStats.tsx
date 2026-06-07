/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Shield, 
  Users, 
  Calendar, 
  AlertTriangle, 
  Activity, 
  CheckSquare, 
  Square, 
  Plus, 
  ChevronDown, 
  Clock, 
  UserCheck, 
  X,
  PlusCircle,
  Briefcase,
  SlidersHorizontal,
  Cake,
  Gift,
  Sparkles
} from 'lucide-react';
import { Course, CourseSession, Member, Task } from '../types';
import { getSessionStatus } from '../data';
import { getDaysForMonth, MONTH_TO_NUM } from '../utils/dateUtils';
import { formatDate } from '../utils/date';

interface DashboardStatsProps {
  courses: Course[];
  sessions: CourseSession[];
  activeMonth: string;
  setActiveMonth: (month: string) => void;
  activeDay: number | 'all';
  setActiveDay: (day: number | 'all') => void;
  activeYear: number;
  setActiveYear: (year: number) => void;
  members: Member[];
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  currentUserEmail: string;
}

export default function DashboardStats({ 
  sessions, 
  activeMonth, 
  setActiveMonth,
  activeDay,
  setActiveDay,
  activeYear,
  setActiveYear,
  members,
  tasks,
  setTasks,
  currentUserEmail
}: DashboardStatsProps) {
  const monthNum = MONTH_TO_NUM[activeMonth] || '06';

  const [selectedMemberEmail, setSelectedMemberEmail] = useState<string>(currentUserEmail);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDayDropdownOpen, setIsDayDropdownOpen] = useState(false);
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
  
  // 1. Determine real-time dates for statistics, tasks, and birthdays display
  const realTimeNow = React.useMemo(() => new Date(), []);
  const realTimeYear = React.useMemo(() => realTimeNow.getFullYear(), [realTimeNow]);
  const realTimeMonthIdx = React.useMemo(() => realTimeNow.getMonth(), [realTimeNow]); // 0-11
  
  const MONTH_LIST = React.useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  const realTimeMonthName = React.useMemo(() => MONTH_LIST[realTimeMonthIdx] || 'June', [realTimeMonthIdx, MONTH_LIST]);
  const realTimeMonthNum = React.useMemo(() => String(realTimeMonthIdx + 1).padStart(2, '0'), [realTimeMonthIdx]);
  const realTimeDay = React.useMemo(() => realTimeNow.getDate(), [realTimeNow]);
  const realTimeTodayStr = React.useMemo(() => `${realTimeYear}-${realTimeMonthNum}-${String(realTimeDay).padStart(2, '0')}`, [realTimeYear, realTimeMonthNum, realTimeDay]);

  const realTimeIsLeapYear = React.useMemo(() => (realTimeYear % 4 === 0 && realTimeYear % 100 !== 0) || (realTimeYear % 400 === 0), [realTimeYear]);
  const realTimeTotalDaysInMonth = React.useMemo(() => {
    return ['January', 'March', 'May', 'July', 'August', 'October', 'December'].includes(realTimeMonthName)
      ? 31
      : realTimeMonthName === 'February'
      ? (realTimeIsLeapYear ? 29 : 28)
      : 30;
  }, [realTimeMonthName, realTimeIsLeapYear]);

  const realTimeFilterStartStr = React.useMemo(() => `${realTimeYear}-${realTimeMonthNum}-01`, [realTimeYear, realTimeMonthNum]);
  const realTimeFilterEndStr = React.useMemo(() => `${realTimeYear}-${realTimeMonthNum}-${String(realTimeTotalDaysInMonth).padStart(2, '0')}`, [realTimeYear, realTimeMonthNum, realTimeTotalDaysInMonth]);

  // New task form fields
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState(`${realTimeYear}-${realTimeMonthNum}-10`);
  const [successMsg, setSuccessMsg] = useState('');

  // Keep taskDueDate default synced with activeMonth and activeYear changes
  React.useEffect(() => {
    setTaskDueDate(`${realTimeYear}-${realTimeMonthNum}-10`);
  }, [realTimeYear, realTimeMonthNum]);

  // Count core metrics - filtered for the selected month or day ranges
  const isLeapYear = (activeYear % 4 === 0 && activeYear % 100 !== 0) || (activeYear % 400 === 0);
  const totalDaysInMonth = ['January', 'March', 'May', 'July', 'August', 'October', 'December'].includes(activeMonth)
    ? 31
    : activeMonth === 'February'
    ? (isLeapYear ? 29 : 28)
    : 30;

  const monthDaysList = getDaysForMonth(activeMonth, activeYear);

  // Use real-time for session-based stats (Today Courses, Active Classrooms, Upcoming Courses)
  const realTimeTodayCourses = React.useMemo(() => {
    return sessions.filter(s => {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      const today = new Date(realTimeTodayStr);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      return today >= start && today <= end;
    });
  }, [sessions, realTimeTodayStr]);

  const realTime7DaysLaterStr = React.useMemo(() => {
    const future = new Date(realTimeNow);
    future.setDate(future.getDate() + 7);
    const y = future.getFullYear();
    const m = String(future.getMonth() + 1).padStart(2, '0');
    const d = String(future.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [realTimeNow]);

  const realTimeUpcoming = React.useMemo(() => {
    return sessions.filter(s => {
      // Show courses starting in next 7 days (and not already completed/started today)
      return s.startDate > realTimeTodayStr && s.startDate <= realTime7DaysLaterStr;
    });
  }, [sessions, realTimeTodayStr, realTime7DaysLaterStr]);

  const realTimeActiveClassroomsCount = React.useMemo(() => {
    return new Set(realTimeTodayCourses.map(s => s.classroom)).size;
  }, [realTimeTodayCourses]);

  // Use real-time filtered tasks for the selected member
  const realTimeMemberTasks = React.useMemo(() => {
    return tasks.filter(t => {
      const belongsToMember = t.assignedTo.toLowerCase() === selectedMemberEmail.toLowerCase();
      // Tasks are in current real-time month range
      const belongsToRange = t.dueDate >= realTimeFilterStartStr && t.dueDate <= realTimeFilterEndStr;
      return belongsToMember && belongsToRange;
    });
  }, [tasks, selectedMemberEmail, realTimeFilterStartStr, realTimeFilterEndStr]);

  const realTimePendingCount = React.useMemo(() => {
    return realTimeMemberTasks.filter(t => t.status !== 'Completed').length;
  }, [realTimeMemberTasks]);

  // Use real-time filtered birthdays
  const realTimeBirthdayMembers = React.useMemo(() => {
    const todayRef = new Date(realTimeYear, realTimeMonthIdx, realTimeDay);

    return members
      .filter((m) => {
        // Exclude SETC Creator Admin
        const isCreator = m.id === 'mem-creator' || 
                          m.email.toLowerCase() === 'setcadmin' || 
                          m.email.toLowerCase() === 'setcadmin@safetycentre.org';
        if (isCreator) return false;

        const birthDate = new Date(m.dob);
        if (isNaN(birthDate.getTime())) return false;
        return birthDate.getMonth() === realTimeMonthIdx;
      })
      .map((m) => {
        const birthDate = new Date(m.dob);

        let age = todayRef.getFullYear() - birthDate.getFullYear();
        const mDiff = todayRef.getMonth() - birthDate.getMonth();
        const dDiff = todayRef.getDate() - birthDate.getDate();
        if (mDiff < 0 || (mDiff === 0 && dDiff < 0)) {
          age--;
        }

        let nextYear = todayRef.getFullYear();
        let nextBday = new Date(nextYear, birthDate.getMonth(), birthDate.getDate());

        if (nextBday < todayRef) {
          nextYear += 1;
          nextBday = new Date(nextYear, birthDate.getMonth(), birthDate.getDate());
        }

        const t1 = new Date(todayRef.getFullYear(), todayRef.getMonth(), todayRef.getDate()).getTime();
        const t2 = new Date(nextBday.getFullYear(), nextBday.getMonth(), nextBday.getDate()).getTime();
        const daysRemaining = Math.max(0, Math.round((t2 - t1) / (1000 * 60 * 60 * 24)));

        const isToday = daysRemaining === 0;

        return {
          member: m,
          formattedDob: formatDate(m.dob),
          age,
          nextBdayStr: formatDate(nextBday),
          daysRemaining,
          isToday,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [members, realTimeMonthIdx, realTimeYear, realTimeDay]);

  const handleToggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'Completed' ? 'Pending' : 'Completed';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskAssignee) return;

    const currentMemberName = members.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase())?.name || 'Le Minh Vuong';

    const newTask: Task = {
      id: `task-${Date.now()}`,
      assignedBy: currentMemberName,
      assignedTo: taskAssignee,
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      dueDate: taskDueDate,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    setTasks(prev => [newTask, ...prev]);
    
    // Automatically switch the task view to the member assigned
    setSelectedMemberEmail(taskAssignee);

    // Reset Form
    setTaskTitle('');
    setTaskDesc('');
    setTaskDueDate(`${realTimeYear}-${realTimeMonthNum}-10`);
    setSuccessMsg('Task assigned successfully!');
    setTimeout(() => {
      setSuccessMsg('');
      setIsModalOpen(false);
    }, 1200);
  };

  // Check if current user is authorized to assign tasks
  const isAuthorizedToAssign = currentUserEmail.toLowerCase() === 'vuongle0810@gmail.com' || 
                               currentUserEmail.toLowerCase() === 'setcadmin' || 
                               currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleTodayClick = () => {
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = now.getMonth();
    const monthName = months[monthIndex] || 'June';
    const day = now.getDate();
    
    setActiveYear(year);
    setActiveMonth(monthName);
    setActiveDay(day);
  };

  return (
    <>
      <div className="flex flex-col gap-2 relative">
        {/* Small "Year", "Month" and "Day" Boxes on the left top corner of "On-Going Today" box with Task Monitor label */}
        <div className="flex flex-wrap items-center gap-2 self-start pl-1 select-none z-20">
          <div className="flex items-center gap-1.5 text-slate-500 font-extrabold text-[10px] uppercase tracking-wider mr-1">
            <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-600" />
            <span>Task Monitor:</span>
          </div>
        {/* Year Selector Box */}
        <div className="relative inline-block text-left">
          <button 
            type="button"
            onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-755 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer select-none transition-all outline-hidden whitespace-nowrap"
            title={`Filter Dashboard Year: ${activeYear}`}
          >
            <span>{activeYear}</span>
            <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isYearDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isYearDropdownOpen && (
            <>
              {/* Overlay mask backing to easily close on outline click */}
              <div 
                className="fixed inset-0 z-10 cursor-default" 
                onClick={() => setIsYearDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-1.5 w-32 rounded-xl bg-white border border-slate-200/90 shadow-xl z-20 overflow-hidden divide-y divide-slate-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(yr => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setActiveYear(yr);
                      setIsYearDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                      activeYear === yr 
                        ? 'bg-emerald-50 text-emerald-800 font-bold' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Month Selector Box */}
        <div className="relative inline-block text-left">
          <button 
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer select-none transition-all outline-hidden whitespace-nowrap"
            title={`Filter Dashboard: ${activeMonth}`}
          >
            <span>{activeMonth}</span>
            <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <>
              {/* Overlay mask backing to easily close on outline click */}
              <div 
                className="fixed inset-0 z-10 cursor-default" 
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-1.5 w-44 rounded-xl bg-white border border-slate-200/90 shadow-xl z-20 overflow-hidden divide-y divide-slate-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                {months.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setActiveMonth(m);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                      activeMonth === m 
                        ? 'bg-emerald-50 text-emerald-800 font-bold' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Day Selector Box */}
        <div className="relative inline-block text-left">
          <button 
            type="button"
            onClick={() => setIsDayDropdownOpen(!isDayDropdownOpen)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer select-none transition-all outline-hidden whitespace-nowrap"
            title="Filter Dashboard by Day"
          >
            <span>
              {typeof activeDay === 'number' 
                ? `${String(activeDay).padStart(2, '0')}/${MONTH_TO_NUM[activeMonth] || '06'}/${activeYear}` 
                : 'All Days'}
            </span>
            <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isDayDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDayDropdownOpen && (
            <>
              {/* Overlay mask backing to easily close on outline click */}
              <div 
                className="fixed inset-0 z-10 cursor-default" 
                onClick={() => setIsDayDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-1.5 w-48 rounded-xl bg-white border border-slate-200/90 shadow-xl z-20 overflow-hidden divide-y divide-slate-50 py-1 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDay('all');
                    setIsDayDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                    activeDay === 'all' 
                      ? 'bg-emerald-50 text-emerald-800 font-bold' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  All Days
                </button>
                {monthDaysList.map(d => (
                  <button
                    key={d.dayNum}
                    type="button"
                    onClick={() => {
                      setActiveDay(d.dayNum);
                      setIsDayDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                      activeDay === d.dayNum 
                        ? 'bg-emerald-50 text-emerald-800 font-bold' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Today Function Box (custom header background #549B8C) */}
        <button
          type="button"
          onClick={handleTodayClick}
          className="flex items-center justify-center bg-[#549B8C] hover:bg-[#458477] active:bg-[#3d7569] text-white px-3.5 py-1.5 rounded-xl text-xs font-extrabold shadow-[0_1px_2px_rgba(84,155,140,0.15)] cursor-pointer select-none transition-all outline-none whitespace-nowrap animate-in fade-in duration-150"
          title="Go to Real-Time Today"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {/* Card 1: Ongoing block */}
        <div id="stat-ongoing" className="bg-emerald-50/40 border border-emerald-250/60 p-5 rounded-2xl flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 tracking-wider uppercase">Today Courses</span>
            <h3 className="text-3xl font-extrabold text-emerald-950 mt-1">{realTimeTodayCourses.length}</h3>
            <p className="text-xs text-emerald-700/90 font-medium mt-1">{realTimeActiveClassroomsCount} Active Labs in Use</p>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-600">
            <Activity className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Card 2: Upcoming block */}
        <div id="stat-upcoming" className="bg-sky-50/45 border border-sky-250/60 p-5 rounded-2xl flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div>
            <span className="text-[11px] font-bold text-sky-800 tracking-wider uppercase">Upcoming Courses</span>
            <h3 className="text-3xl font-extrabold text-sky-950 mt-1">{realTimeUpcoming.length}</h3>
            <p className="text-xs text-sky-700/90 font-medium mt-0.5">Starting next 7 days</p>
          </div>
          <div className="bg-sky-500/10 p-3 rounded-xl text-sky-600">
            <Calendar className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Card 3: Inter-personal Members Tasks Box */}
        <div id="stat-your-tasks" className="bg-indigo-50/40 border border-indigo-250 p-4.5 rounded-2xl flex flex-col justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:border-indigo-300 transition-all min-h-[145px]">
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-indigo-8o0 uppercase tracking-wider text-indigo-900">Your Tasks</span>
                <span className="text-[9.5px] px-1.5 py-0.2 rounded-full font-bold bg-indigo-100 text-indigo-800">
                  {realTimePendingCount}
                </span>
              </div>
              {isAuthorizedToAssign && (
                <button
                  onClick={() => {
                    const nonCreatorMembers = members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org');
                    setTaskAssignee(nonCreatorMembers[0]?.email || '');
                    setIsModalOpen(true);
                  }}
                  className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-2 py-1 rounded-lg flex items-center gap-0.5 transition-all outline-none"
                  title="Assign duty task directive to safety membership"
                >
                  <Plus className="h-3 w-3" /> Give
                </button>
              )}
            </div>

            {/* Micro List of Tasks */}
            <div className="space-y-1 max-h-[60px] overflow-y-auto pr-0.5 scrollbar-thin">
              {realTimeMemberTasks.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic py-1">No tasks assigned.</p>
              ) : (
                realTimeMemberTasks.slice(0, 3).map(task => (
                  <div 
                    key={task.id} 
                    className="flex items-start gap-1 py-1 px-1.5 rounded-lg bg-white/50 border border-indigo-100/30 hover:bg-white transition-all text-[10.5px] font-sans"
                  >
                    <button 
                      onClick={() => handleToggleTaskStatus(task.id)}
                      className="text-indigo-600 hover:text-indigo-850 outline-none mt-0.5 flex-shrink-0 cursor-pointer"
                      title={task.status === 'Completed' ? "Mark Active/Pending" : "Mark Completed"}
                    >
                      {task.status === 'Completed' ? (
                        <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Square className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1 leading-tight">
                      <span className={`block truncate font-medium text-slate-800 ${task.status === 'Completed' ? 'line-through text-slate-400 font-normal' : ''}`}>
                        {task.title}
                      </span>
                      <span className="text-[8px] text-slate-400 font-mono">
                        Due: {formatDate(task.dueDate)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Month Birthday Events Box */}
        <div id="stat-month-birthdays" className="bg-rose-50/30 border border-rose-200/70 hover:border-rose-300 flex flex-col justify-between p-4.5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all min-h-[145px]">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Cake className="h-4 w-4 text-rose-500 shrink-0" />
                <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider truncate">Birthdays in {realTimeMonthName}</span>
                <span className="text-[9.5px] px-1.5 py-0.2 rounded-full font-bold bg-rose-100 text-rose-800 shrink-0">
                  {realTimeBirthdayMembers.length}
                </span>
              </div>
            </div>

            {/* Micro List of Birthdays */}
            <div className="space-y-1 max-h-[75px] overflow-y-auto pr-0.5 scrollbar-thin">
              {realTimeBirthdayMembers.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic py-2">None.</p>
              ) : (
                realTimeBirthdayMembers.map(({ member, age, daysRemaining, isToday }) => (
                  <div 
                    key={member.id} 
                    className={`flex items-center justify-between py-1 px-1.5 rounded-lg border transition-all text-[10.5px] font-sans ${
                      isToday 
                        ? 'bg-rose-50 border-rose-250 text-rose-950 font-bold' 
                        : 'bg-white/50 border-rose-100/30 hover:bg-white text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-1.5">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-extrabold shrink-0 border uppercase ${
                        isToday ? 'bg-rose-500 text-white border-rose-600' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <span className="truncate block font-medium">
                        {member.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0 font-mono text-[9px] text-slate-400 pl-1">
                      {isToday ? (
                        <span className="text-rose-600 font-extrabold flex items-center gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" />
                          Age {age} 🎁
                        </span>
                      ) : (
                        <span>
                          {daysRemaining === 0 ? 'Today!' : `${daysRemaining}d`}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Task Assignment Modal overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-emerald-700 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-100" />
                <h3 className="font-bold text-sm tracking-tight">Assign Membership Task Directive</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-emerald-800/60 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTask} className="p-5 space-y-4">
              {successMsg && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-150 p-2.5 rounded-xl text-center text-xs font-semibold">
                  {successMsg}
                </div>
              )}

              {/* Assign To */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assignee Membership</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none bg-white text-slate-805 transition-all cursor-pointer font-medium"
                  >
                    {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                      <option key={m.id} value={m.email}>
                        {m.name} ({m.position})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Task Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clean & refill containment bins in Lab 2"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800"
                />
              </div>

              {/* Task Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Description / Details</label>
                <textarea
                  placeholder="Provide precise steps, locations, and safety tools needed..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all placeholder:text-slate-400 font-normal text-slate-800"
                />
              </div>

              {/* Due Date & Creation Authority */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Due Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="date"
                      required
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full pl-9 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none font-mono text-slate-700"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 text-right flex flex-col justify-end">
                  <div className="text-[9px] text-slate-400 font-medium font-sans">Authorized Creator</div>
                  <div className="text-[11px] font-bold text-emerald-800 font-sans truncate">Le Minh Vuong (HSE Instructor)</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer transition-colors"
                >
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
