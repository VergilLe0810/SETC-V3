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
  ChevronLeft,
  ChevronRight,
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

const VI_MONTH_NAMES: Record<string, string> = {
  'January': 'Tháng 1',
  'February': 'Tháng 2',
  'March': 'Tháng 3',
  'April': 'Tháng 4',
  'May': 'Tháng 5',
  'June': 'Tháng 6',
  'July': 'Tháng 7',
  'August': 'Tháng 8',
  'September': 'Tháng 9',
  'October': 'Tháng 10',
  'November': 'Tháng 11',
  'December': 'Tháng 12'
};

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
  courses,
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

  // States for interactive task monitor modals
  const [activeModal, setActiveModal] = useState<'ongoing' | 'upcoming' | 'your_tasks' | null>(null);
  const [modalTab, setModalTab] = useState<'mine' | 'all'>('mine');
  
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

  const loggedInMember = React.useMemo(() => {
    return members.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase());
  }, [members, currentUserEmail]);

  const currentUserLevel = React.useMemo(() => {
    return loggedInMember?.authorizedLevel?.toLowerCase() || 
      (currentUserEmail.toLowerCase() === 'setcadmin' || 
       currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org' ? 'level 4' : 'level 1');
  }, [loggedInMember, currentUserEmail]);

  const loggedInName = React.useMemo(() => {
    return loggedInMember ? loggedInMember.name : (currentUserEmail === 'setcadmin' ? 'SETC Creator Admin' : currentUserEmail.split('@')[0]);
  }, [loggedInMember, currentUserEmail]);

  const isLevel1SpecificMembership = currentUserLevel === 'level 1';

  const filteredSessions = React.useMemo(() => {
    if (isLevel1SpecificMembership) {
      const nameLower = loggedInName.toLowerCase();
      return sessions.filter(s => 
        s.instructor.toLowerCase().includes(nameLower) || 
        (s.taOfficer && s.taOfficer.toLowerCase().includes(nameLower)) ||
        (s.tgOfficer && s.tgOfficer.toLowerCase().includes(nameLower)) ||
        (s.notes && s.notes.toLowerCase().includes(nameLower)) ||
        s.enrolledIds?.some(id => id.toLowerCase().includes(nameLower))
      );
    }
    return sessions;
  }, [sessions, isLevel1SpecificMembership, loggedInName]);

  const filteredTasks = React.useMemo(() => {
    if (isLevel1SpecificMembership) {
      const nameLower = loggedInName.toLowerCase();
      const emailLower = currentUserEmail.toLowerCase();
      return tasks.filter(t => 
        t.assignedTo.toLowerCase() === emailLower || 
        t.title.toLowerCase().includes(nameLower) || 
        t.description.toLowerCase().includes(nameLower) ||
        (t.instructor && t.instructor.toLowerCase().includes(nameLower)) ||
        (t.taOfficer && t.taOfficer.toLowerCase().includes(nameLower)) ||
        (t.tgOfficer && t.tgOfficer.toLowerCase().includes(nameLower))
      );
    }
    return tasks;
  }, [tasks, isLevel1SpecificMembership, loggedInName, currentUserEmail]);

  const realTimeTodayCourses = React.useMemo(() => {
    return filteredSessions.filter(s => {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      const today = new Date(realTimeTodayStr);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      return today >= start && today <= end;
    });
  }, [filteredSessions, realTimeTodayStr]);

  const realTime7DaysLaterStr = React.useMemo(() => {
    const future = new Date(realTimeNow);
    future.setDate(future.getDate() + 7);
    const y = future.getFullYear();
    const m = String(future.getMonth() + 1).padStart(2, '0');
    const d = String(future.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [realTimeNow]);

  const realTimeUpcoming = React.useMemo(() => {
    return filteredSessions.filter(s => {
      // Show courses starting in next 7 days (and not already completed/started today)
      return s.startDate > realTimeTodayStr && s.startDate <= realTime7DaysLaterStr;
    });
  }, [filteredSessions, realTimeTodayStr, realTime7DaysLaterStr]);

  const realTimeActiveClassroomsCount = React.useMemo(() => {
    return new Set(realTimeTodayCourses.map(s => s.classroom)).size;
  }, [realTimeTodayCourses]);

  // Use real-time filtered tasks for the selected member
  const realTimeMemberTasks = React.useMemo(() => {
    return filteredTasks.filter(t => {
      const belongsToMember = t.assignedTo.toLowerCase() === selectedMemberEmail.toLowerCase() || 
        (isLevel1SpecificMembership && t.assignedTo.toLowerCase() === currentUserEmail.toLowerCase());
      // Tasks are in current real-time month range
      const belongsToRange = t.dueDate >= realTimeFilterStartStr && t.dueDate <= realTimeFilterEndStr;
      return belongsToMember && belongsToRange;
    });
  }, [filteredTasks, selectedMemberEmail, currentUserEmail, isLevel1SpecificMembership, realTimeFilterStartStr, realTimeFilterEndStr]);

  const realTimePendingCount = React.useMemo(() => {
    return realTimeMemberTasks.filter(t => t.status !== 'Completed').length;
  }, [realTimeMemberTasks]);

  const realTimeCompletedCount = React.useMemo(() => {
    return realTimeMemberTasks.filter(t => t.status === 'Completed').length;
  }, [realTimeMemberTasks]);

  const pendingTasks = React.useMemo(() => {
    return realTimeMemberTasks.filter(t => t.status !== 'Completed');
  }, [realTimeMemberTasks]);

  const completedTasks = React.useMemo(() => {
    return realTimeMemberTasks.filter(t => t.status === 'Completed');
  }, [realTimeMemberTasks]);

  // Derived session lists and helper roles for the modals
  const loggedInMemberSessions = React.useMemo(() => {
    const nameLower = loggedInName.toLowerCase();
    const emailLower = currentUserEmail.toLowerCase();
    return sessions.filter(s => 
      s.instructor.toLowerCase().includes(nameLower) || 
      (s.taOfficer && s.taOfficer.toLowerCase().includes(nameLower)) ||
      (s.tgOfficer && s.tgOfficer.toLowerCase().includes(nameLower)) ||
      (s.notes && s.notes.toLowerCase().includes(nameLower)) ||
      s.enrolledIds?.some(id => id.toLowerCase().includes(nameLower) || id.toLowerCase().includes(emailLower))
    );
  }, [sessions, loggedInName, currentUserEmail]);

  const loggedInOngoingSessions = React.useMemo(() => {
    return loggedInMemberSessions.filter(s => {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      const today = new Date(realTimeTodayStr);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      today.setHours(0,0,0,0);
      return today >= start && today <= end;
    });
  }, [loggedInMemberSessions, realTimeTodayStr]);

  const allOngoingSessions = React.useMemo(() => {
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

  const loggedInUpcomingSessions = React.useMemo(() => {
    return loggedInMemberSessions.filter(s => {
      return s.startDate > realTimeTodayStr;
    });
  }, [loggedInMemberSessions, realTimeTodayStr]);

  const allUpcomingSessions = React.useMemo(() => {
    return sessions.filter(s => {
      return s.startDate > realTimeTodayStr;
    });
  }, [sessions, realTimeTodayStr]);

  const loggedInTasks = React.useMemo(() => {
    const emailLower = currentUserEmail.toLowerCase();
    return tasks.filter(t => t.assignedTo.toLowerCase() === emailLower);
  }, [tasks, currentUserEmail]);

  const getCourseForSession = (courseId: string) => {
    return courses.find(c => c.id === courseId) || { code: 'N/A', title: 'Unknown Course', category: 'N/A', level: 'Basic' };
  };

  const getRoleForSession = (session: CourseSession) => {
    const name = loggedInName.toLowerCase();
    const email = currentUserEmail.toLowerCase();
    const roles: string[] = [];
    if (session.instructor.toLowerCase().includes(name)) roles.push('Giảng viên');
    if (session.taOfficer && session.taOfficer.toLowerCase().includes(name)) roles.push('Trợ giảng (TA)');
    if (session.tgOfficer && session.tgOfficer.toLowerCase().includes(name)) roles.push('Giám thị (TG)');
    if (session.notes && session.notes.toLowerCase().includes(name)) roles.push('Điều phối viên');
    if (session.enrolledIds?.some(id => id.toLowerCase().includes(name) || id.toLowerCase().includes(email))) roles.push('Học viên tham gia');
    return roles.join(', ') || 'Học viên';
  };

  const renderSessionsTable = (sessionsList: CourseSession[]) => {
    if (sessionsList.length === 0) {
      return (
        <div className="text-center py-10 bg-white border border-slate-200/80 rounded-xl">
          <p className="text-slate-400 text-xs font-semibold italic font-serif">Không có khóa học/buổi học nào được lên lịch trong mục này.</p>
        </div>
      );
    }

    return (
      <>
        {/* Desktop and Tablet: Grid Table Layout */}
        <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[9.5px] font-bold tracking-wider border-b border-slate-100">
                  <th className="p-3 text-left">Mã Khóa Học</th>
                  <th className="p-3 text-left">Tên Khóa Học</th>
                  <th className="p-3 text-left">Ngày & Giờ Học</th>
                  <th className="p-3 text-left">Hình Thức & Lớp</th>
                  <th className="p-3 text-left">Vai trò của Tôi</th>
                  <th className="p-3 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-755 font-medium">
                {sessionsList.map(s => {
                  const c = getCourseForSession(s.courseId);
                  const role = getRoleForSession(s);
                  const status = getSessionStatus(s.startDate, s.endDate, realTimeTodayStr);

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 whitespace-nowrap text-left">
                        <span className="font-mono font-black text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase">
                          {c.code}
                        </span>
                      </td>
                      <td className="p-3 text-left">
                        <div className="text-slate-900 font-bold max-w-xs md:max-w-sm truncate text-left" title={c.title}>
                          {c.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold text-left">{c.category} ({c.level === 'Basic' ? 'Cơ bản' : c.level || 'Cơ bản'})</div>
                      </td>
                      <td className="p-3 whitespace-nowrap text-left">
                        <div className="text-slate-800 font-semibold font-mono">{formatDate(s.startDate)} → {formatDate(s.endDate)}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{s.startTime} - {s.endTime}</div>
                      </td>
                      <td className="p-3 whitespace-nowrap text-left">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className={`text-[9px] font-black font-mono px-1.5 py-0.2 rounded uppercase ${
                            s.method === 'Online' ? 'bg-sky-100 text-sky-850' : 'bg-emerald-105 text-emerald-850 bg-emerald-100'
                          }`}>
                            {s.method === 'Online' ? 'Trực tuyến' : 'Trực tiếp'}
                          </span>
                        </div>
                        <div className="text-slate-500 font-semibold">{s.classroom}</div>
                      </td>
                      <td className="p-3 text-left">
                        <span className="text-[10.5px] font-bold text-slate-805 bg-slate-100/60 border border-slate-200 rounded px-2 py-0.5 whitespace-nowrap">
                          {role}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap text-right">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          status === 'ON-GOING' 
                            ? 'bg-emerald-100 text-emerald-800 animate-pulse' 
                            : status === 'COMPLETED' 
                              ? 'bg-slate-100 text-slate-500' 
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {status === 'ON-GOING' ? 'ĐANG DIỄN RA' : status === 'COMPLETED' ? 'ĐÃ HOÀN THÀNH' : 'SẮP DIỄN RA'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile: Cozy List Card Layout */}
        <div className="block md:hidden space-y-3.5">
          {sessionsList.map(s => {
            const c = getCourseForSession(s.courseId);
            const role = getRoleForSession(s);
            const status = getSessionStatus(s.startDate, s.endDate, realTimeTodayStr);

            return (
              <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs space-y-3 text-left">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="space-y-1">
                    <span className="font-mono font-black text-[9.5px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded uppercase select-all inline-block">
                      {c.code}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {c.title}
                    </h4>
                    <div className="text-[10.5px] text-slate-450 font-semibold">{c.category} ({c.level === 'Basic' ? 'Cơ bản' : c.level || 'Cơ bản'})</div>
                  </div>
                  
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                    status === 'ON-GOING' 
                      ? 'bg-emerald-100 text-emerald-800 animate-pulse' 
                      : status === 'COMPLETED' 
                        ? 'bg-slate-100 text-slate-500' 
                        : 'bg-amber-100 text-amber-800'
                  }`}>
                    {status === 'ON-GOING' ? 'ĐANG DIỄN RA' : status === 'COMPLETED' ? 'ĐÃ THÀNH' : 'SẮP DIỄN RA'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-650 border-t border-slate-100 pt-2.5">
                  <div className="flex items-start gap-1.5 justify-between">
                    <span className="font-semibold text-slate-400 shrink-0">Ngày huấn luyện:</span>
                    <span className="font-mono font-bold text-slate-800 text-right">{formatDate(s.startDate)} → {formatDate(s.endDate)}</span>
                  </div>
                  <div className="flex items-start gap-1.5 justify-between">
                    <span className="font-semibold text-slate-400 shrink-0">Giờ học:</span>
                    <span className="font-mono font-bold text-slate-700 text-right">{s.startTime} - {s.endTime}</span>
                  </div>
                  <div className="flex items-start gap-1.5 justify-between">
                    <span className="font-semibold text-slate-400 shrink-0">Lớp học:</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1.5 text-right justify-end">
                      <span className={`text-[9px] font-black font-mono px-1.5 py-0.2 rounded uppercase ${
                        s.method === 'Online' ? 'bg-sky-100 text-sky-850' : 'bg-emerald-100 text-emerald-850'
                      }`}>
                        {s.method === 'Online' ? 'Online' : 'Offline'}
                      </span>
                      <span>{s.classroom}</span>
                    </span>
                  </div>
                  <div className="flex items-start gap-1.5 justify-between">
                    <span className="font-semibold text-slate-400 shrink-0">Vai trò của Tôi:</span>
                    <span className="text-[10px] font-black text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded inline-block uppercase leading-none text-right">
                      {role}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  // Use real-time filtered birthdays - upcoming in the current calendar year
  const realTimeBirthdayMembers = React.useMemo(() => {
    const todayRef = new Date(realTimeYear, realTimeMonthIdx, realTimeDay);
    todayRef.setHours(0, 0, 0, 0);

    return members
      .filter((m) => {
        // Exclude SETC Creator Admin
        const isCreator = m.id === 'mem-creator' || 
                          m.email.toLowerCase() === 'setcadmin' || 
                          m.email.toLowerCase() === 'setcadmin@safetycentre.org';
        if (isCreator) return false;

        const birthDate = new Date(m.dob);
        if (isNaN(birthDate.getTime())) return false;

        // Birthday in current year
        const bdayThisYear = new Date(realTimeYear, birthDate.getMonth(), birthDate.getDate());
        bdayThisYear.setHours(0, 0, 0, 0);

        // Filter: must be on or after today AND in the current year
        return bdayThisYear >= todayRef && bdayThisYear.getFullYear() === realTimeYear;
      })
      .map((m) => {
        const birthDate = new Date(m.dob);
        const bdayThisYear = new Date(realTimeYear, birthDate.getMonth(), birthDate.getDate());
        bdayThisYear.setHours(0, 0, 0, 0);

        let age = realTimeYear - birthDate.getFullYear();

        const t1 = todayRef.getTime();
        const t2 = bdayThisYear.getTime();
        const daysRemaining = Math.max(0, Math.round((t2 - t1) / (1000 * 60 * 60 * 24)));

        const isToday = daysRemaining === 0;

        return {
          member: m,
          formattedDob: formatDate(m.dob),
          age,
          nextBdayStr: formatDate(bdayThisYear),
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
        if (nextStatus === 'Completed') {
          const isCourseTask = !!t.sessionId;
          const endDate = t.endDate || t.dueDate;
          const isFinished = !isCourseTask || (endDate < realTimeTodayStr);
          if (!isFinished) {
            return t; // Prevent checking/marking completed
          }
        }
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskAssignee) return;

    const currentMemberName = members.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase())?.name || 'SETC Creator Admin';

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
  const isAuthorizedToAssign = currentUserEmail.toLowerCase() === 'setcadmin' || 
                               currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevDay = () => {
    if (activeDay === 'all') {
      const now = new Date();
      setActiveDay(now.getDate());
      return;
    }

    if (activeDay > 1) {
      setActiveDay(activeDay - 1);
    } else {
      // Transition to previous month
      const currentMonthIdx = months.indexOf(activeMonth);
      let prevMonthIdx = currentMonthIdx - 1;
      let prevYear = activeYear;
      if (prevMonthIdx < 0) {
        prevMonthIdx = 11;
        prevYear -= 1;
      }
      
      const prevMonthName = months[prevMonthIdx];
      const isLeap = (prevYear % 4 === 0 && prevYear % 100 !== 0) || (prevYear % 400 === 0);
      const prevMonthDays = ['January', 'March', 'May', 'July', 'August', 'October', 'December'].includes(prevMonthName)
        ? 31
        : prevMonthName === 'February'
        ? (isLeap ? 29 : 28)
        : 30;

      setActiveYear(prevYear);
      setActiveMonth(prevMonthName);
      setActiveDay(prevMonthDays);
    }
  };

  const handleNextDay = () => {
    if (activeDay === 'all') {
      setActiveDay(1);
      return;
    }

    if (activeDay < totalDaysInMonth) {
      setActiveDay(activeDay + 1);
    } else {
      // Transition to next month
      const currentMonthIdx = months.indexOf(activeMonth);
      let nextMonthIdx = currentMonthIdx + 1;
      let nextYear = activeYear;
      if (nextMonthIdx > 11) {
        nextMonthIdx = 0;
        nextYear += 1;
      }

      const nextMonthName = months[nextMonthIdx];
      setActiveYear(nextYear);
      setActiveMonth(nextMonthName);
      setActiveDay(1);
    }
  };

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
            <span>Giám sát Công việc:</span>
          </div>
          {isLevel1SpecificMembership && (
            <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-700 font-black px-2 py-0.5 rounded-lg animate-pulse whitespace-nowrap">
              Chế độ Học viên (Chỉ hiển thị các buổi học/nhiệm vụ được phân công cho bạn)
            </span>
          )}
        {/* Year Selector Box */}
        <div className="relative inline-block text-left">
          <button 
            type="button"
            onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-755 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer select-none transition-all outline-hidden whitespace-nowrap"
            title={`Lọc Năm: ${activeYear}`}
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
                    Năm {yr}
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
            title={`Lọc theo Tháng: ${VI_MONTH_NAMES[activeMonth] || activeMonth}`}
          >
            <span>{VI_MONTH_NAMES[activeMonth] || activeMonth}</span>
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
                    {VI_MONTH_NAMES[m] || m}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Day Selector Box with Left and Right Navigation Arrows */}
        <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] divide-x divide-slate-100 overflow-hidden">
          <button
            type="button"
            onClick={handlePrevDay}
            className="flex items-center justify-center p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-850 transition-colors cursor-pointer select-none"
            title="Ngày Trước"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </button>

          <div className="relative inline-block text-left">
            <button 
              type="button"
              onClick={() => setIsDayDropdownOpen(!isDayDropdownOpen)}
              className="flex items-center gap-1.5 hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none transition-all outline-hidden whitespace-nowrap"
              title="Lọc theo Ngày"
            >
              <span>
                {typeof activeDay === 'number' 
                  ? `Ngày ${String(activeDay).padStart(2, '0')}/${MONTH_TO_NUM[activeMonth] || '06'}/${activeYear}` 
                  : 'Tất cả các ngày'}
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
                <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-48 rounded-xl bg-white border border-slate-200/90 shadow-xl z-20 overflow-hidden divide-y divide-slate-50 py-1 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
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
                    Tất cả các ngày
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
                      {d.label.replace('Day', 'Ngày')}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="flex items-center justify-center p-1.5 hover:bg-slate-50 text-slate-500 hover:text-slate-850 transition-colors cursor-pointer select-none"
            title="Ngày Kế Tiếp"
          >
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {/* Today Function Box (custom header background #549B8C) */}
        <button
          type="button"
          onClick={handleTodayClick}
          className="flex items-center justify-center bg-[#549B8C] hover:bg-[#458477] active:bg-[#3d7569] text-white px-3.5 py-1.5 rounded-xl text-xs font-extrabold shadow-[0_1px_2px_rgba(84,155,140,0.15)] cursor-pointer select-none transition-all outline-none whitespace-nowrap animate-in fade-in duration-150"
          title="Quay lại Ngày Hôm Nay"
        >
          Hôm nay
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-6">
        {/* Card 1: Ongoing block */}
        <div 
          id="stat-ongoing" 
          onClick={() => {
            setActiveModal('ongoing');
            setModalTab('mine');
          }}
          className="bg-emerald-50/40 border border-emerald-250/60 p-5 rounded-2xl flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)] cursor-pointer hover:bg-emerald-50 hover:border-emerald-400 hover:shadow-[0_4px_12px_rgba(16,185,129,0.08)] transition-all duration-150 hover:scale-[1.01]"
          title="Click để xem chi tiết các khóa đang diễn ra"
        >
          <div>
            <span className="text-[11px] font-bold text-emerald-800 tracking-wider uppercase">Khóa học Đang diễn ra</span>
            <h3 className="text-3xl font-extrabold text-emerald-950 mt-1">{realTimeTodayCourses.length}</h3>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-600">
            <Activity className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Card 2: Upcoming block */}
        <div 
          id="stat-upcoming" 
          onClick={() => {
            setActiveModal('upcoming');
            setModalTab('mine');
          }}
          className="bg-sky-50/45 border border-sky-250/60 p-5 rounded-2xl flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)] cursor-pointer hover:bg-sky-100 hover:border-sky-400 hover:shadow-[0_4px_12px_rgba(14,165,233,0.08)] transition-all duration-150 hover:scale-[1.01]"
          title="Click để xem chi tiết các khóa sắp tới"
        >
          <div>
            <span className="text-[11px] font-bold text-sky-800 tracking-wider uppercase">Khóa học Sắp tới</span>
            <h3 className="text-3xl font-extrabold text-sky-950 mt-1">{realTimeUpcoming.length}</h3>
          </div>
          <div className="bg-sky-500/10 p-3 rounded-xl text-sky-600">
            <Calendar className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Card 3: Inter-personal Members Tasks Box */}
        <div 
          id="stat-your-tasks" 
          onClick={() => setActiveModal('your_tasks')}
          className="bg-indigo-50/40 border border-indigo-250 p-5 rounded-2xl flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)] cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 hover:shadow-[0_4px_12px_rgba(79,70,229,0.08)] transition-all duration-150 hover:scale-[1.01]"
          title="Click để xem danh sách nhiệm vụ chi tiết"
        >
          <div>
            <span className="text-[11px] font-bold text-indigo-800 tracking-wider uppercase">Nhiệm vụ của Bạn</span>
            <h3 className="text-3xl font-extrabold text-indigo-950 mt-1">{realTimePendingCount}</h3>
          </div>
          <div className="bg-indigo-500/10 p-3 rounded-xl text-indigo-600">
            <CheckSquare className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Card 4: Finished Tasks Box */}
        <div 
          id="stat-finished-tasks" 
          onClick={() => setActiveModal('your_tasks')}
          className="bg-teal-50/40 border border-teal-250 p-5 rounded-2xl flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)] cursor-pointer hover:bg-teal-50 hover:border-teal-400 hover:shadow-[0_4px_12px_rgba(20,184,166,0.08)] transition-all duration-150 hover:scale-[1.01]"
          title="Click để xem danh sách nhiệm vụ chi tiết"
        >
          <div>
            <span className="text-[11px] font-bold text-teal-800 tracking-wider uppercase">Nhiệm vụ Đã xong</span>
            <h3 className="text-3xl font-extrabold text-teal-950 mt-1">{realTimeCompletedCount}</h3>
          </div>
          <div className="bg-teal-500/10 p-3 rounded-xl text-teal-600">
            <CheckSquare className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Card 4: Month Birthday Events Box */}
        <div id="stat-month-birthdays" className="bg-rose-50/30 border border-rose-200/70 hover:border-rose-300 flex flex-col justify-between p-4.5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all min-h-[145px]">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Cake className="h-4 w-4 text-rose-500 shrink-0" />
                <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider truncate">Sinh nhật Sắp tới ({realTimeYear})</span>
                <span className="text-[9.5px] px-1.5 py-0.2 rounded-full font-bold bg-rose-100 text-rose-800 shrink-0">
                  {realTimeBirthdayMembers.length}
                </span>
              </div>
            </div>

            {/* Micro List of Birthdays */}
            <div className="space-y-1.5 max-h-[75px] overflow-y-auto pr-0.5 scrollbar-thin">
              {realTimeBirthdayMembers.length === 0 ? (
                <p className="text-[10px] text-slate-500 italic py-2">Không có sinh nhật nào sắp tới.</p>
              ) : (
                realTimeBirthdayMembers.map(({ member, formattedDob, daysRemaining, isToday }) => (
                  <div 
                    key={member.id} 
                    className={`flex items-center justify-between py-1.5 px-2 rounded-lg border transition-all text-[10px] font-sans ${
                      isToday 
                        ? 'bg-rose-50 border-rose-250 text-rose-950 font-bold' 
                        : 'bg-white/50 border-rose-100/30 hover:bg-white text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="truncate block font-bold text-slate-800">
                        {member.name}
                      </span>
                      <span className="text-[8px] text-slate-450 block">Ngày sinh: {formattedDob}</span>
                    </div>
                    <div className="text-right shrink-0 font-mono text-[9px] text-slate-500 pl-1">
                      {isToday ? (
                        <span className="text-rose-600 font-extrabold flex items-center gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" />
                          Hôm nay! 🎉
                        </span>
                      ) : (
                        <span>
                          Còn {daysRemaining} ngày
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
                <h3 className="font-bold text-sm tracking-tight">Giao Chỉ thị Nhiệm vụ Thành viên</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-full hover:bg-emerald-800/60 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTask} className="p-5 space-y-4 text-left">
              {successMsg && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-150 p-2.5 rounded-xl text-center text-xs font-semibold">
                  {successMsg === 'Task assigned successfully!' ? 'Giao chỉ thị nhiệm vụ thành công!' : successMsg}
                </div>
              )}

              {/* Assign To */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Thành viên Nhận Nhiệm vụ</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none bg-white text-slate-805 transition-all cursor-pointer font-medium"
                  >
                    <option value="">-- Chọn thành viên nhận nhiệm vụ --</option>
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
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tiêu đề Nhiệm vụ</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Dọn dẹp & làm đầy các thùng chứa tại phòng Lab 2"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-800"
                />
              </div>

              {/* Task Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mô tả / Chi tiết công việc</label>
                <textarea
                  placeholder="Cung cấp các bước thực hiện, vị trí cụ thể và dụng cụ bảo hộ cần thiết..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-all placeholder:text-slate-400 font-normal text-slate-800"
                />
              </div>

              {/* Due Date & Creation Authority */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Hạn hoàn thành</label>
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
                  <div className="text-[9px] text-slate-400 font-medium font-sans">Người giao nhiệm vụ</div>
                  <div className="text-[11px] font-bold text-emerald-800 font-sans truncate">
                    {members.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase())?.name || 'SETC Creator Admin'}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer transition-colors"
                >
                  Giao Nhiệm vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pop-up Modals for Task Monitor Sections */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 cursor-default" 
            onClick={() => setActiveModal(null)}
          />
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150 z-10 text-left">
            
            {/* Modal Header */}
            <div className={`p-5 text-white flex items-center justify-between ${
              activeModal === 'ongoing' 
                ? 'bg-emerald-600' 
                : activeModal === 'upcoming' 
                  ? 'bg-sky-600' 
                  : 'bg-indigo-600'
            }`}>
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  {activeModal === 'ongoing' && (
                    <>
                      <Activity className="h-5 w-5 animate-pulse" />
                      <span>Chi tiết Các Hoạt động Đang diễn ra</span>
                    </>
                  )}
                  {activeModal === 'upcoming' && (
                    <>
                      <Calendar className="h-5 w-5" />
                      <span>Chi tiết Các Hoạt động Sắp diễn ra</span>
                    </>
                  )}
                  {activeModal === 'your_tasks' && (
                    <>
                      <CheckSquare className="h-5 w-5" />
                      <span>Nhiệm vụ & Công việc Được Giao của Bạn</span>
                    </>
                  )}
                </h3>
                {activeModal === 'your_tasks' && (
                  <p className="text-white/85 text-[11px] font-semibold mt-1">
                    Xem đồng thời các khóa học được phân công và các chỉ thị hành chính trực tiếp
                  </p>
                )}
              </div>
              
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 bg-slate-50/50 space-y-6">
              {activeModal === 'ongoing' && (
                <div className="space-y-4">
                  {renderSessionsTable(loggedInOngoingSessions)}
                </div>
              )}

              {activeModal === 'upcoming' && (
                <div className="space-y-4">
                  {renderSessionsTable(loggedInUpcomingSessions)}
                </div>
              )}

              {activeModal === 'your_tasks' && (
                <div className="space-y-6">
                  {/* Table 1: Given tasks by the Directors */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                          <CheckSquare className="h-4 w-4 text-indigo-500" />
                          <span>Nhiệm vụ được giao bởi Ban Giám đốc</span>
                        </h4>
                      </div>
                      <span className="text-[10.5px] px-2.5 py-0.5 rounded-full font-black bg-indigo-50 text-indigo-700 uppercase tracking-wide border border-indigo-100">
                        Tổng cộng: {loggedInTasks.length}
                      </span>
                    </div>
                    
                    {loggedInTasks.length === 0 ? (
                      <div className="text-center py-7 text-xs text-slate-400 italic font-serif">Ban Giám đốc chưa phân công nhiệm vụ nào.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-[9.5px] font-bold tracking-wider border-b border-slate-250/50">
                              <th className="p-3 text-left">Tên Nhiệm vụ</th>
                              <th className="p-3 text-left">Mục tiêu / Chi tiết</th>
                              <th className="p-3 text-left">Giao bởi</th>
                              <th className="p-3 font-mono text-left">Hạn chót</th>
                              <th className="p-3 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-left">
                            {loggedInTasks.map(t => {
                              const isCourseTask = !!t.sessionId;
                              const endDate = t.endDate || t.dueDate;
                              const isFinished = !isCourseTask || (endDate < realTimeTodayStr);

                              return (
                                <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="p-3 text-left">
                                    <div className="text-slate-900 font-bold">{t.title}</div>
                                  </td>
                                  <td className="p-3 text-left">
                                    <div className="text-slate-500 text-[11px] font-normal max-w-sm whitespace-pre-wrap">{t.description || 'N/A'}</div>
                                  </td>
                                  <td className="p-3 whitespace-nowrap text-slate-500 text-left">
                                    {t.assignedBy}
                                  </td>
                                  <td className="p-3 whitespace-nowrap text-slate-550 font-mono text-left">
                                    {formatDate(t.dueDate)}
                                  </td>
                                  <td className="p-3 whitespace-nowrap text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!isFinished) {
                                          return;
                                        }
                                        handleToggleTaskStatus(t.id);
                                      }}
                                      className={`inline-flex items-center gap-1 text-[10.5px] font-extrabold px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                                        !isFinished 
                                          ? 'bg-slate-150 border-slate-250 text-slate-400 cursor-not-allowed' 
                                          : t.status === 'Completed'
                                            ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'
                                            : 'bg-emerald-50 border-emerald-110 text-emerald-600 hover:bg-emerald-100'
                                      }`}
                                      title={!isFinished ? `Khóa học chưa kết thúc (hoàn thành vào ngày ${formatDate(endDate)})` : "Thay đổi trạng thái công việc"}
                                    >
                                      {t.status === 'Completed' ? 'Đặt hoạt động' : 'Hoàn thành'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Table 2: Tasks given by authorized level 4 membership */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100">
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                          <CheckSquare className="h-4 w-4 text-emerald-500" />
                          <span>Bảng 2: Chỉ thị & Nhiệm vụ từ Ban Quản lý (Cấp độ 4)</span>
                        </h4>
                        <p className="text-[10.5px] text-slate-400 font-semibold mt-0.5">Các yêu cầu công việc, chỉ thị và kiểm tra được gán cho hồ sơ trung tâm an toàn của bạn.</p>
                      </div>
                      <span className="text-[10.5px] px-2.5 py-0.5 rounded-full font-black bg-emerald-50 text-emerald-700 uppercase tracking-wide border border-emerald-100">
                        {loggedInTasks.length} đã phân công
                      </span>
                    </div>
                    
                    {loggedInTasks.length === 0 ? (
                      <div className="text-center py-7 text-xs text-slate-400 italic font-serif">Chưa có chỉ thị công việc trực tiếp nào được gán cho thành viên của bạn.</div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-[9.5px] font-bold tracking-wider border-b border-slate-250/50">
                              <th className="p-3 text-left">Trạng thái</th>
                              <th className="p-3 text-left">Tiêu đề & Mô tả Chi tiết</th>
                              <th className="p-3 text-left">Giao bởi</th>
                              <th className="p-3 font-mono text-left">Hạn chót</th>
                              <th className="p-3 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-left">
                            {loggedInTasks.map(t => {
                              const isCourseTask = !!t.sessionId;
                              const endDate = t.endDate || t.dueDate;
                              const isFinished = !isCourseTask || (endDate < realTimeTodayStr);

                              return (
                                <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="p-3 whitespace-nowrap text-left">
                                    <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      t.status === 'Completed' 
                                        ? 'bg-emerald-100 text-emerald-800' 
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {t.status === 'Completed' ? 'ĐÃ HOÀN THÀNH' : 'ĐANG CHỜ'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-left">
                                    <div className="text-slate-905 text-left font-bold">{t.title}</div>
                                    {t.description && <div className="text-slate-450 text-left text-[10.5px] mt-0.5 font-normal">{t.description}</div>}
                                  </td>
                                  <td className="p-3 whitespace-nowrap text-slate-500 text-left">
                                    {t.assignedBy}
                                  </td>
                                  <td className="p-3 whitespace-nowrap text-slate-550 font-mono text-left">
                                    {formatDate(t.dueDate)}
                                  </td>
                                  <td className="p-3 whitespace-nowrap text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (!isFinished) {
                                          return;
                                        }
                                        handleToggleTaskStatus(t.id);
                                      }}
                                      className={`inline-flex items-center gap-1 text-[10.5px] font-extrabold px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                                        !isFinished 
                                          ? 'bg-slate-150 border-slate-250 text-slate-400 cursor-not-allowed' 
                                          : t.status === 'Completed'
                                            ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100'
                                            : 'bg-emerald-50 border-emerald-110 text-emerald-600 hover:bg-emerald-100'
                                      }`}
                                      title={!isFinished ? `Khóa học chưa kết thúc (hoàn thành vào ngày ${formatDate(endDate)})` : "Thay đổi trạng thái công việc"}
                                    >
                                      {t.status === 'Completed' ? 'Đặt hoạt động' : 'Hoàn thành'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4.5 py-1.8 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Đóng Cửa sổ
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
