/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, MapPin, Clock, User, Calendar, SlidersHorizontal, Plus, X, AlertTriangle, Trash2, Settings, ShieldAlert } from 'lucide-react';
import { Course, CourseSession, Member } from '../types';
import { getSessionStatus, CLASSROOMS, INSTRUCTORS } from '../data';
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

const YEAR_LIST = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export default function TimelineView({ 
  courses, 
  sessions, 
  onSelectCourse,
  onAddSession,
  onRemoveSession,
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

  // Courses Assignment (Schedule Manager Component) state and form values
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState<boolean>(false);
  const [selCourseId, setSelCourseId] = useState<string>(courses[0]?.id || '');
  const [assignCourseCode, setAssignCourseCode] = useState<string>(courses[0]?.code || '');
  const [assignCourseName, setAssignCourseName] = useState<string>(courses[0]?.title || '');
  const [assignStartDate, setAssignStartDate] = useState<string>('2026-06-10');
  const [assignEndDate, setAssignEndDate] = useState<string>('2026-06-12');
  const [assignTa, setAssignTa] = useState<string>('');
  const [assignInstructor, setAssignInstructor] = useState<string>(() => {
    const foundInst = members?.find(m => m.position?.toLowerCase().includes('instructor'));
    if (foundInst) {
      return `${foundInst.name} (${foundInst.position || 'Instructor'})`;
    }
    const defaultInst = members?.[1] || members?.[0];
    if (defaultInst) {
      return `${defaultInst.name} (${defaultInst.position || 'Member'})`;
    }
    return '';
  });
  const [assignClassroom, setAssignClassroom] = useState<string>(CLASSROOMS[0]?.name || '');
  const [assignStartTime, setAssignStartTime] = useState<string>('09:00');
  const [assignEndTime, setAssignEndTime] = useState<string>('16:00');
  const [assignCapacity, setAssignCapacity] = useState<number>(25);
  const [assignNote, setAssignNote] = useState<string>('');
  const [assignFeedback, setAssignFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleCourseSelectChange = (courseIdVal: string) => {
    setSelCourseId(courseIdVal);
    const selected = courses.find(c => c.id === courseIdVal);
    if (selected) {
      setAssignCourseCode(selected.code);
      setAssignCourseName(selected.title);
    }
  };

  const handlePublishAssignment = (e: FormEvent) => {
    e.preventDefault();
    setAssignFeedback(null);

    if (!selCourseId) {
      setAssignFeedback({ type: 'error', message: 'Please select a course to proceed.' });
      return;
    }
    if (!assignStartDate || !assignEndDate) {
      setAssignFeedback({ type: 'error', message: 'Both start and end dates are required for assignment.' });
      return;
    }
    if (new Date(assignStartDate) > new Date(assignEndDate)) {
      setAssignFeedback({ type: 'error', message: 'Start date cannot be later than end date.' });
      return;
    }

    const testConflicts: string[] = [];
    const newStart = new Date(assignStartDate);
    const newEnd = new Date(assignEndDate);

    sessions.forEach(existing => {
      const exStart = new Date(existing.startDate);
      const exEnd = new Date(existing.endDate);
      const datesOverlap = newStart <= exEnd && newEnd >= exStart;
      if (!datesOverlap) return;

      const timesOverlap = assignStartTime < existing.endTime && assignEndTime > existing.startTime;
      if (!timesOverlap) return;

      const matchedCourse = courses.find(c => c.id === existing.courseId);
      const code = matchedCourse ? matchedCourse.code : 'Session';

      if (existing.classroom === assignClassroom) {
        testConflicts.push(`Classroom "${assignClassroom}" is already booked by "${code}" during ${formatDate(existing.startDate)} to ${formatDate(existing.endDate)}`);
      }
      if (existing.instructor === assignInstructor) {
        testConflicts.push(`Instructor "${assignInstructor.split(' (')[0]}" is scheduled for "${code}" on those same dates.`);
      }
      if (assignTa && existing.taOfficer) {
        const normNewTa = assignTa.trim().toLowerCase();
        const normExTa = existing.taOfficer.trim().toLowerCase();
        if (normNewTa && normExTa && (normNewTa.includes(normExTa) || normExTa.includes(normNewTa))) {
          testConflicts.push(`TA/TG "${existing.taOfficer}" is conflicts with "${code}" on those same dates.`);
        }
      }
    });

    if (testConflicts.length > 0) {
      setAssignFeedback({ type: 'error', message: `Collision Identified: ${testConflicts[0]}` });
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
      notes: assignNote || undefined
    };

    if (onAddSession) {
      onAddSession(newSessionObject);
      setAssignFeedback({ 
        type: 'success', 
        message: `Course ${assignCourseCode} has been successfully scheduled under instructor ${assignInstructor.split(' (')[0]}` 
      });
      // Clear specific temporary fields
      setAssignTa('');
      setAssignNote('');
      // Auto close the course assignment window after completion
      setIsAssignmentModalOpen(false);
    } else {
      setAssignFeedback({ type: 'error', message: 'Unable to publish: onAddSession scheduler handler is not connected.' });
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

  const monthDaysList = getDaysForMonth(monthVal, yearVal);

  const displayedDays = Array.from({ length: totalDays }, (_, i) => i + 1);

  const getDayName = (dayNum: number) => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
    type: 'Classroom' | 'Instructor' | 'TA/TG';
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
      const courseCode = matchedCourse ? matchedCourse.code : 'Session';
      const courseTitle = matchedCourse ? matchedCourse.title : 'External Cohort';

      // 1. classroom check
      if (ex.classroom === assignClassroom) {
        activeConflicts.push({
          type: 'Classroom',
          message: `Classroom "${assignClassroom}" is simultaneously booked.`,
          conflictingSession: ex,
          courseCode,
          courseTitle
        });
      }

      // 2. instructor check
      if (ex.instructor === assignInstructor) {
        activeConflicts.push({
          type: 'Instructor',
          message: `Trainer "${assignInstructor.split(' (')[0]}" has overlapping duty.`,
          conflictingSession: ex,
          courseCode,
          courseTitle
        });
      }

      // 3. TA/TG check (only check if assignTa is input)
      if (assignTa && ex.taOfficer) {
        const normNewTa = assignTa.trim().toLowerCase();
        const normExTa = ex.taOfficer.trim().toLowerCase();
        if (normNewTa && normExTa && (normNewTa.includes(normExTa) || normExTa.includes(normNewTa))) {
          activeConflicts.push({
            type: 'TA/TG',
            message: `TA/TG "${ex.taOfficer}" is already assigned here.`,
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
                  Courses Assignment & Scheduling
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
                title="Close Window"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content - Two Panel Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden flex-1 divide-y lg:divide-y-0 lg:divide-x divide-slate-150">
              
              {/* Left Column: Form (7cols) */}
              <div className="lg:col-span-7 p-6 overflow-y-auto max-h-[calc(92vh-140px)] space-y-4">
                <form id="course-assignment-form" onSubmit={handlePublishAssignment} className="space-y-4">
                  {/* Course Name and Course ID Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Course Name
                      </label>
                      <select
                        id="assign-select-course-title"
                        value={selCourseId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelCourseId(val);
                          const selected = courses.find(c => c.id === val);
                          if (selected) {
                            setAssignCourseCode(selected.code);
                            setAssignCourseName(selected.title);
                          }
                        }}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                      >
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Course ID
                      </label>
                      <input
                        id="assign-input-course-code"
                        type="text"
                        readOnly
                        value={assignCourseCode}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none cursor-not-allowed font-semibold text-slate-600 focus:ring-none"
                        title="Linked automatically to selected course"
                      />
                    </div>
                  </div>

                  {/* Date range from - to */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        From
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
                        To
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

                  {/* Teacher Assistance (TA/TG) & Instructor Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Teacher Assistance (TA / TG)
                      </label>
                      <select
                        id="assign-select-ta-field"
                        value={assignTa}
                        onChange={(e) => setAssignTa(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-[#559b8c] font-semibold text-slate-800"
                      >
                        <option value="">None Assigned</option>
                        {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                          <option key={m.id} value={m.name}>
                            {m.name} ({m.position || 'Member'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Instructor / Trainer
                      </label>
                      <select
                        id="assign-select-instructor"
                        value={assignInstructor}
                        onChange={(e) => setAssignInstructor(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                      >
                        {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                          <option key={m.id} value={`${m.name} (${m.position || 'Instructor'})`}>
                            {m.name} ({m.position || 'Instructor'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Classroom and Duration specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Classroom
                      </label>
                      <select
                        id="assign-select-classroom"
                        value={assignClassroom}
                        onChange={(e) => setAssignClassroom(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-medium focus:ring-1 focus:ring-[#559b8c]"
                      >
                        {CLASSROOMS.map(room => (
                          <option key={room.id} value={room.name}>
                            {room.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Duration Hours (Time)
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          id="assign-input-start-time"
                          type="text"
                          required
                          value={assignStartTime}
                          onChange={(e) => setAssignStartTime(e.target.value)}
                          className="w-1/2 text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none text-center font-mono"
                          placeholder="09:00"
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <input
                          id="assign-input-end-time"
                          type="text"
                          required
                          value={assignEndTime}
                          onChange={(e) => setAssignEndTime(e.target.value)}
                          className="w-1/2 text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none text-center font-mono"
                          placeholder="16:00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Feedback Message */}
                  {assignFeedback && (
                    <div 
                      id="assign-form-feedback" 
                      className={`p-3 rounded-xl border flex items-start gap-2 text-xs font-semibold ${
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
                      Assign
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Conflict Check and Note Box (5cols) */}
              <div className="lg:col-span-5 p-6 bg-slate-50/60 overflow-y-auto max-h-[calc(92vh-140px)] flex flex-col space-y-6">
                
                {/* Conflict Check Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                      Conflict Check
                    </h4>
                    <span id="active-conflict-count-badge" className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      activeConflicts.length > 0 
                        ? 'bg-rose-100 text-rose-800' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {activeConflicts.length} {activeConflicts.length === 1 ? 'Conflict' : 'Conflicts'}
                    </span>
                  </div>

                  {activeConflicts.length > 0 ? (
                    <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                      {activeConflicts.map((c, idx) => (
                        <div 
                          key={idx} 
                          id={`conflict-warning-item-${idx}`}
                          className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5 leading-normal text-xs"
                        >
                          <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-[10px] uppercase tracking-wide">
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 text-amber-800 font-black">
                              {c.type} Conflict
                            </span>
                          </div>
                          
                          <p className="text-xs text-amber-950 font-bold leading-normal">
                            {c.message}
                          </p>

                          <div className="text-[10px] text-slate-650 bg-white/70 p-2 rounded border border-slate-100 space-y-0.5 leading-normal font-medium">
                            <div>
                              <span className="font-extrabold text-slate-500">Course:</span> "{c.courseTitle}"
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-500">Dates:</span> {formatDate(c.conflictingSession.startDate)} to {formatDate(c.conflictingSession.endDate)}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-500">Hours:</span> {c.conflictingSession.startTime} - {c.conflictingSession.endTime}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-500">Room:</span> {c.conflictingSession.classroom}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-500">Instructor:</span> {c.conflictingSession.instructor.split(' (')[0]}
                            </div>
                            {c.conflictingSession.taOfficer && (
                              <div>
                                <span className="font-extrabold text-slate-500">TA/TG:</span> {c.conflictingSession.taOfficer}
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
                        <p className="text-[11px] font-black text-emerald-900 uppercase tracking-wider">No Conflicts Detected</p>
                        <p className="text-[10px] text-emerald-700 font-medium leading-relaxed">
                          Classroom, Instructor, and TA allocations are completely clear on these scheduled slot dates.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Note Box for the Task Giver */}
                <div className="space-y-2 pt-3 border-t border-slate-200">
                  <label htmlFor="assign-notes-textarea" className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    ✍️ Note
                  </label>
                  <textarea
                    id="assign-notes-textarea"
                    rows={4}
                    value={assignNote}
                    onChange={(e) => setAssignNote(e.target.value)}
                    placeholder="e.g. TA must ensure training materials & safety harnesses are delivered to Classroom before 08:30 AM."
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-[#559b8c] font-semibold resize-none text-slate-800 leading-relaxed shadow-3xs"
                  />
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Header section with profile avatar or selectors */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Courses Timetable
          </h2>
          {hasAssignmentAccess && (
            <button
              id="open-courses-assignment-btn"
              type="button"
              onClick={() => {
                setIsAssignmentModalOpen(true);
                // Prefill course structures dynamically
                if (courses.length > 0 && !selCourseId) {
                  const first = courses[0];
                  setSelCourseId(first.id);
                  setAssignCourseCode(first.code);
                  setAssignCourseName(first.title);
                }
              }}
              className="inline-flex items-center gap-1.5 bg-[#559b8c] hover:bg-[#3f766a] text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-3xs hover:shadow-2xs cursor-pointer transition-all active:scale-[0.98] select-none"
              title="Open Schedule Manager & Courses Assignment Panel"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Courses Assignment</span>
            </button>
          )}
        </div>

        {/* Integrated Selectors block: Year and Month selections */}
        <div className="flex flex-wrap items-center gap-2 select-none">
          {/* Year Selector Dropdown */}
          <div className="relative inline-block text-left">
            <button 
              type="button"
              onClick={() => {
                setIsYearOpen(!isYearOpen);
                setIsMonthOpen(false);
              }}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-705 shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer transition-all outline-none whitespace-nowrap"
              title={`Active Year: ${yearVal}`}
            >
              <span>{yearVal}</span>
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

          {/* Month Navigator with Prev/Next arrows */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer outline-none border-r border-slate-200"
              title="Previous Month"
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-705 hover:bg-slate-55 cursor-pointer transition-all outline-none whitespace-nowrap"
                title={`Active Month: ${monthVal}`}
              >
                <span>{monthVal}</span>
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
                        {m}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer outline-none border-l border-slate-200"
              title="Next Month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

        </div>
      </div>

      {/* Grid Layout Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-3xs max-w-full">
        <div className="w-full flex flex-col select-none">
          {/* Header Row: Days represent */}
          <div className="grid grid-cols-[150px_1fr] md:grid-cols-[185px_1fr] border-b border-slate-100 bg-slate-50/50">
            <div className="p-3 font-bold text-xs text-slate-500 uppercase tracking-widest flex items-center gap-1 border-r border-slate-100">
              <span>Course / Place</span>
            </div>
            <div className="grid animate-fade-in" style={{ gridTemplateColumns: `repeat(${displayedDays.length}, minmax(0, 1fr))` }}>
              {displayedDays.map(day => {
                const isToday = day === realDayNum && isSelectedRealMonth;
                const wknd = getDayName(day) === 'Sat' || getDayName(day) === 'Sun';
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
                <div key={session.id} className="grid grid-cols-[150px_1fr] md:grid-cols-[185px_1fr] items-center hover:bg-slate-50/10 transition-colors">
                  {/* Left Metadata Side */}
                  <div className="p-3 border-r border-slate-100 min-w-0">
                    <span className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono mb-1 select-all uppercase">
                      {course.code}
                    </span>
                    <h4 className="text-xs font-black text-slate-900 truncate" title={course.title}>
                      {course.title}
                    </h4>
                    <p className="text-[10px] text-slate-505 flex items-center gap-1 mt-0.5 font-medium">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{session.classroom.replace(' (Room 101)', '').replace(' Room 102', '')}</span>
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
                            onClick={() => onSelectCourse(course, session)}
                            className={`absolute inset-y-1.5 rounded-lg border flex flex-col justify-center px-2 shadow-xs cursor-pointer select-none overflow-hidden transition-all hover:scale-[1.002] hover:brightness-95 hover:shadow-xs z-20 ${style.bg} ${style.border}`}
                            style={{
                              left: `${(activeIndices[0] / displayedDays.length) * 100}%`,
                              width: `${(activeIndices.length / displayedDays.length) * 100}%`,
                            }}
                          >
                            <div className="flex items-center justify-between text-[11px] font-extrabold truncate">
                              <span className="truncate">{course.title}</span>
                              <span className={`text-[8px] font-bold px-1 py-0.1 rounded-full scale-90 ${
                                status === 'ON-GOING' ? 'bg-emerald-600 text-white animate-pulse' : 
                                status === 'UP-COMING' ? 'bg-sky-600 text-white' : 'bg-slate-500 text-white'
                              }`}>
                                {status}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-slate-700 font-bold truncate opacity-95">
                              <span className="flex items-center gap-0.5 whitespace-nowrap">
                                <Clock className="h-2.5 w-2.5 shrink-0" />
                                {session.startTime}-{session.endTime}
                              </span>
                              <span className="flex items-center gap-0.5 truncate">
                                <User className="h-2.5 w-2.5 shrink-0 text-slate-500" />
                                {session.instructor.split(' (')[0]}
                              </span>
                              <span className="bg-white/40 px-1 rounded-sm shrink-0 font-extrabold">
                                {session.enrolledIds.length}/{session.maxCapacity} Seats
                              </span>
                            </div>
                          </div>
                        );
                      }

                      const wknd = getDayName(day) === 'Sat' || getDayName(day) === 'Sun';
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
              <div className="py-12 text-center text-xs text-slate-400 font-bold">
                No active training schedules or classrooms matching the selected range.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
