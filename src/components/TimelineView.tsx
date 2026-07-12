/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, FormEvent, Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronLeft, ChevronRight, MapPin, Clock, User, Calendar, SlidersHorizontal, Plus, X, AlertTriangle, Trash2, Settings, ShieldAlert, AlertCircle } from 'lucide-react';
import { Course, CourseSession, Member, CourseDomain, Classroom } from '../types';
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
  onClearAllSessions?: () => void;
  currentUserEmail: string;
  members: Member[];
  classrooms?: Classroom[];
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

const calculateEndDate = (startDateStr: string, duration: number): string => {
  if (!startDateStr || !duration) return startDateStr;
  const date = new Date(startDateStr);
  if (isNaN(date.getTime())) return startDateStr;
  date.setDate(date.getDate() + duration - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function TimelineView({ 
  courses, 
  sessions, 
  onSelectCourse,
  onAddSession,
  onRemoveSession,
  onUpdateSession,
  onClearAllSessions,
  currentUserEmail,
  members,
  classrooms = []
}: TimelineViewProps) {
  const activeClassrooms = classrooms.length > 0 ? classrooms : CLASSROOMS;
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

  // States & helper calculations for Weekly Personnel Tracking Grid
  const [trackingBaseDate, setTrackingBaseDate] = useState<Date>(() => new Date());

  const sortedTrackingMembers = useMemo(() => {
    return members.filter(m => {
      const isCreator = m.id === 'mem-creator' || 
                        m.email.toLowerCase() === 'setcadmin' || 
                        m.email.toLowerCase() === 'setcadmin@safetycentre.org';
      return !isCreator;
    }).sort((a, b) => {
      const getPositionPriority = (pos: string = ''): number => {
        const norm = pos.trim().toLowerCase();
        
        // Các nhân sự thuộc trực ban và hành chính sẽ hiển thị ở cuối cùng của bảng
        const isTrucBan = norm.includes('trực ban');
        const isHanhChinh = norm.includes('hành chính');
        
        if (isTrucBan) return 90;
        if (isHanhChinh) return 91;

        if (norm === 'quản lý') return 1;
        if (norm === 'phó quản lý') return 2;
        if (norm === 'trưởng bãi cháy' || norm.includes('bãi cháy')) return 3;
        if (norm === 'trưởng đào tạo' || norm.includes('đào tạo')) return 4;
        if (norm === 'giảng viên') return 5;
        if (norm === 'nhân viên bảo trì' || norm.includes('bảo trì')) return 6;
        if (norm === 'nhân viên hỗ trợ' || norm.includes('hỗ trợ')) return 7;
        
        return 50; // các vị trí khác
      };

      const prioA = getPositionPriority(a.position);
      const prioB = getPositionPriority(b.position);

      if (prioA !== prioB) {
        return prioA - prioB;
      }

      // Sắp xếp theo năm sinh từ thấp xuống cao (ascending year, oldest first)
      const yearA = parseInt(a.dob?.substring(0, 4)) || 9999;
      const yearB = parseInt(b.dob?.substring(0, 4)) || 9999;
      if (yearA !== yearB) {
        return yearA - yearB;
      }

      return a.name.localeCompare(b.name, 'vi');
    });
  }, [members]);

  const trackingDays = useMemo(() => {
    const dateCopy = new Date(trackingBaseDate);
    const day = dateCopy.getDay();
    const diff = dateCopy.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(dateCopy.setDate(diff));
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [trackingBaseDate]);

  const trackingWeekRangeLabel = useMemo(() => {
    if (trackingDays.length === 0) return '';
    const first = trackingDays[0];
    const last = trackingDays[6];
    
    const formatD = (d: Date) => {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    return `Tuần từ ${formatD(first)} đến ${formatD(last)}`;
  }, [trackingDays]);

  const getLocalDateString = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const calculateTeachingPeriods = (member: Member, dateStr: string): number => {
    let totalMorningPeriods = 0;
    let totalAfternoonPeriods = 0;

    sessions.forEach(session => {
      const course = courses.find(c => c.id === session.courseId);
      if (!course) return;

      const isDateInSessionRange = dateStr >= session.startDate && dateStr <= session.endDate;
      if (!isDateInSessionRange) return;

      let subModuleFound = false;
      let subModuleInstructor: string | null = null;
      let subModuleStartTime = session.startTime;
      let subModuleEndTime = session.endTime;

      if (session.subModules) {
        Object.keys(session.subModules).forEach(key => {
          const val = session.subModules?.[key];
          if (val && typeof val === 'object') {
            if (val.date === dateStr) {
              subModuleFound = true;
              subModuleInstructor = val.instructor;
              if (val.startTime) subModuleStartTime = val.startTime;
              if (val.endTime) subModuleEndTime = val.endTime;
            }
          }
        });
      }

      let isGv = false;
      if (subModuleFound) {
        if (subModuleInstructor && subModuleInstructor.trim().toLowerCase() === member.name.trim().toLowerCase()) {
          isGv = true;
        }
      } else {
        if (session.instructor && session.instructor.trim().toLowerCase() === member.name.trim().toLowerCase()) {
          isGv = true;
        }
      }

      if (!isGv) return;

      const totalPeriods = course.periods !== undefined ? course.periods : 8;
      const duration = course.durationDays || 1;
      const dailyPeriods = totalPeriods / duration;

      const overlapsMorning = subModuleStartTime < '12:00';
      const overlapsAfternoon = subModuleEndTime > '12:00' || subModuleStartTime >= '12:00';

      if (overlapsMorning && overlapsAfternoon) {
        totalMorningPeriods += dailyPeriods / 2;
        totalAfternoonPeriods += dailyPeriods / 2;
      } else if (overlapsMorning) {
        totalMorningPeriods += dailyPeriods;
      } else if (overlapsAfternoon) {
        totalAfternoonPeriods += dailyPeriods;
      }
    });

    const cappedMorning = Math.min(4, totalMorningPeriods);
    const cappedAfternoon = Math.min(4, totalAfternoonPeriods);
    return Math.min(8, cappedMorning + cappedAfternoon);
  };

  const calculateWeeklyStats = (member: Member) => {
    let tgCount = 0;
    let taCount = 0;

    trackingDays.forEach(date => {
      const dateStr = getLocalDateString(date);
      const morningAssignments = findAssignments(member, dateStr, 'Sáng');
      const afternoonAssignments = findAssignments(member, dateStr, 'Chiều');

      morningAssignments.forEach(assign => {
        if (assign.toLowerCase().endsWith(', tg')) {
          tgCount += 1;
        } else if (assign.toLowerCase().endsWith(', ta')) {
          taCount += 1;
        }
      });

      afternoonAssignments.forEach(assign => {
        if (assign.toLowerCase().endsWith(', tg')) {
          tgCount += 1;
        } else if (assign.toLowerCase().endsWith(', ta')) {
          taCount += 1;
        }
      });
    });

    return {
      tgTotal: tgCount,
      taTotal: taCount * 2
    };
  };

  const findAssignments = (member: Member, dateStr: string, halfDay: 'Sáng' | 'Chiều'): string[] => {
    const assignments: string[] = [];
    
    sessions.forEach(session => {
      const course = courses.find(c => c.id === session.courseId);
      const courseCode = course ? course.code : 'N/A';
      
      const isDateInSessionRange = dateStr >= session.startDate && dateStr <= session.endDate;
      if (!isDateInSessionRange) return;

      let subModuleFound = false;
      let subModuleInstructor: string | null = null;
      let subModuleTas: string[] = [];
      let subModuleStartTime = session.startTime;
      let subModuleEndTime = session.endTime;

      if (session.subModules) {
        Object.keys(session.subModules).forEach(key => {
          const val = session.subModules?.[key];
          if (val && typeof val === 'object') {
            if (val.date === dateStr) {
              subModuleFound = true;
              subModuleInstructor = val.instructor;
              subModuleTas = val.taOfficers || [];
              if (val.startTime) subModuleStartTime = val.startTime;
              if (val.endTime) subModuleEndTime = val.endTime;
            }
          }
        });
      }

      const overlapsMorning = subModuleStartTime < '12:00';
      const overlapsAfternoon = subModuleEndTime > '12:00' || subModuleStartTime >= '12:00';
      
      if (halfDay === 'Sáng' && !overlapsMorning) return;
      if (halfDay === 'Chiều' && !overlapsAfternoon) return;

      let roles: string[] = [];

      if (subModuleFound) {
        if (subModuleInstructor && subModuleInstructor.trim().toLowerCase() === member.name.trim().toLowerCase()) {
          roles.push('GV');
        }
        const isTa = subModuleTas.some(t => t.trim().toLowerCase() === member.name.trim().toLowerCase());
        if (isTa) {
          roles.push('TA');
        }
      } else {
        if (session.instructor && session.instructor.trim().toLowerCase() === member.name.trim().toLowerCase()) {
          roles.push('GV');
        }
        
        if (session.taOfficer) {
          const tas = session.taOfficer.split(/[,;]+/).map(t => t.trim().toLowerCase());
          if (tas.includes(member.name.trim().toLowerCase())) {
            roles.push('TA');
          }
        }

        if (session.tgOfficer) {
          const tgs = session.tgOfficer.split(/[,;]+/).map(t => t.trim().toLowerCase());
          if (tgs.includes(member.name.trim().toLowerCase())) {
            roles.push('TG');
          }
        }
      }

      if (roles.length > 0) {
        roles.forEach(role => {
          assignments.push(`${courseCode}, ${role}`);
        });
      }
    });

    return assignments;
  };

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
  const [editSubModules, setEditSubModules] = useState<Record<string, {
    instructor: string;
    date: string;
    startTime: string;
    endTime: string;
    classroom: string;
    taOfficers?: string[];
  }>>({
    "OSI": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
    "HE": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
    "SS": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
    "FF": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
    "FA": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
    "HE (P)": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
    "FF.SR (P)": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
    "SS (P)": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
  });

  const isSessionOpitoBosiet = !!(popupCourseSession && 
    (popupCourseSession.course.code?.toUpperCase() === 'OPITO T.BOSIET' || 
     popupCourseSession.course.title?.toUpperCase().includes('OPITO T.BOSIET') ||
     popupCourseSession.course.code?.toUpperCase().includes('T.BOSIET')) && 
    popupCourseSession.course.domain === 'OPITO/GWO');

  const isSessionHseMultiDay = !!(popupCourseSession && 
    popupCourseSession.course.domain === 'HSE' && 
    popupCourseSession.course.durationDays && 
    popupCourseSession.course.durationDays > 1);

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
    
    const isSessionHse = popupCourseSession.course.domain === 'HSE' && popupCourseSession.course.durationDays && popupCourseSession.course.durationDays > 1;

    const defaultSubs: Record<string, {
      instructor: string;
      date: string;
      startTime: string;
      endTime: string;
      classroom: string;
      taOfficers?: string[];
      theoryClassroom?: string;
      practiceArea?: string;
    }> = {};

    if (isSessionHse) {
      const daysCount = popupCourseSession.course.durationDays || 1;
      for (let i = 1; i <= daysCount; i++) {
        const key = `Day ${i}`;
        const val = session.subModules?.[key];
        if (val && typeof val === 'object') {
          defaultSubs[key] = {
            instructor: val.instructor || session.instructor || "",
            date: val.date || calculateEndDate(session.startDate, i),
            startTime: val.startTime || session.startTime || "08:00",
            endTime: val.endTime || session.endTime || "16:30",
            classroom: val.classroom || session.classroom || "",
            theoryClassroom: val.theoryClassroom || val.classroom || session.classroom || "",
            practiceArea: val.practiceArea || ""
          };
        } else {
          defaultSubs[key] = {
            instructor: session.instructor || "",
            date: calculateEndDate(session.startDate, i),
            startTime: session.startTime || "08:00",
            endTime: session.endTime || "16:30",
            classroom: session.classroom || "",
            theoryClassroom: session.classroom || "",
            practiceArea: ""
          };
        }
      }
    } else {
      const standardKeys = ["OSI", "HE", "SS", "FF", "FA", "HE (P)", "FF.SR (P)", "SS (P)"];
      standardKeys.forEach(k => {
        defaultSubs[k] = { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] };
      });

      if (session.subModules) {
        Object.keys(defaultSubs).forEach(key => {
          const val = session.subModules?.[key];
          if (val) {
            if (typeof val === 'object') {
              defaultSubs[key] = {
                instructor: val.instructor || "",
                date: val.date || "",
                startTime: val.startTime || "08:00",
                endTime: val.endTime || "16:30",
                classroom: val.classroom || "",
                taOfficers: (val as any).taOfficers || []
              };
            } else if (typeof val === 'string') {
              defaultSubs[key] = {
                instructor: val,
                date: "",
                startTime: "08:00",
                endTime: "16:30",
                classroom: "",
                taOfficers: []
              };
            }
          }
        });
      }
    }
    
    setEditSubModules(defaultSubs);
  };

  const handleSaveSessionUpdates = () => {
    if (!popupCourseSession) return;
    const updatedSession: CourseSession = {
      ...popupCourseSession.session,
      startDate: editStartDate,
      endDate: editEndDate,
      startTime: editStartTime,
      endTime: editEndTime,
      instructor: isSessionOpitoBosiet 
        ? Object.values(editSubModules).map((v: any) => v.instructor).filter(Boolean).join(', ') || 'Đội ngũ Giảng viên'
        : editInstructor,
      classroom: editClassroom,
      maxCapacity: editMaxCapacity,
      taOfficer: editTaOfficer,
      tgOfficer: editTgOfficer,
      method: isSessionOpitoBosiet ? 'Offline' : editMethod,
      subModules: (isSessionOpitoBosiet || isSessionHseMultiDay) ? editSubModules : popupCourseSession.session.subModules,
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
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState<boolean>(false);
  const [selCourseId, setSelCourseId] = useState<string>(courses[0]?.id || '');
  const [assignCourseCode, setAssignCourseCode] = useState<string>(courses[0]?.code || '');
  const [assignCourseName, setAssignCourseName] = useState<string>(courses[0]?.title || '');
  const [assignStartDate, setAssignStartDate] = useState<string>(getTodayString());
  const [assignEndDate, setAssignEndDate] = useState<string>('');
  const [assignTa, setAssignTa] = useState<string>('');
  const [assignTg, setAssignTg] = useState<string>('');
  const [assignMethod, setAssignMethod] = useState<'Online' | 'Offline'>('Offline');
  const [assignInstructor, setAssignInstructor] = useState<string>(() => {
    const foundInst = members?.find(m => m.position?.toLowerCase().includes('instructor') || m.position?.toLowerCase().includes('giảng viên'));
    if (foundInst) {
      return foundInst.name;
    }
    const defaultInst = members?.[1] || members?.[0];
    if (defaultInst) {
      return defaultInst.name;
    }
    return '';
  });
  const [assignClassroom, setAssignClassroom] = useState<string>('');
  
  // Keep first classroom selected if state changes
  useState(() => {
    if (activeClassrooms.length > 0) {
      setAssignClassroom(activeClassrooms[0].name);
    }
  });
  const [assignStartTime, setAssignStartTime] = useState<string>('08:00');
  const [assignEndTime, setAssignEndTime] = useState<string>('16:30');
  const [assignCapacity, setAssignCapacity] = useState<number>(25);
  const [assignNote, setAssignNote] = useState<string>('');
  const [assignFeedback, setAssignFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [assignDomain, setAssignDomain] = useState<CourseDomain>(() => {
    const firstCourse = courses[0];
    return (firstCourse?.domain as CourseDomain) || 'HSE';
  });

  const [subModulesData, setSubModulesData] = useState<Record<string, {
    instructor: string;
    date: string;
    startTime: string;
    endTime: string;
    classroom: string;
    taOfficers?: string[];
  }>>({
    "OSI": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
    "HE": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
    "SS": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
    "FF": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
    "FA": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
    "HE (P)": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
    "FF.SR (P)": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
    "SS (P)": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
  });

  const selectedCourse = courses.find(c => c.id === selCourseId);
  const isOpitoBosiet = !!(selectedCourse && 
    (selectedCourse.code?.toUpperCase() === 'OPITO T.BOSIET' || 
     selectedCourse.title?.toUpperCase().includes('OPITO T.BOSIET' ) ||
     selectedCourse.code?.toUpperCase().includes('T.BOSIET')) && 
    selectedCourse.domain === 'OPITO/GWO');

  const [hseDaysData, setHseDaysData] = useState<Record<string, {
    date: string;
    theoryClassroom: string;
    practiceArea: string;
  }>>({});

  const isHseMultiDay = !!(selectedCourse && selectedCourse.domain === 'HSE' && selectedCourse.durationDays && selectedCourse.durationDays > 1);

  useEffect(() => {
    if (!selCourseId) return;
    const selected = courses.find(c => c.id === selCourseId);
    if (selected && selected.domain === 'HSE') {
      const duration = selected.durationDays || 1;
      const computedEnd = calculateEndDate(assignStartDate, duration);
      setAssignEndDate(computedEnd);

      if (duration > 1) {
        const initialDays: Record<string, { date: string; theoryClassroom: string; practiceArea: string }> = {};
        for (let i = 1; i <= duration; i++) {
          const computedDate = calculateEndDate(assignStartDate, i);
          const key = `Day ${i}`;
          initialDays[key] = {
            date: computedDate,
            theoryClassroom: hseDaysData[key]?.theoryClassroom || assignClassroom || (activeClassrooms[0]?.name || ''),
            practiceArea: hseDaysData[key]?.practiceArea || ''
          };
        }
        setHseDaysData(initialDays);
      }
    }
  }, [selCourseId, assignStartDate, assignClassroom]);

  useEffect(() => {
    if (!popupCourseSession || !isEditingSession) return;
    const isSessionHse = popupCourseSession.course.domain === 'HSE';
    if (isSessionHse) {
      const duration = popupCourseSession.course.durationDays || 1;
      const computedEnd = calculateEndDate(editStartDate, duration);
      setEditEndDate(computedEnd);

      if (duration > 1) {
        setEditSubModules(prev => {
          const next = { ...prev };
          for (let i = 1; i <= duration; i++) {
            const key = `Day ${i}`;
            const computedDate = calculateEndDate(editStartDate, i);
            next[key] = {
              ...(next[key] || { instructor: editInstructor || "", startTime: "08:00", endTime: "16:30", classroom: editClassroom || "" }),
              date: computedDate,
              theoryClassroom: next[key]?.theoryClassroom || next[key]?.classroom || editClassroom || "",
              classroom: next[key]?.classroom || editClassroom || ""
            };
          }
          return next;
        });
      }
    }
  }, [editStartDate, isEditingSession, popupCourseSession]);

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
    setSubModulesData({
      "OSI": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
      "HE": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
      "SS": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
      "FF": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
      "FA": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
      "HE (P)": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
      "FF.SR (P)": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
      "SS (P)": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "", taOfficers: [] },
    });
  };

  const getBaseInstructorName = (fullname: string): string => {
    if (!fullname) return '';
    return fullname.split(' (')[0].trim().toLowerCase();
  };

  const hasInstructorOverlap = (inst1: string, inst2: string): boolean => {
    const norm1 = getBaseInstructorName(inst1);
    const norm2 = getBaseInstructorName(inst2);
    return norm1 && norm2 && (norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1));
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

    const isOnlineNew = isOpitoBosiet ? false : (assignMethod === 'Online');

    const currentSchedInstructors: string[] = [];
    if (isOpitoBosiet) {
      Object.keys(subModulesData).forEach(key => {
        if (subModulesData[key].instructor) {
          currentSchedInstructors.push(subModulesData[key].instructor);
        }
      });
    } else {
      if (assignInstructor) {
        currentSchedInstructors.push(assignInstructor);
      }
    }

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
      const existingInstructors: string[] = [];
      if (existing.subModules) {
        Object.keys(existing.subModules).forEach(key => {
          const val = existing.subModules?.[key];
          if (val) {
            if (typeof val === 'object' && val !== null) {
              const obj = val as any;
              if (obj.instructor) {
                existingInstructors.push(obj.instructor);
              }
            } else if (typeof val === 'string') {
              existingInstructors.push(val);
            }
          }
        });
      }
      if (existing.instructor) {
        existingInstructors.push(existing.instructor);
      }

      let conflictInstructorName = '';
      const hasInstConflict = currentSchedInstructors.some(currInst => {
        return existingInstructors.some(exInst => {
          if (hasInstructorOverlap(currInst, exInst)) {
            conflictInstructorName = currInst.split(' (')[0];
            return true;
          }
          return false;
        });
      });

      if (hasInstConflict) {
        const isSameCourseName = selCourseId === existing.courseId || assignCourseCode === code || assignCourseName === (matchedCourse ? matchedCourse.title : '');
        const isOneOrBothOnline = isOnlineNew || isOnlineExisting;
        if (isSameCourseName && isOneOrBothOnline) {
          // Rule 2: If both Online & Offline share same name and instructor, ignore instructor conflict
        } else {
          // Rule 3: booked for a different course at same time is a conflict
          testConflicts.push(`Giảng viên "${conflictInstructorName}" đã được phân bổ cho lớp "${code}" trong cùng khoảng thời gian.`);
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
          testConflicts.push(`Phụ giảng "${conflictingTaName}" không thể tham gia nhiều lớp Offline cùng lúc (Đã có lịch lớp "${code}").`);
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
          testConflicts.push(`Trợ giảng "${conflictingTgName}" không thể tham gia nhiều lớp Offline cùng lúc (Đã có lịch lớp "${code}").`);
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
      instructor: isOpitoBosiet 
        ? Object.values(subModulesData).map((val: any) => val.instructor).filter(Boolean).join(', ') || 'Đội ngũ Giảng viên'
        : assignInstructor,
      classroom: assignClassroom,
      maxCapacity: assignCapacity,
      enrolledIds: [],
      taOfficer: assignTa || undefined,
      tgOfficer: assignTg || undefined,
      method: isOpitoBosiet ? 'Offline' : assignMethod,
      notes: assignNote || undefined,
      domain: assignDomain,
      subModules: isOpitoBosiet 
        ? subModulesData 
        : (isHseMultiDay 
            ? Object.keys(hseDaysData).reduce((acc, key) => {
                const item = hseDaysData[key];
                acc[key] = {
                  instructor: assignInstructor,
                  date: item.date,
                  startTime: assignStartTime,
                  endTime: assignEndTime,
                  classroom: item.theoryClassroom,
                  theoryClassroom: item.theoryClassroom,
                  practiceArea: item.practiceArea
                };
                return acc;
              }, {} as any)
            : undefined),
    };

    if (onAddSession) {
      onAddSession(newSessionObject);
      setAssignFeedback({ 
        type: 'success', 
        message: `Lớp học cho khóa ${assignCourseCode} đã được phân lịch thành công.` 
      });
      // Clear specific temporary fields
      setAssignTa('');
      setAssignTg('');
      setAssignNote('');
      setAssignMethod('Offline');
      setSubModulesData({
        "OSI": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "" },
        "HE": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "" },
        "SS": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "" },
        "FF": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "" },
        "FA": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "" },
        "HE (P)": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "" },
        "FF.SR (P)": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "" },
        "SS (P)": { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "" },
      });
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
    type: 'Phòng học' | 'Giảng viên' | 'Trợ giảng/Phụ giảng';
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

      const isOnlineNew = isOpitoBosiet ? false : (assignMethod === 'Online');
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
      const currentSchedInstructors: string[] = [];
      if (isOpitoBosiet) {
        Object.keys(subModulesData).forEach(key => {
          if (subModulesData[key].instructor) {
            currentSchedInstructors.push(subModulesData[key].instructor);
          }
        });
      } else {
        if (assignInstructor) {
          currentSchedInstructors.push(assignInstructor);
        }
      }

      const existingInstructors: string[] = [];
      if (ex.subModules) {
        Object.keys(ex.subModules).forEach(key => {
          const val = ex.subModules?.[key];
          if (val) {
            if (typeof val === 'object' && val !== null) {
              const obj = val as any;
              if (obj.instructor) {
                existingInstructors.push(obj.instructor);
              }
            } else if (typeof val === 'string') {
              existingInstructors.push(val);
            }
          }
        });
      }
      if (ex.instructor) {
        existingInstructors.push(ex.instructor);
      }

      let conflictInstructorName = '';
      const hasInstConflict = currentSchedInstructors.some(currInst => {
        return existingInstructors.some(exInst => {
          if (hasInstructorOverlap(currInst, exInst)) {
            conflictInstructorName = currInst.split(' (')[0];
            return true;
          }
          return false;
        });
      });

      if (hasInstConflict) {
        const isSameCourseName = selCourseId === ex.courseId || assignCourseCode === courseCode || assignCourseName === courseTitle;
        const isOneOrBothOnline = isOnlineNew || isOnlineExisting;
        if (isSameCourseName && isOneOrBothOnline) {
          // Rule 2: same name, same instructor and one is Online -> ignore
        } else {
          // Rule 3: booked for a different course at same time is a conflict
          activeConflicts.push({
            type: 'Giảng viên',
            message: `Giảng viên "${conflictInstructorName}" bị trùng giờ lên lớp khác.`,
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
            type: 'Trợ giảng/Phụ giảng',
            message: `Nhiệm vụ Phụ giảng: "${conflictingTaName}" đã được giao cho lớp "${courseCode}" trong khoảng thời gian này.`,
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
            type: 'Trợ giảng/Phụ giảng',
            message: `Nhiệm vụ Trợ giảng: "${conflictingTgName}" đã được giao cho lớp "${courseCode}" trong khoảng thời gian này.`,
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
                  Đăng ký Khóa học
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
                    {!isOpitoBosiet ? (
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
                    ) : (
                      <div>
                        <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                          Sĩ số lớp học
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
                    )}
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
                    {!isOpitoBosiet && (
                      <div>
                        <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                          Phụ giảng
                        </label>
                        <select
                          id="assign-select-ta"
                          value={assignTa}
                          onChange={(e) => setAssignTa(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                        >
                          <option value="">-- Trống --</option>
                          {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                            <option key={m.id} value={m.name}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className={isOpitoBosiet ? "col-span-1 sm:col-span-2" : ""}>
                      <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                        Trợ giảng
                      </label>
                      <select
                        id="assign-select-tg"
                        value={assignTg}
                        onChange={(e) => setAssignTg(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                      >
                        <option value="">-- Trống --</option>
                        {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                          <option key={m.id} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Instructor & Classroom Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1 text-left">
                    {!isOpitoBosiet ? (
                      <>
                        <div className={isHseMultiDay ? "col-span-1 sm:col-span-2" : ""}>
                          <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                            Giảng viên
                          </label>
                          <select
                            id="assign-select-instructor"
                            value={assignInstructor}
                            onChange={(e) => setAssignInstructor(e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                          >
                            {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                              <option key={m.id} value={m.name}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {!isHseMultiDay ? (
                          <div>
                            <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                              Phòng học
                            </label>
                            <select
                              id="assign-select-classroom"
                              value={assignClassroom}
                              onChange={(e) => setAssignClassroom(e.target.value)}
                              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                            >
                              {activeClassrooms.map(room => (
                                <option key={room.id} value={room.name}>
                                  {room.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="col-span-1 sm:col-span-2 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/80 space-y-4 mt-1 text-left">
                            <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                              <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
                                Phân bổ chi tiết các ngày học (Khóa HSE {selectedCourse?.durationDays} Ngày)
                              </span>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                                {selectedCourse?.durationDays} Ngày học
                              </span>
                            </div>
                            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                              {Array.from({ length: selectedCourse?.durationDays || 1 }).map((_, idx) => {
                                const dayNum = idx + 1;
                                const key = `Day ${dayNum}`;
                                const dayData = hseDaysData[key] || { date: calculateEndDate(assignStartDate, dayNum), theoryClassroom: assignClassroom || '', practiceArea: '' };
                                
                                return (
                                  <div key={key} className="bg-white border border-slate-100 p-3 rounded-xl space-y-3 shadow-3xs">
                                    <div className="flex items-center justify-between border-b border-slate-50 pb-1.5 flex-row">
                                      <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase">
                                        <span className="h-1.5 w-1.5 rounded-full bg-[#549B8C]"></span>
                                        Ngày {dayNum}
                                      </span>
                                      <span className="text-[11px] font-bold text-slate-500 font-mono">
                                        {formatDate(dayData.date)}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                                      {/* Theory Classroom */}
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                          Phòng học lý thuyết
                                        </label>
                                        <select
                                          value={dayData.theoryClassroom}
                                          onChange={(e) => setHseDaysData(prev => ({
                                            ...prev,
                                            [key]: { ...prev[key], theoryClassroom: e.target.value }
                                          }))}
                                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                        >
                                          <option value="">-- Chọn phòng --</option>
                                          {activeClassrooms.map(room => (
                                            <option key={room.id} value={room.name}>
                                              {room.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>

                                      {/* Practical Training Area */}
                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-sans">
                                          Khu học thực hành
                                        </label>
                                        <div className="relative">
                                          <input
                                            type="text"
                                            list={`practice-areas-list-${dayNum}`}
                                            value={dayData.practiceArea}
                                            onChange={(e) => setHseDaysData(prev => ({
                                              ...prev,
                                              [key]: { ...prev[key], practiceArea: e.target.value }
                                            }))}
                                            placeholder="Ví dụ: Bãi thực hành giàn giáo"
                                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                                          />
                                          <datalist id={`practice-areas-list-${dayNum}`}>
                                            <option value="Sân diễn tập Phòng cháy Chữa cháy (PCCC)" />
                                            <option value="Bãi thực hành giàn giáo & Làm việc trên cao" />
                                            <option value="Bể bơi huấn luyện Sinh tồn dưới nước (HUET)" />
                                            <option value="Phòng giả lập Không gian hạn chế" />
                                            <option value="Khu huấn luyện Sơ cấp cứu thực tế" />
                                            <option value="Sân huấn luyện An toàn Lao động ngoài trời" />
                                          </datalist>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="col-span-1 sm:col-span-2 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/80 space-y-4 mt-1 text-left">
                        <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                          <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
                            Phân bổ chi tiết môn học nhỏ (BOSIET)
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                            8 Môn học nhỏ
                          </span>
                        </div>
                        <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                          {["OSI", "HE", "SS", "FF", "FA", "HE (P)", "FF.SR (P)", "SS (P)"].map((subject) => {
                            const data = subModulesData[subject] || { instructor: "", date: "", startTime: "08:05", endTime: "16:30", classroom: "", taOfficers: [] };
                            return (
                              <div key={subject} className="bg-white border border-slate-100 p-3 rounded-xl space-y-3 shadow-3xs">
                                <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#559b8c]"></span>
                                    Môn: <span className="text-[#559b8c] font-black">{subject}</span>
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* Giảng viên */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                      Giảng viên
                                    </label>
                                    <select
                                      value={data.instructor}
                                      onChange={(e) => setSubModulesData(prev => ({
                                        ...prev,
                                        [subject]: { ...prev[subject], instructor: e.target.value }
                                      }))}
                                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                    >
                                      <option value="">-- Chưa chọn --</option>
                                      {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                                        <option key={m.id} value={m.name}>
                                          {m.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
 
                                  {/* Phòng học */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                      Phòng học
                                    </label>
                                    <select
                                      value={data.classroom}
                                      onChange={(e) => setSubModulesData(prev => ({
                                        ...prev,
                                        [subject]: { ...prev[subject], classroom: e.target.value }
                                      }))}
                                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                    >
                                      <option value="">-- Chọn phòng --</option>
                                      {activeClassrooms.map(room => (
                                        <option key={room.id} value={room.name}>
                                          {room.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
 
                                  {/* Ngày học */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                      Ngày học
                                    </label>
                                    <input
                                      type="date"
                                      value={data.date}
                                      onChange={(e) => setSubModulesData(prev => ({
                                        ...prev,
                                        [subject]: { ...prev[subject], date: e.target.value }
                                      }))}
                                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                                    />
                                  </div>
 
                                  {/* Thời gian */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                      Giờ học (Từ - Đến)
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="time"
                                        value={data.startTime}
                                        onChange={(e) => setSubModulesData(prev => ({
                                          ...prev,
                                          [subject]: { ...prev[subject], startTime: e.target.value }
                                        }))}
                                        className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-1 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                                      />
                                      <span className="text-[10px] text-slate-400 font-bold">-</span>
                                      <input
                                        type="time"
                                        value={data.endTime}
                                        onChange={(e) => setSubModulesData(prev => ({
                                          ...prev,
                                          [subject]: { ...prev[subject], endTime: e.target.value }
                                        }))}
                                        className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-1 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                                      />
                                    </div>
                                  </div>
 
                                  {/* Phụ giảng (Chỉ hiện cho môn có chữ (P)) */}
                                  {subject.includes('(P)') && (
                                    <div className="space-y-1.5 col-span-1 md:col-span-2 border-t border-slate-100 pt-2 px-0.5 mt-1">
                                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                        Phụ giảng môn {subject} (Chọn nhiều)
                                      </label>
                                      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-[110px] overflow-y-auto">
                                        {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => {
                                          const isSelected = (data.taOfficers || []).includes(m.name);
                                          return (
                                            <button
                                              key={m.id}
                                              type="button"
                                              onClick={() => {
                                                const current = data.taOfficers || [];
                                                const next = isSelected 
                                                  ? current.filter(name => name !== m.name)
                                                  : [...current, m.name];
                                                setSubModulesData(prev => ({
                                                  ...prev,
                                                  [subject]: { ...prev[subject], taOfficers: next }
                                                }));
                                              }}
                                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                                isSelected
                                                  ? 'bg-[#559b8c] text-white shadow-3xs'
                                                  : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                                              }`}
                                            >
                                              {isSelected && <span className="mr-0.5 text-[9px]">✓</span>}
                                              {m.name}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Duration Hours & Number of Learners */}
                  {!isOpitoBosiet && (
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
                            placeholder="08:00"
                          />
                          <span className="text-slate-400 font-bold px-2 shrink-0">-</span>
                          <input
                            id="assign-input-end-time"
                            type="text"
                            required
                            value={assignEndTime}
                            onChange={(e) => setAssignEndTime(e.target.value)}
                            className="w-1/2 text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none text-center font-mono font-bold focus:ring-1 focus:ring-[#559b8c]"
                            placeholder="16:30"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                          Sĩ số
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
                  )}

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
                      Xác nhận
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
                                <span className="font-extrabold text-slate-500">Phụ giảng:</span> {c.conflictingSession.taOfficer}
                              </div>
                            )}
                            {c.conflictingSession.tgOfficer && (
                              <div>
                                <span className="font-extrabold text-slate-500">Trợ giảng:</span> {c.conflictingSession.tgOfficer}
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
                    📋 Ghi chú
                  </label>
                  <textarea
                    id="assign-notes-textarea"
                    rows={4}
                    value={assignNote}
                    onChange={(e) => setAssignNote(e.target.value)}
                    placeholder=""
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 outline-none focus:ring-1 focus:ring-[#559b8c] font-semibold resize-none text-slate-800 leading-relaxed shadow-3xs"
                  />
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Bảng phân công khóa học theo tuần */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-3xs p-6 space-y-5 text-left mb-8 animate-in fade-in duration-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span className="p-1.5 bg-emerald-50 text-[#559b8c] rounded-lg">
                <User className="h-4 w-4" />
              </span>
              Bảng phân công khóa học
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Bảng phân công khóa học theo nhân sự
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
                className="inline-flex items-center gap-1.5 bg-[#559b8c] hover:bg-[#3f766a] text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-3xs hover:shadow-2xs cursor-pointer transition-all active:scale-[0.98] select-none flex-row border-none"
                title="Mở bảng phân bổ lịch học khóa đào tạo"
              >
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>Đăng ký Khóa học</span>
              </button>
            )}

            {/* Week Selector Navigation */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setTrackingBaseDate(prev => {
                    const prior = new Date(prev);
                    prior.setDate(prev.getDate() - 7);
                    return prior;
                  });
                }}
                className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer border border-transparent hover:border-slate-200"
                title="Tuần trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <span className="text-[11px] font-black text-slate-700 px-3 font-mono min-w-[220px] text-center">
                {trackingWeekRangeLabel}
              </span>

              <button
                type="button"
                onClick={() => {
                  setTrackingBaseDate(prev => {
                    const next = new Date(prev);
                    next.setDate(prev.getDate() + 7);
                    return next;
                  });
                }}
                className="p-1.5 hover:bg-white rounded-lg text-slate-600 hover:text-slate-900 transition-all cursor-pointer border border-transparent hover:border-slate-200"
                title="Tuần tiếp theo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setTrackingBaseDate(new Date())}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 transition-colors cursor-pointer ml-1"
              >
                Hiện tại
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Grid Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-3xs max-w-full">
          <table className="w-full text-xs text-left border-collapse min-w-[1300px]">
            <thead>
              {/* Row 1: Day of week */}
              <tr className="bg-slate-50 border-b border-slate-200">
                <th rowSpan={2} className="p-3 font-extrabold text-slate-700 text-center border-r border-slate-200 bg-slate-100/80 sticky left-0 z-10 w-[200px] min-w-[200px] shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                  Thành viên
                </th>
                {trackingDays.map((date, idx) => {
                  const isToday = getLocalDateString(date) === getLocalDateString(new Date());
                  const dayLabel = idx === 6 ? 'Chủ nhật' : `Thứ ${idx + 2}`;
                  const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
                  return (
                    <th 
                      key={idx} 
                      colSpan={3} 
                      className={`p-2 font-black text-center border-r border-slate-200 text-[10.5px] ${
                        isToday 
                          ? 'bg-emerald-50 text-emerald-800' 
                          : 'text-slate-600 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span className="uppercase text-[9px] font-bold tracking-tight">{dayLabel}</span>
                        <span className="font-mono text-xs">{dateStr}</span>
                      </div>
                    </th>
                  );
                })}
                <th rowSpan={2} className="p-3 font-extrabold text-slate-700 text-center border-r border-slate-200 bg-slate-100/80 w-[60px] min-w-[60px] uppercase">
                  TG
                </th>
                <th rowSpan={2} className="p-3 font-extrabold text-slate-700 text-center bg-slate-100/80 w-[60px] min-w-[60px] uppercase">
                  TA
                </th>
              </tr>
              {/* Row 2: Morning/Afternoon/Periods sub-headers */}
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[9px] font-bold text-slate-500 uppercase tracking-wider text-center">
                {trackingDays.map((date, idx) => {
                  const isToday = getLocalDateString(date) === getLocalDateString(new Date());
                  const cellClass = isToday ? 'bg-emerald-50/40 text-emerald-950 font-bold' : '';
                  return (
                    <Fragment key={idx}>
                      <th className={`p-1.5 text-center border-r border-slate-150 ${cellClass}`}>Sáng</th>
                      <th className={`p-1.5 text-center border-r border-slate-150 ${cellClass}`}>Chiều</th>
                      <th className={`p-1.5 text-center border-r border-slate-200 ${cellClass} text-amber-800`}>Tiết</th>
                    </Fragment>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedTrackingMembers.length > 0 ? (
                sortedTrackingMembers.map(member => {
                  const stats = calculateWeeklyStats(member);
                  return (
                    <tr key={member.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-100">
                      <td className="p-3 font-bold text-slate-900 border-r border-slate-200 bg-white sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                        <div className="flex flex-col text-left">
                          <span className="text-xs text-slate-900 font-extrabold truncate max-w-[170px]" title={member.name}>{member.name}</span>
                        </div>
                      </td>
                      {trackingDays.map((date, idx) => {
                        const dateStr = getLocalDateString(date);
                        const isToday = dateStr === getLocalDateString(new Date());
                        
                        const morningAssignments = findAssignments(member, dateStr, 'Sáng');
                        const afternoonAssignments = findAssignments(member, dateStr, 'Chiều');
                        const dayPeriods = calculateTeachingPeriods(member, dateStr);
                        
                        const cellClass = isToday ? 'bg-emerald-50/10' : '';
                        
                        return (
                          <Fragment key={idx}>
                            {/* Morning Slot */}
                            <td className={`p-2 border-r border-slate-150 align-top ${cellClass} text-center min-w-[75px]`}>
                              {morningAssignments.length > 0 ? (
                                <div className="flex flex-col gap-1.5">
                                  {morningAssignments.map((assign, aIdx) => {
                                    const isGv = assign.toLowerCase().endsWith(', gv');
                                    const isTa = assign.toLowerCase().endsWith(', ta');
                                    const isTg = assign.toLowerCase().endsWith(', tg');
                                    
                                    let badgeBg = 'bg-slate-50 border-slate-200 text-slate-700';
                                    if (isGv) badgeBg = 'bg-amber-50 text-amber-900 border-amber-250 font-black';
                                    else if (isTa) badgeBg = 'bg-teal-50 text-teal-900 border-teal-250 font-black';
                                    else if (isTg) badgeBg = 'bg-sky-50 text-sky-900 border-sky-250 font-black';
                                    
                                    return (
                                      <div 
                                        key={aIdx} 
                                        className={`px-1.5 py-1 text-[9.5px] rounded-md border text-center leading-tight shadow-3xs truncate ${badgeBg}`}
                                        title={assign}
                                      >
                                        {assign}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-slate-300 text-[10px] font-normal italic">-</span>
                              )}
                            </td>
                            
                            {/* Afternoon Slot */}
                            <td className={`p-2 border-r border-slate-150 align-top ${cellClass} text-center min-w-[75px]`}>
                              {afternoonAssignments.length > 0 ? (
                                <div className="flex flex-col gap-1.5">
                                  {afternoonAssignments.map((assign, aIdx) => {
                                    const isGv = assign.toLowerCase().endsWith(', gv');
                                    const isTa = assign.toLowerCase().endsWith(', ta');
                                    const isTg = assign.toLowerCase().endsWith(', tg');
                                    
                                    let badgeBg = 'bg-slate-50 border-slate-200 text-slate-700';
                                    if (isGv) badgeBg = 'bg-amber-50 text-amber-900 border-amber-250 font-black';
                                    else if (isTa) badgeBg = 'bg-teal-50 text-teal-900 border-teal-250 font-black';
                                    else if (isTg) badgeBg = 'bg-sky-50 text-sky-900 border-sky-250 font-black';
                                    
                                    return (
                                      <div 
                                        key={aIdx} 
                                        className={`px-1.5 py-1 text-[9.5px] rounded-md border text-center leading-tight shadow-3xs truncate ${badgeBg}`}
                                        title={assign}
                                      >
                                        {assign}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-slate-300 text-[10px] font-normal italic">-</span>
                              )}
                            </td>
                            
                            {/* Teaching periods for Lecturers (GV) */}
                            <td className={`p-2 border-r border-slate-200 align-middle ${cellClass} text-center font-mono text-[11.5px] font-bold text-amber-800 bg-amber-50/15`}>
                              {dayPeriods > 0 ? (
                                <span>{dayPeriods === Math.floor(dayPeriods) ? dayPeriods : dayPeriods.toFixed(1)}</span>
                              ) : (
                                <span className="text-slate-300 font-normal italic">-</span>
                              )}
                            </td>
                          </Fragment>
                        );
                      })}
                      {/* TG Summary Column */}
                      <td className="p-3 font-mono font-black text-center border-r border-slate-200 bg-slate-50/40 text-xs">
                        {stats.tgTotal > 0 ? (
                          <span className="px-1.5 py-0.5 bg-sky-50 text-sky-800 rounded border border-sky-200 shadow-3xs">
                            {stats.tgTotal}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal italic">-</span>
                        )}
                      </td>
                      {/* TA Summary Column */}
                      <td className="p-3 font-mono font-black text-center bg-slate-50/40 text-xs">
                        {stats.taTotal > 0 ? (
                          <span className="px-1.5 py-0.5 bg-teal-50 text-teal-800 rounded border border-teal-200 shadow-3xs">
                            {stats.taTotal}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal italic">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={24} className="p-8 text-center text-xs text-slate-400 font-bold font-serif bg-slate-50/50">
                    Không có thành viên nào hoạt động trong danh mục chung.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 items-center justify-between text-[10.5px] font-medium text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-slate-700">Chú thích vai trò:</span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <strong>GV:</strong> Giảng viên
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-teal-500"></span>
              <strong>TA:</strong> Trợ giảng (Phụ trách lý thuyết / thực hành)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-500"></span>
              <strong>TG:</strong> Phụ giảng (Nhân viên hỗ trợ lớp)
            </span>
          </div>
          <span className="font-mono text-[9.5px]">Đồng bộ trực tiếp theo thời gian thực</span>
        </div>
      </div>

      {/* Header section with profile avatar or selectors */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4 text-left">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            Biểu đồ Lịch Đào tạo
          </h2>
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
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-3xs max-w-full text-left">
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
                'Emergency': { bg: 'bg-rose-100 text-rose-955 border-rose-300', border: 'border-l-4 border-rose-500 text-rose-950 font-semibold' },
                'Health': { bg: 'bg-teal-100 text-teal-950 border-teal-300', border: 'border-l-4 border-teal-500 text-teal-950 font-semibold' },
                'Compliance': { bg: 'bg-indigo-100 text-indigo-955 border-indigo-300', border: 'border-l-4 border-indigo-500 text-indigo-955 font-semibold' },
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

      {/* Mobile Card List (Hidden on Desktop) */}
      <div className="block md:hidden space-y-4">
        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-1">
          Chương trình Đào tạo tháng này ({filteredSessions.length} khoá)
        </h3>
        <div className="space-y-3.5">
          {filteredSessions.map(session => {
            const course = courses.find(c => c.id === session.courseId);
            if (!course) return null;

            const status = getSessionStatus(session.startDate, session.endDate, todayDateStr);
            const statusVn = status === 'ON-GOING' ? 'Đang diễn ra' : status === 'UP-COMING' ? 'Sắp diễn ra' : 'Đã hoàn thành';

            // Styling colors based on category
            const categoryColors: Record<string, { bg: string, border: string, text: string, textAccent: string }> = {
              'Safety': { bg: 'bg-amber-500/10 text-amber-900 border-amber-200', border: 'border-l-4 border-amber-500', text: 'text-amber-800', textAccent: 'text-amber-900' },
              'Environment': { bg: 'bg-emerald-500/10 text-emerald-950 border-emerald-250', border: 'border-l-4 border-emerald-500', text: 'text-emerald-800', textAccent: 'text-emerald-950' },
              'Emergency': { bg: 'bg-rose-500/10 text-rose-955 border-rose-200', border: 'border-l-4 border-rose-500', text: 'text-rose-800', textAccent: 'text-rose-950' },
              'Health': { bg: 'bg-teal-500/10 text-teal-950 border-teal-200', border: 'border-l-4 border-teal-500', text: 'text-teal-800', textAccent: 'text-teal-950' },
              'Compliance': { bg: 'bg-indigo-500/10 text-indigo-950 border-indigo-200', border: 'border-l-4 border-indigo-500', text: 'text-indigo-800', textAccent: 'text-indigo-955' },
            };

            const style = categoryColors[course.category] || { bg: 'bg-slate-50 text-slate-705 border-slate-200', border: 'border-l-4 border-slate-400', text: 'text-slate-655', textAccent: 'text-slate-900' };

            return (
              <div 
                key={session.id}
                onClick={() => setPopupCourseSession({ course, session })}
                className={`bg-white border border-slate-200 rounded-xl p-4 shadow-3xs hover:shadow-xs transition-all duration-150 cursor-pointer ${style.border}`}
              >
                <div className="flex items-start justify-between gap-1 mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black font-mono bg-slate-100 text-slate-750 px-1.5 py-0.5 rounded uppercase select-all">
                        {course.code}
                      </span>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded font-mono uppercase ${
                        session.method === 'Online' 
                          ? 'bg-sky-100 text-sky-800' 
                          : 'bg-emerald-100 text-emerald-855'
                      }`}>
                        {session.method === 'Online' ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {course.title}
                    </h4>
                  </div>
                  
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                    status === 'ON-GOING' ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 
                    status === 'UP-COMING' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {statusVn}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                  <div className="flex items-center gap-2 text-[11px]">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Lịch học: <strong>{formatDate(session.startDate)}</strong> → <strong>{formatDate(session.endDate)}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{session.startTime} - {session.endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{session.classroom}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">Giảng viên: <strong className="text-slate-800">{session.instructor.split(' (')[0]}</strong></span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold">Tỉ lệ tham gia:</span>
                  <span className="bg-emerald-50 text-emerald-850 font-black px-2.5 py-0.5 rounded-full border border-emerald-100/60">
                    {session.enrolledIds.length}/{session.maxCapacity} Học viên
                  </span>
                </div>
              </div>
            );
          })}

          {filteredSessions.length === 0 && (
            <div className="py-10 text-center bg-slate-50/65 border border-dashed border-slate-205 rounded-xl text-xs text-slate-400 font-bold italic font-serif">
              Không tìm thấy chương trình hoạt động trong thời gian đã chọn.
            </div>
          )}
        </div>
      </div>

      {/* OLD TABLE DELETED */}

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
            className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
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
            <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto text-left">
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

                  {/* Date Range & Capacity */}
                  <div className={`grid ${isSessionOpitoBosiet ? 'grid-cols-3' : 'grid-cols-2'} gap-3.5 text-left`}>
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
                    {isSessionOpitoBosiet && (
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Sĩ số tối đa</label>
                        <input 
                          type="number"
                          value={editMaxCapacity}
                          onChange={(e) => setEditMaxCapacity(parseInt(e.target.value) || 20)}
                          min={1}
                          max={100}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-bold text-slate-850 focus:ring-1 focus:ring-[#559b8c]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Timing Selection */}
                  {!isSessionOpitoBosiet && (
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
                  )}

                  {/* Instructor & Classroom */}
                  <div className="grid grid-cols-2 gap-3.5 text-left font-sans">
                    {!isSessionOpitoBosiet ? (
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
                    ) : (
                      <div className="col-span-2 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/80 space-y-4 mt-1 text-left">
                        <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                          <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
                            Chi tiết phân bổ môn học nhỏ (BOSIET)
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                            8 Môn học nhỏ
                          </span>
                        </div>
                        <div className="space-y-4 max-h-[355px] overflow-y-auto pr-1">
                          {["OSI", "HE", "SS", "FF", "FA", "HE (P)", "FF.SR (P)", "SS (P)"].map((subject) => {
                            const data = editSubModules[subject] || { instructor: "", date: "", startTime: "08:00", endTime: "16:30", classroom: "" };
                            return (
                              <div key={subject} className="bg-white border border-slate-100 p-3 rounded-xl space-y-3 shadow-3xs">
                                <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#559b8c]"></span>
                                    Môn: <span className="text-[#559b8c] font-black">{subject}</span>
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* Giảng viên */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                      Giảng viên
                                    </label>
                                    <select
                                      value={data.instructor}
                                      onChange={(e) => setEditSubModules(prev => ({
                                        ...prev,
                                        [subject]: { ...prev[subject], instructor: e.target.value }
                                      }))}
                                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                    >
                                      <option value="">-- Chưa chọn --</option>
                                      {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                                        <option key={m.id} value={m.name}>
                                          {m.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Phòng học */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                      Phòng học
                                    </label>
                                    <select
                                      value={data.classroom}
                                      onChange={(e) => setEditSubModules(prev => ({
                                        ...prev,
                                        [subject]: { ...prev[subject], classroom: e.target.value }
                                      }))}
                                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                    >
                                      <option value="">-- Chọn phòng --</option>
                                      {activeClassrooms.map(room => (
                                        <option key={room.id} value={room.name}>
                                          {room.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Ngày học */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                      Ngày học
                                    </label>
                                    <input
                                      type="date"
                                      value={data.date}
                                      onChange={(e) => setEditSubModules(prev => ({
                                        ...prev,
                                        [subject]: { ...prev[subject], date: e.target.value }
                                      }))}
                                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                                    />
                                  </div>

                                  {/* Thời gian */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                      Giờ học (Từ - Đến)
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="time"
                                        value={data.startTime}
                                        onChange={(e) => setEditSubModules(prev => ({
                                          ...prev,
                                          [subject]: { ...prev[subject], startTime: e.target.value }
                                        }))}
                                        className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-1 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                                      />
                                      <span className="text-[10px] text-slate-400 font-bold">-</span>
                                      <input
                                        type="time"
                                        value={data.endTime}
                                        onChange={(e) => setEditSubModules(prev => ({
                                          ...prev,
                                          [subject]: { ...prev[subject], endTime: e.target.value }
                                        }))}
                                        className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-1 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {!isSessionOpitoBosiet && !isSessionHseMultiDay && (
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Phòng Đào tạo</label>
                        <select 
                          value={editClassroom}
                          onChange={(e) => setEditClassroom(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-bold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                        >
                          {activeClassrooms.map(room => (
                            <option key={room.id} value={room.name}>
                              {room.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {isSessionHseMultiDay && (
                      <div className="col-span-2 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/80 space-y-4 mt-1 text-left">
                        <div className="flex justify-between items-center pb-2 border-b border-emerald-100 font-sans">
                          <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
                            Chỉnh sửa chi tiết các ngày học (Khóa HSE Multi-day)
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                            {popupCourseSession.course.durationDays} Ngày học
                          </span>
                        </div>
                        <div className="space-y-4 max-h-[355px] overflow-y-auto pr-1">
                          {Array.from({ length: popupCourseSession.course.durationDays || 1 }).map((_, idx) => {
                            const dayNum = idx + 1;
                            const key = `Day ${dayNum}`;
                            const data = editSubModules[key] || { instructor: editInstructor || "", date: calculateEndDate(editStartDate, dayNum), startTime: "08:00", endTime: "16:30", classroom: editClassroom || "", theoryClassroom: editClassroom || "", practiceArea: "" };
                            
                            return (
                              <div key={key} className="bg-white border border-slate-100 p-3 rounded-xl space-y-3 shadow-3xs font-sans">
                                <div className="flex items-center justify-between border-b border-slate-50 pb-1.5 flex-row">
                                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5 uppercase">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#559b8c]"></span>
                                    Ngày {dayNum}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                                    {formatDate(data.date)}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* Phòng học lý thuyết */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                      Phòng học lý thuyết
                                    </label>
                                    <select
                                      value={data.theoryClassroom || data.classroom || ''}
                                      onChange={(e) => setEditSubModules(prev => ({
                                        ...prev,
                                        [key]: { 
                                          ...prev[key], 
                                          classroom: e.target.value,
                                          theoryClassroom: e.target.value 
                                        }
                                      }))}
                                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                    >
                                      <option value="">-- Chọn phòng --</option>
                                      {activeClassrooms.map(room => (
                                        <option key={room.id} value={room.name}>
                                          {room.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Khu học thực hành */}
                                  <div className="space-y-1">
                                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider font-sans">
                                      Khu học thực hành
                                    </label>
                                    <div className="relative">
                                      <input
                                        type="text"
                                        list={`edit-practice-areas-list-${dayNum}`}
                                        value={data.practiceArea || ''}
                                        onChange={(e) => setEditSubModules(prev => ({
                                          ...prev,
                                          [key]: { ...prev[key], practiceArea: e.target.value }
                                        }))}
                                        placeholder="Ví dụ: Bãi thực hành giàn giáo"
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                                      />
                                      <datalist id={`edit-practice-areas-list-${dayNum}`}>
                                        <option value="Sân diễn tập Phòng cháy Chữa cháy (PCCC)" />
                                        <option value="Bãi thực hành giàn giáo & Làm việc trên cao" />
                                        <option value="Bể bơi huấn luyện Sinh tồn dưới nước (HUET)" />
                                        <option value="Phòng giả lập Không gian hạn chế" />
                                        <option value="Khu huấn luyện Sơ cấp cứu thực tế" />
                                        <option value="Sân huấn luyện An toàn Lao động ngoài trời" />
                                      </datalist>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mode / Method Selection */}
                  {!isSessionOpitoBosiet && (
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
                  )}

                  {/* TG and TA officers assigned */}
                  <div className="grid grid-cols-2 gap-3.5 text-left font-sans">
                    <div className={isSessionOpitoBosiet ? "col-span-2" : ""}>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Trợ giảng</label>
                      <input 
                        type="text"
                        value={editTgOfficer}
                        onChange={(e) => setEditTgOfficer(e.target.value)}
                        placeholder="Chưa chỉ định"
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                      />
                    </div>
                    {!isSessionOpitoBosiet && (
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Phụ giảng</label>
                        <input 
                          type="text"
                          value={editTaOfficer}
                          onChange={(e) => setEditTaOfficer(e.target.value)}
                          placeholder="Chưa chỉ định"
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Capacity / Number of Learners */}
                  {!isSessionOpitoBosiet && (
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
                  )}
                </div>
              ) : (
                <div className="text-left animate-fade-in font-sans grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Left Column */}
                  <div className="space-y-4">
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
                        <span id="popup-course-id" className="text-xs font-bold text-slate-705 bg-slate-100 px-2.5 py-0.5 rounded-md inline-block font-mono">
                          {popupCourseSession.course.code}
                        </span>
                      </div>
                    </div>

                    {/* Time and Date */}
                    <div className="border-t border-b border-slate-50 py-3 space-y-2">
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-705 flex-row">
                        <Calendar className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Thời gian Khóa học</span>
                          <span id="popup-course-date">
                            {formatDate(popupCourseSession.session.startDate)} đến {formatDate(popupCourseSession.session.endDate)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-755 flex-row">
                        <Clock className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Giờ Lên lớp dự kiến</span>
                          <span id="popup-course-time">
                            {popupCourseSession.session.startTime} - {popupCourseSession.session.endTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Classroom Details */}
                    <div className="space-y-0.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Địa điểm & Phòng học</span>
                      <span className="text-xs font-bold text-slate-850 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg block">
                        {popupCourseSession.session.classroom}
                      </span>
                    </div>

                    {/* Number of Learners (replaces Estimate quantity of learners) */}
                    <div className="border-t border-slate-50 pt-3">
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-between items-center flex-row">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-left">Sĩ số tối đa</span>
                        <div className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-2.5 py-1 rounded-lg whitespace-nowrap">
                          {popupCourseSession.session.maxCapacity} Học viên
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    {/* Instructor and Method */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-0.5 text-left">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Giảng viên / Đội ngũ</span>
                        <span id="popup-course-instructor" className="text-xs font-black text-slate-750 block truncate" title={popupCourseSession.session.instructor}>
                          {popupCourseSession.session.instructor.split(' (')[0]}
                        </span>
                      </div>
                      {!isSessionOpitoBosiet && (
                        <div className="space-y-0.5 text-left">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Hình thức học</span>
                          <span id="popup-course-method" className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 border border-emerald-100 rounded-md inline-block font-mono">
                            {popupCourseSession.session.method === 'Online' ? 'Trực tuyến (Online)' : 'Trực tiếp (Offline)'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* TG and TA */}
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-105 pt-3">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trợ giảng</span>
                        <span id="popup-course-tg" className="text-xs font-semibold text-slate-755 block truncate bg-slate-50 px-2 py-1 border border-slate-100 rounded-md" title={popupCourseSession.session.tgOfficer || 'Chưa phân công'}>
                          {popupCourseSession.session.tgOfficer || 'Chưa phân công'}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phụ giảng</span>
                        <span id="popup-course-ta" className="text-xs font-semibold text-slate-755 block truncate bg-slate-50 px-2 py-1 border border-slate-100 rounded-md" title={popupCourseSession.session.taOfficer || 'Chưa phân công'}>
                          {popupCourseSession.session.taOfficer || 'Chưa phân công'}
                        </span>
                      </div>
                    </div>

                    {/* For OPITO BOSIET, display sub-modules instructors list in View Mode */}
                    {isSessionOpitoBosiet && (
                      <div className="space-y-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/80 mt-1 text-left animate-fade-in font-sans">
                        <div className="flex justify-between items-center border-b border-emerald-100 pb-1.5 mb-2">
                          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                            Chi tiết học phần nhỏ (BOSIET)
                          </span>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                            8 Môn học nhỏ
                          </span>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {["OSI", "HE", "SS", "FF", "FA", "HE (P)", "FF.SR (P)", "SS (P)"].map((subject) => {
                            const val = popupCourseSession.session.subModules?.[subject];
                            let instructor = "Chưa phân công";
                            let date = "";
                            let timeRange = "08:00 - 16:30";
                            let classroom = "";
                            let taOfficers: string[] = [];

                            if (val) {
                              if (typeof val === 'object') {
                                instructor = val.instructor || "Chưa phân công";
                                if (val.date) {
                                  // Format to dd/mm/yyyy
                                  const dParts = val.date.split('-');
                                  date = dParts.length === 3 ? `${dParts[2]}/${dParts[1]}/${dParts[0]}` : val.date;
                                }
                                if (val.startTime && val.endTime) {
                                  timeRange = `${val.startTime} - ${val.endTime}`;
                                }
                                classroom = val.classroom || "";
                                taOfficers = (val as any).taOfficers || [];
                              } else if (typeof val === 'string') {
                                instructor = val;
                              }
                            }

                            return (
                              <div key={subject} className="bg-white border border-slate-100 rounded-lg p-2 space-y-1.5 shadow-3xs">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-extrabold text-slate-800 font-sans">Môn {subject}</span>
                                  <span className="font-bold text-[#559b8c] font-sans" title={instructor}>{instructor}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 font-medium">
                                  <div className="flex items-center gap-1">
                                    <span className="h-1 w-1 bg-slate-100 rounded-full"></span>
                                    <span>Lớp: {classroom || popupCourseSession.session.classroom || "Chưa chọn"}</span>
                                  </div>
                                  <div className="flex items-center gap-1 justify-end">
                                    <span>{timeRange}</span>
                                  </div>
                                  {date && (
                                    <div className="col-span-2 flex items-center gap-1 py-0.5 mt-0.5 border-t border-slate-55 text-[9px] font-bold text-slate-400">
                                      <span>Ngày học: </span>
                                      <span className="text-slate-600">{date}</span>
                                    </div>
                                  )}
                                  {taOfficers && taOfficers.length > 0 && (
                                    <div className="col-span-2 flex items-center gap-1 flex-wrap mt-1 pt-1 border-t border-dashed border-slate-100 text-[10px]">
                                      <span className="font-bold text-slate-450">Phụ giảng:</span>
                                      <div className="flex flex-wrap gap-1">
                                        {taOfficers.map((taName, idx) => (
                                          <span key={idx} className="bg-amber-50 text-amber-805 text-[9px] px-1.5 py-0.5 rounded font-black border border-amber-100/50">
                                            {taName}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {isSessionHseMultiDay && (
                      <div className="space-y-3 bg-[#eef7f5] p-4 rounded-xl border border-emerald-100/80 mt-1 text-left animate-fade-in font-sans">
                        <div className="flex justify-between items-center border-b border-[#cde0dc] pb-1.5 mb-2">
                          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">
                            Chi tiết các ngày học (Khóa HSE Multi-day)
                          </span>
                          <span className="text-[9px] bg-emerald-100 text-emerald-850 px-2.5 py-0.5 rounded-full font-bold">
                            {popupCourseSession.course.durationDays} Ngày học
                          </span>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {Array.from({ length: popupCourseSession.course.durationDays || 1 }).map((_, idx) => {
                            const dayNum = idx + 1;
                            const key = `Day ${dayNum}`;
                            const val = popupCourseSession.session.subModules?.[key];
                            
                            let theoryClassroom = popupCourseSession.session.classroom || "Chưa chọn";
                            let practiceArea = "Chưa đăng ký";
                            let dateStr = calculateEndDate(popupCourseSession.session.startDate, dayNum);

                            if (val && typeof val === 'object') {
                              theoryClassroom = val.theoryClassroom || val.classroom || theoryClassroom;
                              practiceArea = val.practiceArea || practiceArea;
                              if (val.date) {
                                dateStr = val.date;
                              }
                            }

                            return (
                              <div key={key} className="bg-white border border-slate-100 rounded-lg p-2.5 space-y-1 shadow-3xs">
                                <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-1 flex-row">
                                  <span className="font-extrabold text-slate-800 font-sans uppercase text-[10px] tracking-wide">
                                    Ngày {dayNum} — {formatDate(dateStr)}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-605 font-semibold pt-1">
                                  <div className="space-y-0.5 text-left">
                                    <span className="text-[8.5px] text-slate-405 uppercase tracking-wider block">Phòng học lý thuyết:</span>
                                    <span className="text-slate-805 font-bold block">{theoryClassroom}</span>
                                  </div>
                                  <div className="space-y-0.5 text-left">
                                    <span className="text-[8.5px] text-slate-405 uppercase tracking-wider block font-sans">Khu học thực hành:</span>
                                    <span className="text-slate-805 font-bold block font-sans">{practiceArea || '---'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
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
