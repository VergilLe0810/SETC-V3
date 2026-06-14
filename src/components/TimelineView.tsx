/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronLeft, ChevronRight, MapPin, Clock, User, Calendar, SlidersHorizontal, Plus, X, AlertTriangle, Trash2, Settings, ShieldAlert, AlertCircle } from 'lucide-react';
import { Course, CourseSession, Member, CourseDomain } from '../types';
import { getSessionStatus, CLASSROOMS } from '../data';
import { getDaysForMonth } from '../utils/dateUtils';
import { formatDate } from '../utils/date';

interface TimelineViewProps {
  courses: Course[];
  sessions: CourseSession[];
  onSelectCourse: (course: Course, session: CourseSession) => void;
  activeMonth?: string;
  setActiveMonth?: (month: string) => void;
  activeDay?: number | 'all';
  setActiveDay?: (day: number | 'all') => void;
  activeYear?: number;
  setActiveYear?: (year: number) => void;
  onAddSession?: (newSession: CourseSession) => void;
  onRemoveSession?: (sessionId: string) => void;
  onUpdateSession?: (updatedSession: CourseSession) => void;
  currentUserEmail: string;
  members: Member[];
}

const MONTH_START_DAYS: Record<string, number> = {
  'January': 4,   // Thursday
  'February': 0,  // Sunday
  'March': 0,     // Sunday
  'April': 3,     // Wednesday
  'May': 5,       // Friday
  'June': 1,      // Monday
  'July': 3,      // Wednesday
  'August': 6,    // Saturday
  'September': 2, // Tuesday
  'October': 4,   // Thursday
  'November': 0,  // Sunday
  'December': 2   // Tuesday
};

const MONTH_TO_NUM: Record<string, string> = {
  'January': '01',
  'February': '02',
  'March': '03',
  'April': '04',
  'May': '05',
  'June': '06',
  'July': '07',
  'August': '08',
  'September': '09',
  'October': '10',
  'November': '11',
  'December': '12'
};

const MONTH_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

const VI_MONTH_MAP: Record<string, string> = {
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

const YEAR_LIST = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export default function TimelineView({ 
  courses, 
  sessions, 
  onSelectCourse,
  onAddSession,
  onRemoveSession,
  onUpdateSession,
  currentUserEmail,
  members
}: TimelineViewProps) {
  const loggedInMember = members.find(m => m.email.toLowerCase() === currentUserEmail.toLowerCase());
  const currentUserLevel = loggedInMember?.authorizedLevel?.toLowerCase() || 
    (currentUserEmail.toLowerCase() === 'setcadmin@safetycentre.org' || 
     currentUserEmail.toLowerCase() === 'setcadmin' ? 'level 4' : 'level 1');
  const hasAssignmentAccess = currentUserLevel === 'level 3' || currentUserLevel === 'level 4';

  // Use independent local states defaulting to real-time month and year
  const realToday = new Date();
  const realYear = realToday.getFullYear();
  const realMonthIndex = realToday.getMonth();
  const realMonthName = MONTH_LIST[realMonthIndex] || 'June';
  const realDayNum = realToday.getDate();

  const [monthVal, setMonthVal] = useState<string>(realMonthName);
  const [yearVal, setYearVal] = useState<number>(realYear);

  // Pop-up modal details view state
  const [popupCourseSession, setPopupCourseSession] = useState<{ course: Course; session: CourseSession } | null>(null);

  // Editing state for Course Session popup
  const [isEditingSession, setIsEditingSession] = useState<boolean>(false);
  const [sessionToDelete, setSessionToDelete] = useState<CourseSession | null>(null);
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editEndDate, setEditEndDate] = useState<string>('');
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEndTime, setEditEndTime] = useState<string>('');
  const [editInstructor, setEditInstructor] = useState<string>('');
  const [editClassroom, setEditClassroom] = useState<string>('');
  const [editMaxCapacity, setEditMaxCapacity] = useState<number>(20);
  const [editTaOfficer, setEditTaOfficer] = useState<string>('');
  const [editTgOfficer, setEditTgOfficer] = useState<string>('');
  const [editMethod, setEditMethod] = useState<'Online' | 'Offline'>('Offline');

  const handleStartEditingSession = () => {
    if (!popupCourseSession) return;
    const { session } = popupCourseSession;
    setIsEditingSession(true);
    setEditStartDate(session.startDate);
    setEditEndDate(session.endDate);
    setEditStartTime(session.startTime);
    setEditEndTime(session.endTime);
    setEditInstructor(session.instructor);
    setEditClassroom(session.classroom);
    setEditMaxCapacity(session.maxCapacity);
    setEditTaOfficer(session.taOfficer || '');
    setEditTgOfficer(session.tgOfficer || '');
    setEditMethod(session.method || 'Offline');
  };

  const handleSaveSessionUpdates = () => {
    if (!popupCourseSession) return;
    const updatedSession: CourseSession = {
      ...popupCourseSession.session,
      startDate: editStartDate,
      endDate: editEndDate,
      startTime: editStartTime,
      endTime: editEndTime,
      instructor: editInstructor,
      classroom: editClassroom,
      maxCapacity: editMaxCapacity,
      taOfficer: editTaOfficer,
      tgOfficer: editTgOfficer,
      method: editMethod,
    };

    if (onUpdateSession) {
      onUpdateSession(updatedSession);
    }

    setPopupCourseSession({
      course: popupCourseSession.course,
      session: updatedSession
    });
    setIsEditingSession(false);
  };

  const handleCancelEditingSession = () => {
    setIsEditingSession(false);
  };

  const handleDeleteSession = () => {
    if (!popupCourseSession) return;
    setSessionToDelete(popupCourseSession.session);
  };

  // Courses Assignment (Schedule Manager Component) state and form values
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState<boolean>(false);
  const [selCourseId, setSelCourseId] = useState<string>(courses[0]?.id || '');
  const [assignCourseCode, setAssignCourseCode] = useState<string>(courses[0]?.code || '');
  const [assignCourseName, setAssignCourseName] = useState<string>(courses[0]?.title || '');
  const [assignStartDate, setAssignStartDate] = useState<string>('2026-06-10');
  const [assignEndDate, setAssignEndDate] = useState<string>('2026-06-12');
  const [assignTa, setAssignTa] = useState<string>('');
  const [assignTg, setAssignTg] = useState<string>('');
  const [assignMethod, setAssignMethod] = useState<'Online' | 'Offline'>('Offline');
  const [assignInstructor, setAssignInstructor] = useState<string>(() => {
    const foundInst = members?.find(m => m.position?.toLowerCase().includes('instructor') || m.position?.toLowerCase().includes('giảng viên'));
    if (foundInst) {
      return `${foundInst.name} (${foundInst.position || 'Giảng viên'})`;
    }
    const defaultInst = members?.[1] || members?.[0];
    if (defaultInst) {
      return `${defaultInst.name} (${defaultInst.position || 'Thành viên'})`;
    }
    return '';
  });
  const [assignClassroom, setAssignClassroom] = useState<string>(CLASSROOMS[0]?.name || '');
  const [assignStartTime, setAssignStartTime] = useState<string>('09:00');
  const [assignEndTime, setAssignEndTime] = useState<string>('16:00');
  const [assignCapacity, setAssignCapacity] = useState<number>(25);
  const [assignNote, setAssignNote] = useState<string>('');
  const [assignFeedback, setAssignFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [assignDomain, setAssignDomain] = useState<CourseDomain>(() => {
    const firstCourse = courses[0];
    return (firstCourse?.domain as CourseDomain) || 'HSE';
  });

  const handleCourseSelectChange = (courseIdVal: string) => {
    setSelCourseId(courseIdVal);
    const selected = courses.find(c => c.id === courseIdVal);
    if (selected) {
      setAssignCourseCode(selected.code);
      setAssignCourseName(selected.title);
      if (selected.domain) {
        setAssignDomain(selected.domain);
      }
    }
  };

  const handlePublishAssignment = (e: FormEvent) => {
    e.preventDefault();
    setAssignFeedback(null);

    if (!selCourseId) {
      setAssignFeedback({ type: 'error', message: 'Vui lòng chọn một khóa học học thuật để bắt đầu.' });
      return;
    }
    if (!assignStartDate || !assignEndDate) {
      setAssignFeedback({ type: 'error', message: 'Yêu cầu điền đầy đủ cả Ngày Bắt đầu và Ngày Kết thúc.' });
      return;
    }
    if (new Date(assignStartDate) > new Date(assignEndDate)) {
      setAssignFeedback({ type: 'error', message: 'Ngày bắt đầu không được trễ hơn Ngày kết thúc.' });
      return;
    }

    const testConflicts: string[] = [];
    const newStart = new Date(assignStartDate);
    const newEnd = new Date(assignEndDate);

    const isOnlineNew = assignMethod === 'Online';

    sessions.forEach(existing => {
      const exStart = new Date(existing.startDate);
      const exEnd = new Date(existing.endDate);
      const datesOverlap = newStart <= exEnd && newEnd >= exStart;
      if (!datesOverlap) return;

      const timesOverlap = assignStartTime < existing.endTime && assignEndTime > existing.startTime;
      if (!timesOverlap) return;

      const matchedCourse = courses.find(c => c.id === existing.courseId);
      const code = matchedCourse ? matchedCourse.code : 'Lớp học';

      const isOnlineExisting = existing.method === 'Online';

      // 1. Classroom check: Only if both courses are Offline
      if (!isOnlineNew && !isOnlineExisting) {
        if (existing.classroom === assignClassroom) {
          testConflicts.push(`Phòng học "${assignClassroom}" đã có lịch đăng ký bởi lớp "${code}" từ ${formatDate(existing.startDate)} đến ${formatDate(existing.endDate)}`);
        }
      }

      // 2. Instructor check:
      if (existing.instructor === assignInstructor) {
        const isSameCourseName = selCourseId === existing.courseId || assignCourseCode === code || assignCourseName === (matchedCourse ? matchedCourse.title : '');
        const isOneOrBothOnline = isOnlineNew || isOnlineExisting;
        if (isSameCourseName && isOneOrBothOnline) {
          // Rule 2: If both Online & Offline share same name and instructor, ignore instructor conflict
        } else {
          // Rule 3: booked for a different course at same time is a conflict
          testConflicts.push(`Giảng viên "${assignInstructor.split(' (')[0]}" đã được phân bổ cho lớp "${code}" trong cùng khoảng thời gian.`);
        }
      }

      // 3. TA check: TA can be at any Online Courses at the same time without any conflicts.
      // So TA overlap conflicts only occur if BOTH courses are Offline.
      if (!isOnlineNew && !isOnlineExisting && assignTa && existing.taOfficer) {
        const newTas = assignTa.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
        const existingTas = existing.taOfficer.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
        
        let conflictingTaName = '';
        const hasOverlap = newTas.some(nt => {
          return existingTas.some(et => {
            const ntL = nt.toLowerCase();
            const etL = et.toLowerCase();
            if (ntL && etL && (ntL.includes(etL) || etL.includes(ntL))) {
              conflictingTaName = et;
              return true;
            }
            return false;
          });
        });

        if (hasOverlap) {
          testConflicts.push(`Trợ giảng đồng hành (TA) "${conflictingTaName}" không thể tham gia nhiều lớp Offline cùng lúc (Đã có lịch lớp "${code}").`);
        }
      }

      // 4. TG check: similar to TA, only conflicts if BOTH are Offline.
      if (!isOnlineNew && !isOnlineExisting && assignTg && existing.tgOfficer) {
        const newTgs = assignTg.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
        const existingTgs = existing.tgOfficer.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
        
        let conflictingTgName = '';
        const hasOverlap = newTgs.some(nt => {
          return existingTgs.some(et => {
            const ntL = nt.toLowerCase();
            const etL = et.toLowerCase();
            if (ntL && etL && (ntL.includes(etL) || etL.includes(ntL))) {
              conflictingTgName = et;
              return true;
            }
            return false;
          });
        });

        if (hasOverlap) {
          testConflicts.push(`Giám sát đào tạo (TG) "${conflictingTgName}" không thể tham gia nhiều lớp Offline cùng lúc (Đã có lịch lớp "${code}").`);
        }
      }
    });

    if (testConflicts.length > 0) {
      setAssignFeedback({ type: 'error', message: `Xung đột lịch học: ${testConflicts[0]}` });
      return;
    }

    const newSessionObject: CourseSession = {
      id: `s-custom-${Date.now()}`,
      courseId: selCourseId,
      startDate: assignStartDate,
      endDate: assignEndDate,
      startTime: assignStartTime,
      endTime: assignEndTime,
      instructor: assignInstructor,
      classroom: assignClassroom,
      maxCapacity: assignCapacity,
      enrolledIds: [],
      taOfficer: assignTa || undefined,
      tgOfficer: assignTg || undefined,
      method: assignMethod,
      notes: assignNote || undefined,
      domain: assignDomain,
    };

    if (onAddSession) {
      onAddSession(newSessionObject);
      setAssignFeedback({ 
        type: 'success', 
        message: `Lớp học cho khóa ${assignCourseCode} đã được phân lịch thành công cho Giảng viên ${assignInstructor.split(' (')[0]}` 
      });
      // Clear specific temporary fields
      setAssignTa('');
      setAssignTg('');
      setAssignNote('');
      setAssignMethod('Offline');
      // Auto close the course assignment window after completion
      setIsAssignmentModalOpen(false);
    } else {
      setAssignFeedback({ type: 'error', message: 'Không thể đăng lịch học: Trình điều phối onAddSession chưa được kết nối.' });
    }
  };

  const handlePrevMonth = () => {
    const currentIndex = MONTH_LIST.indexOf(monthVal);
    if (currentIndex !== -1) {
      let prevIndex = currentIndex - 1;
      let newYear = yearVal;
      if (prevIndex < 0) {
        prevIndex = 11;
        newYear = yearVal - 1;
      }
      setMonthVal(MONTH_LIST[prevIndex]);
      setYearVal(newYear);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = MONTH_LIST.indexOf(monthVal);
    if (currentIndex !== -1) {
      let nextIndex = currentIndex + 1;
      let newYear = yearVal;
      if (nextIndex > 11) {
        nextIndex = 0;
        newYear = yearVal + 1;
      }
      setMonthVal(MONTH_LIST[nextIndex]);
      setYearVal(newYear);
    }
  };

  // Dropdown states
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);

  // Dynamic current real-time today calculation
  const todayDateStr = `${realYear}-${String(realMonthIndex + 1).padStart(2, '0')}-${String(realDayNum).padStart(2, '0')}`;
  
  const isSelectedRealMonth = monthVal.toLowerCase() === realMonthName.toLowerCase() && yearVal === realYear;

  // Determine days in active month
  const isLeapYear = (yearVal % 4 === 0 && yearVal % 100 !== 0) || (yearVal % 400 === 0);
  const totalDays = ['January', 'March', 'May', 'July', 'August', 'October', 'December'].includes(monthVal)
    ? 31
    : monthVal === 'February'
    ? (isLeapYear ? 29 : 28)
    : 30;

  const displayedDays = Array.from({ length: totalDays }, (_, i) => i + 1);

  const getDayName = (dayNum: number) => {
    const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const startDay = MONTH_START_DAYS[monthVal] ?? 1;
    const dayIndex = (dayNum - 1 + startDay) % 7;
    return daysOfWeek[dayIndex];
  };

  const monthNum = MONTH_TO_NUM[monthVal] || '06';

  const startDayNum = 1;
  const endDayNum = totalDays;

  // Filter sessions that overlap with active month / day range
  const monthStartStr = `${yearVal}-${monthNum}-${String(startDayNum).padStart(2, '0')}`;
  const monthEndStr = `${yearVal}-${monthNum}-${String(endDayNum).padStart(2, '0')}`;

  const filteredSessions = sessions.filter(session => {
    return session.startDate <= monthEndStr && session.endDate >= monthStartStr;
  });

  // Real-time conflict checks for the currently-configured values
  const startD = assignStartDate ? new Date(assignStartDate) : null;
  const endD = assignEndDate ? new Date(assignEndDate) : null;
  const hasValidDates = startD && endD && !isNaN(startD.getTime()) && !isNaN(endD.getTime()) && startD <= endD;

  const activeConflicts: {
    type: 'Phòng học' | 'Giảng viên' | 'Trợ giảng/Giám sát';
    message: string;
    conflictingSession: CourseSession;
    courseCode: string;
    courseTitle: string;
  }[] = [];

  if (hasValidDates) {
    sessions.forEach(ex => {
      // Check date overlap
      const exStart = new Date(ex.startDate);
      const exEnd = new Date(ex.endDate);
      const datesOverlap = startD! <= exEnd && endD! >= exStart;
      if (!datesOverlap) return;

      // Check time overlap
      const timesOverlap = assignStartTime < ex.endTime && assignEndTime > ex.startTime;
      if (!timesOverlap) return;

      const matchedCourse = courses.find(c => c.id === ex.courseId);
      const courseCode = matchedCourse ? matchedCourse.code : 'Lớp học';
      const courseTitle = matchedCourse ? matchedCourse.title : 'Khóa thực hành';

      const isOnlineNew = assignMethod === 'Online';
      const isOnlineExisting = ex.method === 'Online';

      // 1. Classroom check: Only if both courses are Offline
      if (!isOnlineNew && !isOnlineExisting) {
        if (ex.classroom === assignClassroom) {
          activeConflicts.push({
            type: 'Phòng học',
            message: `Phòng học "${assignClassroom}" đã bị trùng lịch đặt trước.`,
            conflictingSession: ex,
            courseCode,
            courseTitle
          });
        }
      }

      // 2. Instructor check:
      if (ex.instructor === assignInstructor) {
        const isSameCourseName = selCourseId === ex.courseId || assignCourseCode === courseCode || assignCourseName === courseTitle;
        const isOneOrBothOnline = isOnlineNew || isOnlineExisting;
        if (isSameCourseName && isOneOrBothOnline) {
          // Rule 2: same name, same instructor and one is Online -> ignore
        } else {
          // Rule 3: booked for a different course at same time is a conflict
          activeConflicts.push({
            type: 'Giảng viên',
            message: `Giảng viên "${assignInstructor.split(' (')[0]}" bị trùng giờ lên lớp khác.`,
            conflictingSession: ex,
            courseCode,
            courseTitle
          });
        }
      }

      // 3. TA check: TA can be at any Online Courses at same time without conflicts. So only check if BOTH are Offline.
      if (!isOnlineNew && !isOnlineExisting && assignTa && ex.taOfficer) {
        const newTas = assignTa.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
        const existingTas = ex.taOfficer.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
        
        let conflictingTaName = '';
        const hasOverlap = newTas.some(nt => {
          return existingTas.some(et => {
            const ntL = nt.toLowerCase();
            const etL = et.toLowerCase();
            if (ntL && etL && (ntL.includes(etL) || etL.includes(ntL))) {
              conflictingTaName = et;
              return true;
            }
            return false;
          });
        });

        if (hasOverlap) {
          activeConflicts.push({
            type: 'Trợ giảng/Giám sát',
            message: `Nhiệm vụ TA: "${conflictingTaName}" đã được giao cho lớp "${courseCode}" trong khoảng thời gian này.`,
            conflictingSession: ex,
            courseCode,
            courseTitle
          });
        }
      }

      // 4. TG check: similar to TA, only conflicts if BOTH are Offline.
      if (!isOnlineNew && !isOnlineExisting && assignTg && ex.tgOfficer) {
        const newTgs = assignTg.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
        const existingTgs = ex.tgOfficer.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
        
        let conflictingTgName = '';
        const hasOverlap = newTgs.some(nt => {
          return existingTgs.some(et => {
            const ntL = nt.toLowerCase();
            const etL = et.toLowerCase();
            if (ntL && etL && (ntL.includes(etL) || etL.includes(ntL))) {
              conflictingTgName = et;
              return true;
            }
            return false;
          });
        });

        if (hasOverlap) {
          activeConflicts.push({
            type: 'Trợ giảng/Giám sát',
            message: `Nhiệm vụ TG: "${conflictingTgName}" đã được giao cho lớp "${courseCode}" trong khoảng thời gian này.`,
            conflictingSession: ex,
            courseCode,
            courseTitle
          });
        }
      }
    });
  }

  return (
    <div id="timeline-container" className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
      
      {/* Pop-up Window: Courses Assignment (Schedule Manager) */}
      {isAssignmentModalOpen && (
        <div 
          id="courses-assignment-modal-backdrop" 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200"
        >
          <div 
            id="courses-assignment-modal-card" 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="h-4.5 w-4.5 text-[#559b8c]" />
                  Điều phối & Lên lịch Đào tạo khóa học
                </h3>
              </div>
              <button
                id="close-assignment-modal-btn"
                type="button"
                onClick={() => {
                  setIsAssignmentModalOpen(false);
                  setAssignFeedback(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 cursor-pointer transition-colors"
                title="Đóng Cửa sổ"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content - Two Panel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden flex-1 divide-y lg:divide-y-0 lg:divide-x divide-slate-150">
              
              {/* Left Column: Form (7cols) */}
              <div className="lg:col-span-7 p-6 overflow-y-auto max-h-[calc(92vh-140px)] space-y-4">
                <form id="course-assignment-form" onSubmit={handlePublishAssignment} className="space-y-4">
                  {/* Course Selection block */}
                  <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-150 text-left">
                    <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Tên khóa học (Nội dung Đào tạo)
                    </label>
                    <select
                      id="assign-select-course-title"
                      value={selCourseId}
                      onChange={(e) => handleCourseSelectChange(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                    >
                      {courses.map(c => (
                        <option key={c.id} value={c.id} className="whitespace-normal py-1 pr-4">
                          {c.code} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Automatic Linked Properties Check Column */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Mã Khóa học
                      </label>
                      <input
                        id="assign-input-course-code"
                        type="text"
                        readOnly
                        value={assignCourseCode}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none cursor-not-allowed font-semibold text-slate-600 focus:ring-none font-mono"
                        title="Tự động liên kết với khóa đào tạo được chọn"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Lĩnh vực
                      </label>
                      <input
                        id="assign-input-domain"
                        type="text"
                        readOnly
                        value={assignDomain}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none cursor-not-allowed font-semibold text-slate-600 focus:ring-none"
                        title="Tự động xác định theo khóa học"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Hình thức học
                      </label>
                      <select
                        id="assign-select-method"
                        value={assignMethod}
                        onChange={(e) => setAssignMethod(e.target.value as 'Online' | 'Offline')}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                      >
                        <option value="Offline">Trực tiếp (Offline)</option>
                        <option value="Online">Trực tuyến (Online)</option>
                      </select>
                    </div>
                  </div>

                  {/* Date range from - to */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Từ ngày
                      </label>
                      <input
                        id="assign-input-start-date"
                        type="date"
                        required
                        value={assignStartDate}
                        onChange={(e) => setAssignStartDate(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#559b8c] font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Đến ngày
                      </label>
                      <input
                        id="assign-input-end-date"
                        type="date"
                        required
                        value={assignEndDate}
                        onChange={(e) => setAssignEndDate(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#559b8c] font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* TA (Teaching Assisstance) & TG (Teacher Assistance) Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="space-y-1 px-1">
                      <div className="flex justify-between items-center mb-0.5 flex-row">
                        <label className="block text-[10.5px] font-black text-slate-600 uppercase tracking-wider">
                          Trợ giảng Đồng hành (TA)
                        </label>
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">Tùy chọn nhiều</span>
                      </div>
                      <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-1.5 space-y-1 bg-white focus-within:ring-1 focus-within:ring-[#559b8c] focus-within:border-transparent">
                        {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => {
                          const list = assignTa.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
                          const isChecked = list.some(name => name.toLowerCase() === m.name.toLowerCase());
                          return (
                            <label key={m.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer select-none flex-row">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setAssignTa(list.filter(x => x.toLowerCase() !== m.name.toLowerCase()).join(', '));
                                  } else {
                                    setAssignTa([...list, m.name].join(', '));
                                  }
                                }}
                                className="rounded text-[#559b8c] focus:ring-[#559b8c] h-3.5 w-3.5"
                              />
                              <div className="text-xs text-slate-750 font-bold leading-none flex justify-between w-full flex-row">
                                <span>{m.name}</span>
                                <span className="text-[9.5px] text-slate-400 capitalize">{m.position || 'Thành viên'}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      <div className="text-[9px] text-slate-450 font-bold text-left">
                        Đã chọn: <span className="text-emerald-700 font-extrabold">{assignTa || 'Không có (Để trống)'}</span>
                      </div>
                    </div>

                    <div className="space-y-1 px-1">
                      <div className="flex justify-between items-center mb-0.5 flex-row">
                        <label className="block text-[10.5px] font-black text-slate-600 uppercase tracking-wider">
                          Giám sát Đào tạo (TG)
                        </label>
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">Tùy chọn nhiều</span>
                      </div>
                      <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-1.5 space-y-1 bg-white focus-within:ring-1 focus-within:ring-[#559b8c] focus-within:border-transparent">
                        {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => {
                          const list = assignTg.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
                          const isChecked = list.some(name => name.toLowerCase() === m.name.toLowerCase());
                          return (
                            <label key={m.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer select-none flex-row">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setAssignTg(list.filter(x => x.toLowerCase() !== m.name.toLowerCase()).join(', '));
                                  } else {
                                    setAssignTg([...list, m.name].join(', '));
                                  }
                                }}
                                className="rounded text-[#559b8c] focus:ring-[#559b8c] h-3.5 w-3.5"
                              />
                              <div className="text-xs text-slate-750 font-bold leading-none flex justify-between w-full flex-row">
                                <span>{m.name}</span>
                                <span className="text-[9.5px] text-slate-400 capitalize">{m.position || 'Thành viên'}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                      <div className="text-[9px] text-slate-450 font-bold text-left">
                        Đã chọn: <span className="text-amber-700 font-extrabold">{assignTg || 'Không có (Để trống)'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Instructor & Classroom Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1 text-left">
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Giảng viên / Hướng dẫn viên
                      </label>
                      <select
                        id="assign-select-instructor"
                        value={assignInstructor}
                        onChange={(e) => setAssignInstructor(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                      >
                        {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                          <option key={m.id} value={`${m.name} (${m.position || 'Giảng viên'})`}>
                            {m.name} ({m.position || 'Giảng viên'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Phòng học Chỉ định
                      </label>
                      <select
                        id="assign-select-classroom"
                        value={assignClassroom}
                        onChange={(e) => setAssignClassroom(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                      >
                        {CLASSROOMS.map(room => (
                          <option key={room.id} value={room.name}>
                            {room.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Duration Hours & Number of Learners */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Giờ Lên lớp (Từ - Đến)
                      </label>
                      <div className="flex items-center gap-1 flex-row">
                        <input
                          id="assign-input-start-time"
                          type="text"
                          required
                          value={assignStartTime}
                          onChange={(e) => setAssignStartTime(e.target.value)}
                          className="w-1/2 text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none text-center font-mono font-bold focus:ring-1 focus:ring-[#559b8c]"
                          placeholder="09:00"
                        />
                        <span className="text-slate-400 font-bold px-2 shrink-0">-</span>
                        <input
                          id="assign-input-end-time"
                          type="text"
                          required
                          value={assignEndTime}
                          onChange={(e) => setAssignEndTime(e.target.value)}
                          className="w-1/2 text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none text-center font-mono font-bold focus:ring-1 focus:ring-[#559b8c]"
                          placeholder="16:00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Giới hạn Sĩ số Lớp học
                      </label>
                      <input
                        id="assign-input-capacity"
                        type="number"
                        required
                        value={assignCapacity}
                        onChange={(e) => setAssignCapacity(parseInt(e.target.value) || 20)}
                        min={1}
                        max={100}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-bold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                        placeholder="Ví dụ: 25"
                      />
                    </div>
                  </div>

                  {/* Feedback Message */}
                  {assignFeedback && (
                    <div 
                      id="assign-form-feedback" 
                      className={`p-3 rounded-xl border flex items-start gap-2 text-xs font-semibold text-left flex-row ${
                        assignFeedback.type === 'success' 
                          ? 'bg-emerald-50 border-emerald-250 text-emerald-900' 
                          : 'bg-amber-50 border-amber-250 text-amber-950'
                      }`}
                    >
                      {assignFeedback.type === 'error' ? (
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-700 shrink-0 mt-0.5" />
                      ) : (
                        <Plus className="h-4.5 w-4.5 text-emerald-700 shrink-0 mt-0.5" />
                      )}
                      <span>{assignFeedback.message}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      id="publish-course-assignment-btn"
                      type="submit"
                      disabled={activeConflicts.length > 0}
                      className={`text-xs font-black min-w-[200px] leading-none px-4.5 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                        activeConflicts.length > 0
                          ? 'bg-slate-200 text-slate-450 border border-slate-300 cursor-not-allowed shadow-none'
                          : 'bg-[#559b8c] hover:bg-[#3f766a] text-white hover:shadow-lg cursor-pointer'
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      Xác nhận Phân lịch
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Conflict Check and Note Box (5cols) */}
              <div className="lg:col-span-5 p-6 bg-slate-50/60 overflow-y-auto max-h-[calc(92vh-140px)] flex flex-col space-y-6 text-left">
                
                {/* Conflict Check Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 flex-row">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                      Kiểm tra Xung đột Lịch
                    </h4>
                    <span id="active-conflict-count-badge" className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      activeConflicts.length > 0 
                        ? 'bg-rose-100 text-rose-800' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {activeConflicts.length} {activeConflicts.length === 1 ? 'Xung đột' : 'Xung đột'}
                    </span>
                  </div>

                  {activeConflicts.length > 0 ? (
                    <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                      {activeConflicts.map((c, idx) => (
                        <div 
                          key={idx} 
                          id={`conflict-warning-item-${idx}`}
                          className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5 leading-normal text-xs text-left"
                        >
                          <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-[10px] uppercase tracking-wide">
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 text-amber-800 font-black">
                              Trùng lịch {c.type}
                            </span>
                          </div>
                          
                          <p className="text-xs text-amber-955 font-bold leading-normal text-left">
                            {c.message}
                          </p>

                          <div className="text-[10px] text-slate-650 bg-white/70 p-2 rounded border border-slate-100 space-y-0.5 leading-normal font-medium text-left">
                            <div>
                              <span className="font-extrabold text-slate-500">Môn học:</span> "{c.courseTitle}"
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-500">Thời gian:</span> {formatDate(c.conflictingSession.startDate)} đến {formatDate(c.conflictingSession.endDate)}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-500">Khung giờ:</span> {c.conflictingSession.startTime} - {c.conflictingSession.endTime}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-500">Phòng học:</span> {c.conflictingSession.classroom}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-500">Giảng viên:</span> {c.conflictingSession.instructor.split(' (')[0]}
                            </div>
                            {c.conflictingSession.taOfficer && (
                              <div>
                                <span className="font-extrabold text-slate-500">TA:</span> {c.conflictingSession.taOfficer}
                              </div>
                            )}
                            {c.conflictingSession.tgOfficer && (
                              <div>
                                <span className="font-extrabold text-slate-500">TG:</span> {c.conflictingSession.tgOfficer}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div id="no-conflicts-status-card" className="bg-emerald-50 border border-emerald-150 rounded-xl p-4 text-center space-y-2 text-xs">
                      <div className="mx-auto h-9 w-9 rounded-full bg-emerald-100/80 flex items-center justify-center text-emerald-700">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-black text-emerald-900 uppercase tracking-wider">Không tìm thấy Xung đột</p>
                        <p className="text-[10px] text-emerald-700 font-medium leading-relaxed">
                          Sự phân bố Phòng học, Giảng viên và Nhân sự trợ giảng hoàn toàn hợp lệ trong khung thời gian học của lớp học này.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Note Box for the Task Giver */}
                <div className="space-y-2 pt-3 border-t border-slate-200">
                  <label htmlFor="assign-notes-textarea" className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    📋 Ghi chú Giảng dạy & Địa giới
                  </label>
                  <textarea
                    id="assign-notes-textarea"
                    rows={4}
                    value={assignNote}
                    onChange={(e) => setAssignNote(e.target.value)}
                    placeholder="Ví dụ: Trợ giảng TA cần chuẩn bị tài liệu giáo trình và trang thiết bị dây đai an toàn lên phòng học trước 8:30 sáng."
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-[#559b8c] font-semibold resize-none text-slate-800 leading-relaxed shadow-3xs"
                  />
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Header section with profile avatar or selectors */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4 text-left">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            Biểu đồ Lịch trình Đào tạo
          </h2>
          {hasAssignmentAccess && (
            <button
              id="open-courses-assignment-btn"
              type="button"
              onClick={() => {
                setIsAssignmentModalOpen(true);
                // Prefill course structures dynamically
                if (courses.length > 0) {
                  const first = courses.find(c => c.id === selCourseId) || courses[0];
                  setSelCourseId(first.id);
                  setAssignCourseCode(first.code);
                  setAssignCourseName(first.title);
                  if (first.domain) {
                    setAssignDomain(first.domain as CourseDomain);
                  }
                }
              }}
              className="inline-flex items-center gap-1.5 bg-[#559b8c] hover:bg-[#3f766a] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-3xs hover:shadow-2xs cursor-pointer transition-all active:scale-[0.98] select-none flex-row"
              title="Mở bảng phân bổ lịch học khóa đào tạo"
            >
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>Giao Lớp & Phân lịch học</span>
            </button>
          )}
        </div>

        {/* Integrated Selectors block: Year and Month selections */}
        <div className="flex flex-wrap items-center gap-2 select-none flex-row">
          {/* Year Selector Dropdown */}
          <div className="relative inline-block text-left">
            <button 
              type="button"
              onClick={() => {
                setIsYearOpen(!isYearOpen);
                setIsMonthOpen(false);
              }}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-705 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer transition-all outline-none whitespace-nowrap flex-row"
              title={`Năm đang xem: ${yearVal}`}
            >
              <span>Năm {yearVal}</span>
              <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isYearOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isYearOpen && (
              <>
                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsYearOpen(false)} />
                <div className="absolute right-0 lg:left-0 mt-1.5 w-32 rounded-xl bg-white border border-slate-200/95 shadow-xl z-50 overflow-hidden divide-y divide-slate-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  {YEAR_LIST.map(yr => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        setYearVal(yr);
                        setIsYearOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                        yearVal === yr 
                          ? 'bg-emerald-50 text-emerald-800 font-bold' 
                          : 'text-slate-700 hover:bg-slate-55'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Month Navigator with Prev/Next arrows */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden flex-row">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-805 transition-colors cursor-pointer outline-none border-r border-slate-200"
              title="Tháng trước"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>

            {/* Month Selector Dropdown */}
            <div className="relative inline-block text-left">
              <button 
                type="button"
                onClick={() => {
                  setIsMonthOpen(!isMonthOpen);
                  setIsYearOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-705 hover:bg-slate-55 cursor-pointer transition-all outline-none whitespace-nowrap flex-row"
                title={`Tháng đang xem: ${VI_MONTH_MAP[monthVal] || monthVal}`}
              >
                <span>{VI_MONTH_MAP[monthVal] || monthVal}</span>
                <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isMonthOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isMonthOpen && (
                <>
                  <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsMonthOpen(false)} />
                  <div className="absolute right-0 lg:left-0 mt-1.5 w-44 rounded-xl bg-white border border-slate-200/95 shadow-xl z-50 overflow-hidden divide-y divide-slate-50 py-1 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                    {MONTH_LIST.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setMonthVal(m);
                          setIsMonthOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                          monthVal === m 
                            ? 'bg-emerald-50 text-emerald-800 font-bold' 
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {VI_MONTH_MAP[m] || m}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-50 text-slate-505 hover:text-slate-800 transition-colors cursor-pointer outline-none border-l border-slate-200"
              title="Tháng tiếp theo"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* Grid Layout Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-3xs max-w-full text-left">
        <div className="w-full flex flex-col select-none">
          {/* Header Row: Days represent */}
          <div className="grid grid-cols-[150px_1fr] md:grid-cols-[185px_1fr] border-b border-slate-100 bg-slate-50/50">
            <div className="p-3 font-bold text-xs text-slate-500 uppercase tracking-widest flex items-center gap-1 border-r border-slate-100">
              <span>Đề mục chương trình / Phòng học</span>
            </div>
            <div className="grid animate-fade-in" style={{ gridTemplateColumns: `repeat(${displayedDays.length}, minmax(0, 1fr))` }}>
              {displayedDays.map(day => {
                const isToday = day === realDayNum && isSelectedRealMonth;
                const wknd = getDayName(day) === 'CN' || getDayName(day) === 'T7';
                return (
                  <div 
                    key={day} 
                    className={`p-1.5 text-center text-xs font-mono border-l border-slate-100/80 flex flex-col items-center justify-center relative min-h-[50px] ${
                      isToday 
                        ? 'bg-emerald-50/80 font-extrabold text-emerald-800 border-x-emerald-100/50' 
                        : 'text-slate-500'
                    } ${wknd ? 'bg-slate-50/30 text-slate-400' : ''}`}
                  >
                    <span className="text-[8px] uppercase font-sans font-semibold tracking-tighter truncate w-full">{getDayName(day)}</span>
                    <span className="text-[11px] font-black">{day}</span>
                    {isToday && (
                      <div className="absolute top-0 bottom-0 left-1/2 -ml-0.5 w-0.5 border-r border-dashed border-emerald-500 z-10 pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Sessions Grid Rows */}
          <div className="divide-y divide-slate-100">
            {filteredSessions.map(session => {
              const course = courses.find(c => c.id === session.courseId);
              if (!course) return null;

              const status = getSessionStatus(session.startDate, session.endDate, todayDateStr);
              const statusVn = status === 'ON-GOING' ? 'ĐANG DIỄN RA' : status === 'UP-COMING' ? 'SẮP DIỄN RA' : 'ĐÃ HOÀN THÀNH';

              // Styling values based on category
              const categoryColor: Record<string, { bg: string, border: string }> = {
                'Safety': { bg: 'bg-amber-100 text-amber-900 border-amber-300', border: 'border-l-4 border-amber-500 text-amber-850 font-semibold' },
                'Environment': { bg: 'bg-emerald-100 text-emerald-950 border-emerald-300', border: 'border-l-4 border-emerald-500 text-emerald-950 font-semibold' },
                'Emergency': { bg: 'bg-rose-100 text-rose-950 border-rose-300', border: 'border-l-4 border-rose-500 text-rose-950 font-semibold' },
                'Health': { bg: 'bg-teal-100 text-teal-950 border-teal-300', border: 'border-l-4 border-teal-500 text-teal-950 font-semibold' },
                'Compliance': { bg: 'bg-indigo-100 text-indigo-950 border-indigo-300', border: 'border-l-4 border-indigo-500 text-indigo-950 font-semibold' },
              };

              const style = categoryColor[course.category] || { bg: 'bg-slate-100 text-slate-900 border-slate-300', border: 'border-l-4 border-slate-500 text-slate-800' };

              // Determine indices of active days within displayedDays
              const activeIndices = displayedDays.map((day, idx) => {
                const targetDateStr = `${yearVal}-${monthNum}-${String(day).padStart(2, '0')}`;
                const isActive = targetDateStr >= session.startDate && targetDateStr <= session.endDate;
                return isActive ? idx : -1;
              }).filter(idx => idx !== -1);

              return (
                <div key={session.id} className="grid grid-cols-[150px_1fr] md:grid-cols-[185px_1fr] items-center hover:bg-slate-50/10 transition-colors text-left">
                  {/* Left Metadata Side */}
                  <div className="p-3 border-r border-slate-100 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap flex-row">
                      <span className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono select-all uppercase">
                        {course.code}
                      </span>
                      <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded font-mono uppercase ${
                        session.method === 'Online' 
                          ? 'bg-sky-100 text-sky-800' 
                          : 'bg-emerald-100 text-emerald-855'
                      }`}>
                        {session.method === 'Online' ? 'Trực tuyến' : 'Trực tiếp'}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 truncate" title={course.title}>
                      {course.title}
                    </h4>
                    <p className="text-[10px] text-slate-505 flex items-center gap-1 mt-0.5 font-medium flex-row">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{session.classroom}</span>
                    </p>
                  </div>

                  {/* Right Blocks (Representing duration dates) */}
                  <div className="grid relative h-14 animate-fade-in" style={{ gridTemplateColumns: `repeat(${displayedDays.length}, minmax(0, 1fr))` }}>
                    {/* Render current timeline line if visible */}
                    {isSelectedRealMonth && displayedDays.includes(realDayNum) && (
                      <div className="absolute top-0 bottom-0 pointer-events-none bg-emerald-500/80 w-0.5 z-10" style={{
                        left: `${((realDayNum - displayedDays[0] + 0.5) / displayedDays.length) * 100}%`
                      }} />
                    )}

                    {/* Timeline Block */}
                    {displayedDays.map((day, idx) => {
                      const isWithinRange = activeIndices.includes(idx);
                      const shouldRenderText = isWithinRange && (idx === activeIndices[0]);

                      if (isWithinRange && shouldRenderText) {
                        return (
                          <div
                            key={day}
                            onClick={() => setPopupCourseSession({ course, session })}
                            className={`absolute inset-y-1.5 rounded-lg border flex flex-col justify-center px-2 shadow-xs cursor-pointer select-none overflow-hidden transition-all hover:scale-[1.002] hover:brightness-95 hover:shadow-xs z-20 text-left ${style.bg} ${style.border}`}
                            style={{
                              left: `${(activeIndices[0] / displayedDays.length) * 100}%`,
                              width: `${(activeIndices.length / displayedDays.length) * 100}%`,
                            }}
                          >
                            <div className="flex items-center justify-between text-[11px] font-extrabold truncate flex-row">
                              <span className="truncate">{course.title}</span>
                              <span className={`text-[8px] font-bold px-1.5 py-0.1 rounded-full scale-90 whitespace-nowrap ${
                                status === 'ON-GOING' ? 'bg-emerald-600 text-white animate-pulse' : 
                                status === 'UP-COMING' ? 'bg-sky-600 text-white' : 'bg-slate-500 text-white'
                              }`}>
                                {statusVn}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-slate-705 font-bold truncate opacity-95 flex-row">
                              <span className="flex items-center gap-0.5 whitespace-nowrap flex-row">
                                <Clock className="h-2.5 w-2.5 shrink-0 text-slate-500" />
                                {session.startTime}-{session.endTime}
                              </span>
                              <span className="flex items-center gap-0.5 truncate flex-row">
                                <User className="h-2.5 w-2.5 shrink-0 text-slate-500" />
                                {session.instructor.split(' (')[0]}
                              </span>
                              <span className="bg-white/40 px-1 rounded-sm shrink-0 font-extrabold whitespace-nowrap">
                                {session.enrolledIds.length}/{session.maxCapacity} Học viên
                              </span>
                            </div>
                          </div>
                        );
                      }

                      const wknd = getDayName(day) === 'CN' || getDayName(day) === 'T7';
                      return (
                        <div 
                          key={day} 
                          className={`border-l border-slate-100 ${wknd ? 'bg-slate-50/10' : ''}`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {filteredSessions.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400 font-bold font-serif">
                Không tìm thấy chương trình huấn luyện hoặc phòng học nào hoạt động trong thời gian đã chọn.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pop-up Course Session Detail Modal */}
      {popupCourseSession && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-250 cursor-default"
          onClick={() => {
            setPopupCourseSession(null);
            setIsEditingSession(false);
          }}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide">
                  {isEditingSession ? "Chỉnh sửa Thông số Lịch học" : "Chi tiết Lịch trình Đào tạo"}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setPopupCourseSession(null);
                  setIsEditingSession(false);
                }}
                className="p-1 hover:bg-emerald-700 ease-in-out rounded-lg text-emerald-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-left">
              {isEditingSession ? (
                <div className="space-y-4 text-left">
                  {/* Course Info Display Only */}
                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Môn đào tạo</span>
                    <span className="text-xs font-black text-slate-900 block leading-tight">
                      {popupCourseSession.course.title}
                    </span>
                    <span className="text-[10px] font-bold text-slate-505 bg-white border border-slate-200/60 px-1.5 py-0.5 rounded inline-block font-mono mt-1">
                      Mã chuyên đề: {popupCourseSession.course.code}
                    </span>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-3.5 text-left">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Ngày bắt đầu</label>
                      <input 
                        type="date"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        className="w-full text-xs bg-slate-55 border border-slate-200 rounded-lg p-2 outline-none font-bold font-mono focus:ring-1 focus:ring-[#559b8c]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Ngày kết thúc</label>
                      <input 
                        type="date"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        className="w-full text-xs bg-slate-55 border border-slate-200 rounded-lg p-2 outline-none font-bold font-mono focus:ring-1 focus:ring-[#559b8c]"
                      />
                    </div>
                  </div>

                  {/* Timing Selection */}
                  <div className="grid grid-cols-2 gap-3.5 text-left">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Giờ bắt đầu</label>
                      <input 
                        type="text"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        placeholder="09:00"
                        className="w-full text-xs bg-slate-55 border border-slate-200 rounded-lg p-2.5 outline-none font-bold font-mono text-center focus:ring-1 focus:ring-[#559b8c]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Giờ kết thúc</label>
                      <input 
                        type="text"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        placeholder="16:00"
                        className="w-full text-xs bg-slate-55 border border-slate-200 rounded-lg p-2.5 outline-none font-bold font-mono text-center focus:ring-1 focus:ring-[#559b8c]"
                      />
                    </div>
                  </div>

                  {/* Instructor & Classroom */}
                  <div className="grid grid-cols-2 gap-3.5 text-left font-sans">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Giảng viên</label>
                      <select 
                        value={editInstructor}
                        onChange={(e) => setEditInstructor(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-bold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                      >
                        {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                          <option key={m.id} value={`${m.name} (${m.position || 'Giảng viên'})`}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Phòng Đào tạo</label>
                      <select 
                        value={editClassroom}
                        onChange={(e) => setEditClassroom(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-bold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                      >
                        {CLASSROOMS.map(room => (
                          <option key={room.id} value={room.name}>
                            {room.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Mode / Method Selection */}
                  <div className="text-left font-sans">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Phương thức Đào tạo</label>
                    <select 
                      value={editMethod}
                      onChange={(e) => setEditMethod(e.target.value as 'Online' | 'Offline')}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-bold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                    >
                      <option value="Offline">Học Trực tiếp (Offline)</option>
                      <option value="Online">Học Trực tuyến (Online)</option>
                    </select>
                  </div>

                  {/* TG and TA officers assigned */}
                  <div className="grid grid-cols-2 gap-3.5 text-left font-sans">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Giám sát Đào tạo (TG)</label>
                      <input 
                        type="text"
                        value={editTgOfficer}
                        onChange={(e) => setEditTgOfficer(e.target.value)}
                        placeholder="Chưa chỉ định"
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Trợ giảng Đồng hành (TA)</label>
                      <input 
                        type="text"
                        value={editTaOfficer}
                        onChange={(e) => setEditTaOfficer(e.target.value)}
                        placeholder="Chưa chỉ định"
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                      />
                    </div>
                  </div>

                  {/* Capacity / Number of Learners */}
                  <div className="text-left font-sans">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Sĩ số tối đa lớp học</label>
                    <input 
                      type="number"
                      value={editMaxCapacity}
                      onChange={(e) => setEditMaxCapacity(parseInt(e.target.value) || 20)}
                      min={1}
                      max={100}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-bold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-left space-y-4 animate-fade-in font-sans">
                  {/* Course Name */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Môn huấn luyện</span>
                    <span id="popup-course-name" className="text-sm font-black text-slate-800 block leading-tight font-serif">
                      {popupCourseSession.course.title}
                    </span>
                  </div>

                  {/* Course ID (Removed Reference GUID block) */}
                  <div className="pt-1">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mã môn đào tạo</span>
                      <span id="popup-course-id" className="text-xs font-bold text-slate-705 bg-slate-100 px-2 py-0.5 rounded-md inline-block font-mono">
                        {popupCourseSession.course.code}
                      </span>
                    </div>
                  </div>

                  {/* Time and Date */}
                  <div className="border-t border-b border-slate-50 py-3 space-y-2">
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-750 flex-row">
                      <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Thời gian Khóa học</span>
                        <span id="popup-course-date">
                          {formatDate(popupCourseSession.session.startDate)} đến {formatDate(popupCourseSession.session.endDate)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-755 flex-row">
                      <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Giờ Lên lớp dự kiến</span>
                        <span id="popup-course-time">
                          {popupCourseSession.session.startTime} - {popupCourseSession.session.endTime}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Instructor and Method */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Giảng viên phụ trách</span>
                      <span id="popup-course-instructor" className="text-xs font-black text-slate-750 block truncate" title={popupCourseSession.session.instructor}>
                        {popupCourseSession.session.instructor.split(' (')[0]}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hình thức học</span>
                      <span id="popup-course-method" className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md inline-block font-mono">
                        {popupCourseSession.session.method === 'Online' ? 'Trực tuyến (Online)' : 'Trực tiếp (Offline)'}
                      </span>
                    </div>
                  </div>

                  {/* Classroom Details */}
                  <div className="space-y-0.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Địa điểm & Phòng học</span>
                    <span className="text-xs font-bold text-slate-800">
                      {popupCourseSession.session.classroom}
                    </span>
                  </div>

                  {/* TG and TA */}
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Giám sát Đào tạo (TG)</span>
                      <span id="popup-course-tg" className="text-xs font-semibold text-slate-750 block truncate" title={popupCourseSession.session.tgOfficer || 'Chưa phân công'}>
                        {popupCourseSession.session.tgOfficer || 'Chưa phân công'}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trợ giảng đồng hành (TA)</span>
                      <span id="popup-course-ta" className="text-xs font-semibold text-slate-755 block truncate" title={popupCourseSession.session.taOfficer || 'Chưa phân công'}>
                        {popupCourseSession.session.taOfficer || 'Chưa phân công'}
                      </span>
                    </div>
                  </div>

                  {/* Number of Learners (replaces Estimate quantity of learners) */}
                  <div className="border-t border-slate-50 pt-3">
                    <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center flex-row">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">Giới hạn Sức chứa lớp</span>
                      </div>
                      <div className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-2.5 py-1 rounded-lg whitespace-nowrap">
                        {popupCourseSession.session.maxCapacity} Học viên
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer (Conditional Access for Level 3 / Level 4) */}
            <div className="bg-slate-55 px-5 py-3.5 flex items-center justify-between gap-3 border-t border-slate-100 flex-row">
              {hasAssignmentAccess ? (
                <div className="flex items-center justify-between w-full flex-row">
                  <div className="flex gap-2 flex-row">
                    <button
                      type="button"
                      onClick={handleDeleteSession}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 border border-rose-100 flex-row"
                      title="Gỡ bỏ lịch trình ra khỏi phân bổ an toàn"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Gỡ lịch
                    </button>
                    {!isEditingSession && (
                      <button
                        type="button"
                        onClick={handleStartEditingSession}
                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 border border-emerald-100 flex-row"
                        title="Thay đổi tham số lịch học"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        Chỉnh sửa
                      </button>
                    )}
                  </div>
                  {isEditingSession ? (
                    <div className="flex gap-2 flex-row">
                      <button
                        type="button"
                        onClick={handleCancelEditingSession}
                        className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSessionUpdates}
                        className="px-4 py-2 bg-[#559b8c] hover:bg-[#3f766a] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-3xs"
                      >
                        Lưu thông số
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPopupCourseSession(null)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-750 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Đóng Chi tiết
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex justify-end w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setPopupCourseSession(null);
                      setIsEditingSession(false);
                    }}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-755 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Đóng Chi tiết
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Course Session Delete Confirmation Modal */}
      <AnimatePresence>
        {sessionToDelete && (
          <div id="modal-delete-session-window" className="fixed inset-0 z-[60] overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSessionToDelete(null)}
              className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden w-full max-w-sm relative z-50 text-left scale-100"
            >
              <div className="p-5 space-y-4 text-left">
                <div className="flex gap-3 items-start text-left flex-row">
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-605 shrink-0 animate-bounce">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5 text-left">
                    <h3 className="text-xs font-extrabold text-slate-950 uppercase tracking-wider font-mono">Xác nhận Tháo dỡ Lịch</h3>
                    <p className="text-[11px] text-slate-550 leading-relaxed font-semibold">
                      Bạn có chắc chắn muốn xóa vĩnh viễn lịch học đào tạo này từ ngày <span className="font-extrabold text-slate-800">{formatDate(sessionToDelete.startDate)}</span> đến ngày <span className="font-extrabold text-slate-800">{formatDate(sessionToDelete.endDate)}</span> không?
                    </p>
                    <p className="text-[10px] text-rose-600 bg-rose-50/55 border border-rose-100 p-2 rounded-lg font-semibold leading-tight">
                      Hành động này là hoàn toàn không thể thu hồi và sẽ chấm dứt đăng ký của học viên.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 flex-row">
                  <button
                    type="button"
                    onClick={() => setSessionToDelete(null)}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-850 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all cursor-pointer font-sans"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onRemoveSession) {
                        onRemoveSession(sessionToDelete.id);
                      }
                      setSessionToDelete(null);
                      setPopupCourseSession(null);
                      setIsEditingSession(false);
                    }}
                    className="px-5 py-2 text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 font-sans border-none shadow-md"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Xác nhận Xóa</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
