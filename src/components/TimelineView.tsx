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
import { getMemberDepartments } from './MembershipInformation';

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
  onUpdateCourse?: (updatedCourse: Course) => void;
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

const getBaseInstructorName = (fullname: string): string => {
  if (!fullname) return '';
  return fullname.split(' (')[0].trim().toLowerCase();
};

const hasInstructorOverlap = (inst1: string, inst2: string): boolean => {
  if (!inst1 || !inst2) return false;
  const parts1 = inst1.split(/[,;]+/).map(p => getBaseInstructorName(p)).filter(Boolean);
  const parts2 = inst2.split(/[,;]+/).map(p => getBaseInstructorName(p)).filter(Boolean);
  return parts1.some(p1 => parts2.some(p2 => p1 === p2 || p1.includes(p2) || p2.includes(p1)));
};

export default function TimelineView({ 
  courses, 
  sessions, 
  onSelectCourse,
  onAddSession,
  onRemoveSession,
  onUpdateSession,
  onUpdateCourse,
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
  const [selCourseId, setSelCourseId] = useState<string>(courses[0]?.id || '');

  const uniqueCourseCodes = useMemo(() => {
    const codesSet = new Set<string>();
    courses.forEach(c => {
      if (c.code) {
        codesSet.add(c.code.trim().toUpperCase());
      }
    });
    sessions.forEach(session => {
      const course = courses.find(c => c.id === session.courseId);
      if (course && course.code) {
        codesSet.add(course.code.trim().toUpperCase());
      }
    });
    return Array.from(codesSet).sort();
  }, [sessions, courses]);

  const courseCodeToColor = useMemo(() => {
    const mapping: Record<string, string> = {};
    const palettes = [
      'bg-indigo-50 border-indigo-250 text-indigo-900 font-bold shadow-xs',
      'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-xs',
      'bg-teal-50 border-teal-250 text-teal-900 font-bold shadow-xs',
      'bg-rose-50 border-rose-250 text-rose-900 font-bold shadow-xs',
      'bg-violet-50 border-violet-250 text-violet-900 font-bold shadow-xs',
      'bg-emerald-50 border-emerald-250 text-emerald-950 font-bold shadow-xs',
      'bg-fuchsia-50 border-fuchsia-250 text-fuchsia-950 font-bold shadow-xs',
      'bg-cyan-50 border-cyan-250 text-cyan-950 font-bold shadow-xs',
      'bg-sky-50 border-sky-250 text-sky-900 font-bold shadow-xs',
      'bg-lime-50 border-lime-300 text-lime-950 font-bold shadow-xs',
      'bg-pink-50 border-pink-250 text-pink-900 font-bold shadow-xs',
      'bg-orange-50 border-orange-200 text-orange-950 font-bold shadow-xs',
      'bg-blue-50 border-blue-250 text-blue-900 font-bold shadow-xs',
      'bg-yellow-50 border-yellow-300 text-yellow-950 font-bold shadow-xs',
      'bg-red-50 border-red-250 text-red-950 font-bold shadow-xs',
      'bg-slate-100 border-slate-300 text-slate-900 font-bold shadow-xs',
      'bg-indigo-100/80 border-indigo-300 text-indigo-950 font-bold shadow-xs',
      'bg-teal-100/80 border-teal-300 text-teal-950 font-bold shadow-xs',
      'bg-rose-100/80 border-rose-300 text-rose-950 font-bold shadow-xs',
      'bg-violet-100/80 border-violet-300 text-violet-950 font-bold shadow-xs',
      'bg-emerald-100/80 border-emerald-300 text-emerald-950 font-bold shadow-xs',
      'bg-sky-100/80 border-sky-300 text-sky-950 font-bold shadow-xs',
      'bg-orange-100/80 border-orange-300 text-orange-950 font-bold shadow-xs',
      'bg-fuchsia-100/80 border-fuchsia-300 text-fuchsia-950 font-bold shadow-xs',
    ];

    uniqueCourseCodes.forEach((code, index) => {
      mapping[code] = palettes[index % palettes.length];
    });

    return mapping;
  }, [uniqueCourseCodes]);

  const formatAssignmentStrings = (rawStrings: string[]): string[] => {
    // Separate T.FOET special strings ending with GV or gv (case insensitive)
    const tfoetStrings = rawStrings.filter(str => str.toUpperCase().includes('T.FOET') && str.toLowerCase().endsWith(', gv'));
    const otherStrings = rawStrings.filter(str => !(str.toUpperCase().includes('T.FOET') && str.toLowerCase().endsWith(', gv')));

    const parsed = otherStrings.map(str => {
      const cleanStr = str.replace(/[()]/g, '');
      const parts = cleanStr.split(', ');
      const courseCode = parts[0];
      const role = parts[1] || '';
      return { courseCode, role };
    });

    const courseToRoles: Record<string, string[]> = {};
    parsed.forEach(({ courseCode, role }) => {
      if (!courseToRoles[courseCode]) {
        courseToRoles[courseCode] = [];
      }
      if (!courseToRoles[courseCode].includes(role)) {
        courseToRoles[courseCode].push(role);
      }
    });

    const rolesToCourses: Record<string, string[]> = {};
    Object.entries(courseToRoles).forEach(([courseCode, roles]) => {
      const sortedRolesKey = [...roles].sort().join(' + ');
      if (!rolesToCourses[sortedRolesKey]) {
        rolesToCourses[sortedRolesKey] = [];
      }
      rolesToCourses[sortedRolesKey].push(courseCode);
    });

    const formatted: string[] = [];
    Object.entries(rolesToCourses).forEach(([rolesKey, courses]) => {
      const rolesList = rolesKey.split(' + ');
      if (rolesList.length > 1) {
        if (courses.length > 1) {
          formatted.push(`${rolesKey}, ${courses.join(' + ')}`);
        } else {
          formatted.push(`${courses[0]}, ${rolesKey}`);
        }
      } else {
        courses.forEach(c => {
          formatted.push(`${c}, ${rolesKey}`);
        });
      }
    });
    return [...formatted, ...tfoetStrings];
  };

  const getCourseBadgeColor = (assign: string): string => {
    // Extract the full class/course code from the assignment string, e.g. "K68 OSI" or "OSI"
    const classKey = assign.split(',')[0].trim().toUpperCase();
    
    // Find matching course code in courses list
    const matchedCourse = courses.find(c => c.code && classKey.includes(c.code.toUpperCase()));
    const courseCodeKey = matchedCourse ? matchedCourse.code.toUpperCase() : classKey;

    if (courseCodeToColor[courseCodeKey]) {
      return courseCodeToColor[courseCodeKey];
    }

    // Fallback: simple hash coloring if not found
    const fallbackPalettes = [
      'bg-indigo-50 border-indigo-250 text-indigo-900 font-bold shadow-xs',
      'bg-amber-50 border-amber-300 text-amber-950 font-bold shadow-xs',
      'bg-teal-50 border-teal-250 text-teal-900 font-bold shadow-xs',
      'bg-rose-50 border-rose-250 text-rose-900 font-bold shadow-xs',
      'bg-violet-50 border-violet-250 text-violet-900 font-bold shadow-xs',
      'bg-emerald-50 border-emerald-250 text-emerald-950 font-bold shadow-xs',
      'bg-fuchsia-50 border-fuchsia-250 text-fuchsia-950 font-bold shadow-xs',
      'bg-cyan-50 border-cyan-250 text-cyan-950 font-bold shadow-xs',
      'bg-sky-50 border-sky-250 text-sky-900 font-bold shadow-xs',
      'bg-lime-50 border-lime-300 text-lime-950 font-bold shadow-xs',
      'bg-pink-50 border-pink-250 text-pink-900 font-bold shadow-xs',
    ];

    const getHashCode = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(hash);
    };

    const hashValue = getHashCode(courseCodeKey);
    return fallbackPalettes[hashValue % fallbackPalettes.length];
  };

  const sortedTrackingMembers = useMemo(() => {
    const allowedDepts = [
      'Ban Giám đốc',
      'Tổ đào tạo',
      'Tổ Thiết bị',
      'Tổ hành chính'
    ];

    const getPrimaryDeptIndex = (m: Member): number => {
      const depts = getMemberDepartments(m);
      for (let i = 0; i < allowedDepts.length; i++) {
        if (depts.includes(allowedDepts[i])) {
          return i;
        }
      }
      return -1;
    };

    const getPositionRank = (pos: string): number => {
      const p = (pos || '').trim().toLowerCase();
      if (p === 'giám đốc') return 100;
      if (p === 'phó giám đốc') return 90;
      if (p === 'tổ trưởng') return 80;
      if (p === 'giảng viên') return 70;
      if (p === 'nhân viên hỗ trợ') return 60;
      if (p === 'nhân viên hành chính') return 50;
      
      if (p.includes('giám đốc')) return 100;
      if (p.includes('phó')) return 90;
      if (p.includes('quản lý')) return 85;
      if (p.includes('tổ trưởng') || p.includes('trưởng nhóm')) return 80;
      if (p.includes('giảng viên')) return 70;
      if (p.includes('hỗ trợ')) return 60;
      if (p.includes('hành chính')) return 50;
      return 0;
    };

    // Calculate dates of the active tracking week based on trackingBaseDate
    const dateCopy = new Date(trackingBaseDate);
    const dayOfWeek = dateCopy.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    dateCopy.setDate(dateCopy.getDate() + diffToMonday);
    
    const weekStart = new Date(dateCopy);
    const weekEnd = new Date(dateCopy);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const startStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
    const endStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
    
    // Check if there are any sessions in this week with "T.FOET"
    const hasTfoetInWeek = sessions.some(session => {
      const overlaps = session.startDate <= endStr && session.endDate >= startStr;
      if (!overlaps) return false;
      
      const course = courses.find(c => c.id === session.courseId);
      if (!course) return false;
      
      const isTfoetCourse = !!(
        course.code?.toUpperCase().includes('T.FOET') || 
        course.title?.toUpperCase().includes('T.FOET')
      );
      return isTfoetCourse;
    });

    // Check if currently-selected course in modal is T.FOET
    const selectedCourseInModal = courses.find(c => c.id === selCourseId);
    const isModalTfoet = !!(selectedCourseInModal && (
      selectedCourseInModal.code?.toUpperCase().includes('T.FOET') ||
      selectedCourseInModal.title?.toUpperCase().includes('T.FOET')
    ));

    const bypassDepartmentFilter = hasTfoetInWeek || isModalTfoet;

    return members
      .filter(m => {
        const isCreator = m.id === 'mem-creator' || 
                          m.email.toLowerCase() === 'setcadmin' || 
                          m.email.toLowerCase() === 'setcadmin@safetycentre.org';
        if (isCreator) return false;

        if (bypassDepartmentFilter) return true;

        // Do not display if they don't belong to any of the allowed departments
        // This automatically excludes "Tổ Marketing" and "Bãi chữa cháy" unless they also have an allowed department
        const primaryIdx = getPrimaryDeptIndex(m);
        return primaryIdx !== -1;
      })
      .sort((a, b) => {
        // Sort by primary department index first
        const idxA = getPrimaryDeptIndex(a);
        const idxB = getPrimaryDeptIndex(b);
        if (idxA !== idxB) {
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        }

        // Sort by position rank
        const rankA = getPositionRank(a.position);
        const rankB = getPositionRank(b.position);
        if (rankA !== rankB) {
          return rankB - rankA;
        }

        // Sort by DOB (oldest first, age descending)
        const timeA = a.dob ? new Date(a.dob).getTime() : Infinity;
        const timeB = b.dob ? new Date(b.dob).getTime() : Infinity;
        if (timeA !== timeB) {
          return timeA - timeB;
        }

        // Sort by name alphabetically in Vietnamese
        return a.name.localeCompare(b.name, 'vi');
      });
  }, [members, sessions, courses, trackingBaseDate, selCourseId]);

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

      const isTFoetCourse = !!(
        course.code?.toUpperCase().includes('T.FOET') || 
        course.title?.toUpperCase().includes('T.FOET')
      );

      const lowerMemberName = member.name.trim().toLowerCase();

      if (isTFoetCourse && session.subModules) {
        // T.FOET submodules custom periods logic
        // "Các học phần đều được tính là 2 tiết, học phần FA được tính là 1 tiết"
        Object.keys(session.subModules).forEach(subModuleName => {
          const val = session.subModules?.[subModuleName];
          if (val && typeof val === 'object' && val.date === dateStr) {
            const subModuleSessionType = val.sessionType || '';
            const subModuleStartTime = val.startTime || '08:00';
            const subModuleEndTime = val.endTime || '16:30';
            const overlapsMorning = subModuleStartTime < '12:00';
            const overlapsAfternoon = subModuleEndTime > '12:00' || subModuleStartTime >= '12:00';

            let isMorningGv = false;
            let isAfternoonGv = false;

            const subModuleMorningInstructors: string[] = val.morningInstructors || [];
            const subModuleAfternoonInstructors: string[] = val.afternoonInstructors || [];
            const subModuleInstructor: string | null = val.instructor || null;

            if (overlapsMorning) {
              if (subModuleMorningInstructors.length > 0) {
                const morningInsts = subModuleMorningInstructors.map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
                if (morningInsts.includes(lowerMemberName)) {
                  isMorningGv = true;
                }
              } else if (subModuleInstructor) {
                const insts = subModuleInstructor.split(/[,;]+/).map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
                if (insts.includes(lowerMemberName)) {
                  isMorningGv = true;
                }
              }
            }

            if (overlapsAfternoon) {
              if (subModuleAfternoonInstructors.length > 0) {
                const afternoonInsts = subModuleAfternoonInstructors.map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
                if (afternoonInsts.includes(lowerMemberName)) {
                  isAfternoonGv = true;
                }
              } else if (subModuleInstructor) {
                const insts = subModuleInstructor.split(/[,;]+/).map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
                if (insts.includes(lowerMemberName)) {
                  isAfternoonGv = true;
                }
              }
            }

            const submodulePeriod = subModuleName.toUpperCase() === 'FA' ? 1 : 2;

            if (subModuleSessionType === 'Sáng') {
              if (isMorningGv) {
                totalMorningPeriods += submodulePeriod;
              }
            } else if (subModuleSessionType === 'Chiều') {
              if (isAfternoonGv) {
                totalAfternoonPeriods += submodulePeriod;
              }
            } else {
              // Cả ngày or default
              if (isMorningGv && isAfternoonGv) {
                totalMorningPeriods += submodulePeriod / 2;
                totalAfternoonPeriods += submodulePeriod / 2;
              } else if (isMorningGv) {
                totalMorningPeriods += submodulePeriod;
              } else if (isAfternoonGv) {
                totalAfternoonPeriods += submodulePeriod;
              }
            }
          }
        });
        return; // Skip normal session handling
      }

      let subModuleFound = false;
      let subModuleInstructor: string | null = null;
      let subModuleMorningInstructors: string[] = [];
      let subModuleAfternoonInstructors: string[] = [];
      let subModuleStartTime = session.startTime;
      let subModuleEndTime = session.endTime;

      if (session.subModules) {
        Object.keys(session.subModules).forEach(key => {
          const val = session.subModules?.[key];
          if (val && typeof val === 'object') {
            if (val.date === dateStr) {
              subModuleFound = true;
              subModuleInstructor = val.instructor;
              subModuleMorningInstructors = val.morningInstructors || [];
              subModuleAfternoonInstructors = val.afternoonInstructors || [];
              if (val.startTime) subModuleStartTime = val.startTime;
              if (val.endTime) subModuleEndTime = val.endTime;
            }
          }
        });
      }

      const overlapsMorning = subModuleStartTime < '12:00';
      const overlapsAfternoon = subModuleEndTime > '12:00' || subModuleStartTime >= '12:00';

      let isMorningGv = false;
      let isAfternoonGv = false;

      if (subModuleFound) {
        // Morning check
        if (overlapsMorning) {
          if (subModuleMorningInstructors.length > 0) {
            const morningInsts = subModuleMorningInstructors.map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
            if (morningInsts.includes(lowerMemberName)) {
              isMorningGv = true;
            }
          } else if (subModuleInstructor) {
            const insts = subModuleInstructor.split(/[,;]+/).map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
            if (insts.includes(lowerMemberName)) {
              isMorningGv = true;
            }
          }
        }
        // Afternoon check
        if (overlapsAfternoon) {
          if (subModuleAfternoonInstructors.length > 0) {
            const afternoonInsts = subModuleAfternoonInstructors.map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
            if (afternoonInsts.includes(lowerMemberName)) {
              isAfternoonGv = true;
            }
          } else if (subModuleInstructor) {
            const insts = subModuleInstructor.split(/[,;]+/).map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
            if (insts.includes(lowerMemberName)) {
              isAfternoonGv = true;
            }
          }
        }
      } else {
        if (session.instructor) {
          const insts = session.instructor.split(/[,;]+/).map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
          if (insts.includes(lowerMemberName)) {
            if (overlapsMorning) isMorningGv = true;
            if (overlapsAfternoon) isAfternoonGv = true;
          }
        }
      }

      if (!isMorningGv && !isAfternoonGv) return;

      const totalPeriods = course.periods !== undefined ? course.periods : 8;
      const duration = course.durationDays || 1;
      const dailyPeriods = totalPeriods / duration;

      if (isMorningGv && isAfternoonGv) {
        totalMorningPeriods += dailyPeriods / 2;
        totalAfternoonPeriods += dailyPeriods / 2;
      } else if (isMorningGv) {
        totalMorningPeriods += dailyPeriods;
      } else if (isAfternoonGv) {
        totalAfternoonPeriods += dailyPeriods;
      }
    });

    let roundedMorning = 0;
    if (totalMorningPeriods > 0) {
      roundedMorning = Math.max(1, Math.round(totalMorningPeriods));
    }
    let roundedAfternoon = 0;
    if (totalAfternoonPeriods > 0) {
      roundedAfternoon = Math.max(1, Math.round(totalAfternoonPeriods));
    }

    const cappedMorning = Math.min(4, roundedMorning);
    const cappedAfternoon = Math.min(4, roundedAfternoon);
    return Math.min(8, cappedMorning + cappedAfternoon);
  };

  const calculateWeeklyStats = (member: Member) => {
    let tgCount = 0;
    let taCount = 0;
    let ttCount = 0;

    trackingDays.forEach(date => {
      const dateStr = getLocalDateString(date);
      const morningAssignments = findAssignments(member, dateStr, 'Sáng');
      const afternoonAssignments = findAssignments(member, dateStr, 'Chiều');
      const dayPeriods = calculateTeachingPeriods(member, dateStr);
      ttCount += dayPeriods;

      morningAssignments.forEach(assign => {
        const lowerAssign = assign.toLowerCase();
        if (lowerAssign.endsWith(', tg') || lowerAssign.endsWith(', (tg)')) {
          tgCount += 1;
        } else if (lowerAssign.endsWith(', ta') || lowerAssign.endsWith(', (ta)')) {
          taCount += 1;
        }
      });

      afternoonAssignments.forEach(assign => {
        const lowerAssign = assign.toLowerCase();
        if (lowerAssign.endsWith(', tg') || lowerAssign.endsWith(', (tg)')) {
          tgCount += 1;
        } else if (lowerAssign.endsWith(', ta') || lowerAssign.endsWith(', (ta)')) {
          taCount += 1;
        }
      });
    });

    return {
      tgTotal: tgCount,
      taTotal: taCount * 2,
      ttTotal: ttCount
    };
  };

  const findAssignments = (member: Member, dateStr: string, halfDay: 'Sáng' | 'Chiều'): string[] => {
    const assignments: string[] = [];
    
    sessions.forEach(session => {
      const course = courses.find(c => c.id === session.courseId);
      const courseCode = course ? course.code : 'N/A';
      
      const isDateInSessionRange = dateStr >= session.startDate && dateStr <= session.endDate;
      if (!isDateInSessionRange) return;

      // Check overall session level sessionType
      const sessionType = session.sessionType || '';
      if (sessionType === 'Sáng' && halfDay === 'Chiều') return;
      if (sessionType === 'Chiều' && halfDay === 'Sáng') return;

      const isTFoetCourse = !!(course && (
        course.code?.toUpperCase().includes('T.FOET') || 
        course.title?.toUpperCase().includes('T.FOET')
      ));

      const lowerMemberName = member.name.trim().toLowerCase();

      if (isTFoetCourse) {
        const assignedGvSubModules: string[] = [];
        let isTa = false;
        let isTg = false;

        if (session.subModules) {
          Object.keys(session.subModules).forEach(subModuleName => {
            const val = session.subModules?.[subModuleName];
            if (val && typeof val === 'object' && val.date === dateStr) {
              const subModuleSessionType = val.sessionType || '';
              if (subModuleSessionType === 'Sáng' && halfDay === 'Chiều') return;
              if (subModuleSessionType === 'Chiều' && halfDay === 'Sáng') return;

              const subModuleStartTime = val.startTime || session.startTime;
              const subModuleEndTime = val.endTime || session.endTime;
              const overlapsMorning = subModuleStartTime < '12:00';
              const overlapsAfternoon = subModuleEndTime > '12:00' || subModuleStartTime >= '12:00';

              if (halfDay === 'Sáng' && !overlapsMorning) return;
              if (halfDay === 'Chiều' && !overlapsAfternoon) return;

              // 1. GV check
              let isGv = false;
              const subModuleMorningInstructors: string[] = val.morningInstructors || [];
              const subModuleAfternoonInstructors: string[] = val.afternoonInstructors || [];
              const subModuleInstructor: string | null = val.instructor || null;

              if (halfDay === 'Sáng' && subModuleMorningInstructors.length > 0) {
                const morningInsts = subModuleMorningInstructors.map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
                if (morningInsts.includes(lowerMemberName)) {
                  isGv = true;
                }
              } else if (halfDay === 'Chiều' && subModuleAfternoonInstructors.length > 0) {
                const afternoonInsts = subModuleAfternoonInstructors.map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
                if (afternoonInsts.includes(lowerMemberName)) {
                  isGv = true;
                }
              } else if (subModuleInstructor) {
                const insts = subModuleInstructor.split(/[,;]+/).map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
                if (insts.includes(lowerMemberName)) {
                  isGv = true;
                }
              }

              if (isGv) {
                assignedGvSubModules.push(subModuleName);
              }

              // 2. TA check
              let resolvedTas: string[] = [];
              const subModuleMorningTas: string[] = (val as any).morningTaOfficers || [];
              const subModuleAfternoonTas: string[] = (val as any).afternoonTaOfficers || [];
              const subModuleTaStr = val.taOfficer || null;
              const subModuleTasArr = val.taOfficers || [];

              const hasSplitTas = subModuleMorningTas.length > 0 || subModuleAfternoonTas.length > 0;
              if (hasSplitTas) {
                if (halfDay === 'Sáng') {
                  resolvedTas = subModuleMorningTas.map(t => t.trim().toLowerCase()).filter(Boolean);
                } else {
                  resolvedTas = subModuleAfternoonTas.map(t => t.trim().toLowerCase()).filter(Boolean);
                }
              } else {
                if (subModuleTaStr) {
                  resolvedTas = subModuleTaStr.split(/[,;]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
                } else if (subModuleTasArr.length > 0) {
                  resolvedTas = subModuleTasArr.map(t => t.trim().toLowerCase()).filter(Boolean);
                }
              }
              if (resolvedTas.includes(lowerMemberName)) {
                isTa = true;
              }

              // 3. TG check
              let resolvedTgs: string[] = [];
              const subModuleMorningTgs: string[] = (val as any).morningTgOfficers || [];
              const subModuleAfternoonTgs: string[] = (val as any).afternoonTgOfficers || [];
              const subModuleTgStr = val.tgOfficer || null;
              const subModuleTgsArr = val.tgOfficers || [];

              const hasSplitTgs = subModuleMorningTgs.length > 0 || subModuleAfternoonTgs.length > 0;
              if (hasSplitTgs) {
                if (halfDay === 'Sáng') {
                  resolvedTgs = subModuleMorningTgs.map(t => t.trim().toLowerCase()).filter(Boolean);
                } else {
                  resolvedTgs = subModuleAfternoonTgs.map(t => t.trim().toLowerCase()).filter(Boolean);
                }
              } else {
                if (subModuleTgStr) {
                  resolvedTgs = subModuleTgStr.split(/[,;]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
                } else if (subModuleTgsArr.length > 0) {
                  resolvedTgs = subModuleTgsArr.map(t => t.trim().toLowerCase()).filter(Boolean);
                }
              }
              if (resolvedTgs.includes(lowerMemberName)) {
                isTg = true;
              }
            }
          });
        } else {
          // Fallback to session level if there are no subModules
          if (session.instructor) {
            const insts = session.instructor.split(/[,;]+/).map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
            if (insts.includes(lowerMemberName)) {
              assignedGvSubModules.push('T.FOET');
            }
          }
          if (session.taOfficer) {
            const tas = session.taOfficer.split(/[,;]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
            if (tas.includes(lowerMemberName)) {
              isTa = true;
            }
          }
          if (session.tgOfficer) {
            const tgs = session.tgOfficer.split(/[,;]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
            if (tgs.includes(lowerMemberName)) {
              isTg = true;
            }
          }
        }

        const sCode = session.sessionCode ? session.sessionCode.trim() : '';
        const baseName = sCode && sCode !== 'N/A' ? `${sCode} ${courseCode}` : courseCode;

        if (assignedGvSubModules.length > 0) {
          const assignedModulesStr = assignedGvSubModules.join(', ');
          assignments.push(`${baseName}, ${assignedModulesStr}, GV`);
        }
        if (isTa) {
          assignments.push(`${baseName}, TA`);
        }
        if (isTg) {
          assignments.push(`${baseName}, TG`);
        }

        return; // Proceed to next session
      }

      let subModuleFound = false;
      let subModuleInstructor: string | null = null;
      let subModuleMorningInstructors: string[] = [];
      let subModuleAfternoonInstructors: string[] = [];
      let subModuleTaStr: string | null = null;
      let subModuleTgStr: string | null = null;
      let subModuleTas: string[] = [];
      let subModuleTgs: string[] = [];
      let subModuleMorningTgs: string[] = [];
      let subModuleAfternoonTgs: string[] = [];
      let subModuleMorningTas: string[] = [];
      let subModuleAfternoonTas: string[] = [];
      let subModuleStartTime = session.startTime;
      let subModuleEndTime = session.endTime;
      let subModuleSessionType = '';

      if (session.subModules) {
        Object.keys(session.subModules).forEach(key => {
          const val = session.subModules?.[key];
          if (val && typeof val === 'object') {
            if (val.date === dateStr) {
              subModuleFound = true;
              subModuleInstructor = val.instructor;
              subModuleMorningInstructors = val.morningInstructors || [];
              subModuleAfternoonInstructors = val.afternoonInstructors || [];
              subModuleTaStr = val.taOfficer || null;
              subModuleTgStr = val.tgOfficer || null;
              subModuleTas = val.taOfficers || [];
              subModuleTgs = val.tgOfficers || [];
              subModuleMorningTgs = (val as any).morningTgOfficers || [];
              subModuleAfternoonTgs = (val as any).afternoonTgOfficers || [];
              subModuleMorningTas = (val as any).morningTaOfficers || [];
              subModuleAfternoonTas = (val as any).afternoonTaOfficers || [];
              if (val.startTime) subModuleStartTime = val.startTime;
              if (val.endTime) subModuleEndTime = val.endTime;
              if (val.sessionType) subModuleSessionType = val.sessionType;
            }
          }
        });
      }

      // If subModules exist but none found for this day, then no class is scheduled on this day
      if (session.subModules && Object.keys(session.subModules).length > 0 && !subModuleFound) {
        return;
      }

      // Check subModule sessionType overrides
      if (subModuleFound && subModuleSessionType) {
        if (subModuleSessionType === 'Sáng' && halfDay === 'Chiều') return;
        if (subModuleSessionType === 'Chiều' && halfDay === 'Sáng') return;
      }

      const overlapsMorning = subModuleStartTime < '12:00';
      const overlapsAfternoon = subModuleEndTime > '12:00' || subModuleStartTime >= '12:00';
      
      if (halfDay === 'Sáng' && !overlapsMorning) return;
      if (halfDay === 'Chiều' && !overlapsAfternoon) return;

      let roles: string[] = [];

      if (subModuleFound) {
        // GV
        if (halfDay === 'Sáng' && subModuleMorningInstructors.length > 0) {
          const morningInsts = subModuleMorningInstructors.map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
          if (morningInsts.includes(lowerMemberName)) {
            roles.push('GV');
          }
        } else if (halfDay === 'Chiều' && subModuleAfternoonInstructors.length > 0) {
          const afternoonInsts = subModuleAfternoonInstructors.map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
          if (afternoonInsts.includes(lowerMemberName)) {
            roles.push('GV');
          }
        } else if (subModuleInstructor) {
          const insts = subModuleInstructor.split(/[,;]+/).map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
          if (insts.includes(lowerMemberName)) {
            roles.push('GV');
          }
        }
        
        // TA (Phụ giảng)
        let resolvedTas: string[] = [];
        const hasSplitTas = subModuleMorningTas.length > 0 || subModuleAfternoonTas.length > 0;
        if (hasSplitTas) {
          if (halfDay === 'Sáng') {
            resolvedTas = subModuleMorningTas.map(t => t.trim().toLowerCase()).filter(Boolean);
          } else {
            resolvedTas = subModuleAfternoonTas.map(t => t.trim().toLowerCase()).filter(Boolean);
          }
        } else {
          if (subModuleTaStr) {
            resolvedTas = subModuleTaStr.split(/[,;]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
          } else if (subModuleTas.length > 0) {
            resolvedTas = subModuleTas.map(t => t.trim().toLowerCase()).filter(Boolean);
          }
        }
        if (resolvedTas.includes(lowerMemberName)) {
          roles.push('TA');
        }

        // TG (Trợ giảng)
        let resolvedTgs: string[] = [];
        const hasSplitTgs = subModuleMorningTgs.length > 0 || subModuleAfternoonTgs.length > 0;
        if (hasSplitTgs) {
          if (halfDay === 'Sáng') {
            resolvedTgs = subModuleMorningTgs.map(t => t.trim().toLowerCase()).filter(Boolean);
          } else {
            resolvedTgs = subModuleAfternoonTgs.map(t => t.trim().toLowerCase()).filter(Boolean);
          }
        } else {
          if (subModuleTgStr) {
            resolvedTgs = subModuleTgStr.split(/[,;]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
          } else if (subModuleTgs.length > 0) {
            resolvedTgs = subModuleTgs.map(t => t.trim().toLowerCase()).filter(Boolean);
          }
        }
        if (resolvedTgs.includes(lowerMemberName)) {
          roles.push('TG');
        }
      } else {
        // Fallback to session level only if there are no subModules
        if (session.instructor) {
          const insts = session.instructor.split(/[,;]+/).map(i => i.split(' (')[0].trim().toLowerCase()).filter(Boolean);
          if (insts.includes(lowerMemberName)) {
            roles.push('GV');
          }
        }
        
        if (session.taOfficer) {
          const tas = session.taOfficer.split(/[,;]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
          if (tas.includes(lowerMemberName)) {
            roles.push('TA');
          }
        }

        if (session.tgOfficer) {
          const tgs = session.tgOfficer.split(/[,;]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
          if (tgs.includes(lowerMemberName)) {
            roles.push('TG');
          }
        }
      }

      if (roles.length > 0) {
        roles.forEach(role => {
          const sCode = session.sessionCode ? session.sessionCode.trim() : '';
          if (sCode && sCode !== 'N/A') {
            assignments.push(`${sCode} ${courseCode}, ${role}`);
          } else {
            assignments.push(`${courseCode}, ${role}`);
          }
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

  const isSessionTFoet = !!(popupCourseSession && 
    (popupCourseSession.course.code?.toUpperCase().includes('T.FOET') || 
     popupCourseSession.course.title?.toUpperCase().includes('T.FOET')));

  const isSessionHseMultiDay = !!(popupCourseSession && 
    popupCourseSession.course.domain === 'HSE' && 
    popupCourseSession.course.durationDays && 
    popupCourseSession.course.durationDays > 1);

  const handleStartEditingSession = () => {
    if (!popupCourseSession) return;
    const { session, course } = popupCourseSession;

    setEditingSessionId(session.id);
    setSelCourseId(session.courseId);
    setAssignSessionCode(session.sessionCode || '');
    setAssignCourseCode(course.code || '');
    setAssignCourseName(course.title || '');
    setAssignStartDate(session.startDate);
    setAssignEndDate(session.endDate);
    setAssignMethod(session.method || 'Offline');
    setAssignInstructor(session.instructor);
    setAssignClassroom(session.classroom || '');
    setAssignCapacity(session.maxCapacity);
    setAssignNote(session.notes || '');
    setAssignTa(session.taOfficer || '');
    setAssignTg(session.tgOfficer || '');
    setAssignDomain(session.domain || 'HSE');
    setAssignStudentsCount(session.enrolledIds ? session.enrolledIds.length : 0);

    const newDays: CustomStudyDay[] = [];
    const duration = course.durationDays || 1;
    const isTFoetCourse = !!(course && 
      (course.code?.toUpperCase().includes('T.FOET') || 
       course.title?.toUpperCase().includes('T.FOET')));

    if (isTFoetCourse) {
      const tFoetModules = ["HUET", "SS", "FA", "FF.SR"];
      tFoetModules.forEach((mod, index) => {
        const val = session.subModules?.[mod];
        const insts = val?.instructor ? val.instructor.split(/[,;]+/).map((i: string) => i.trim()).filter(Boolean) : [];
        const tas = val?.taOfficer ? val.taOfficer.split(/[,;]+/).map((t: string) => t.trim()).filter(Boolean) : (val?.taOfficers || []);
        const mornTas = val?.morningTaOfficers || (tas.length > 0 ? [...tas] : []);
        const aftTas = val?.afternoonTaOfficers || (tas.length > 0 ? [...tas] : []);
        
        newDays.push({
          id: `tfoet-edit-${mod}-${Date.now()}-${Math.random()}`,
          date: val?.date || calculateEndDate(session.startDate, index + 1),
          instructors: insts,
          morningInstructors: insts,
          afternoonInstructors: insts,
          taOfficers: tas,
          morningTaOfficers: mornTas,
          afternoonTaOfficers: aftTas,
          tgOfficers: [],
          morningTgOfficers: [],
          afternoonTgOfficers: [],
          startTime: val?.startTime || '08:00',
          endTime: val?.endTime || '16:30',
          classroom: val?.classroom || session.classroom || '',
          moduleName: mod,
          sessionType: val?.sessionType || ((val?.startTime === '08:00' && val?.endTime === '12:00') ? 'Sáng' : (val?.startTime === '13:00' && val?.endTime === '16:30') ? 'Chiều' : 'Cả ngày')
        });
      });
    } else if (session.subModules && Object.keys(session.subModules).length > 0) {
      const keys = Object.keys(session.subModules).sort((a, b) => {
        const numA = parseInt(a.replace('Day ', '')) || 0;
        const numB = parseInt(b.replace('Day ', '')) || 0;
        return numA - numB;
      });
      keys.forEach((key, index) => {
        const val = session.subModules?.[key];
        if (val) {
          const insts = val.instructor ? val.instructor.split(/[,;]+/).map(i => i.trim()).filter(Boolean) : [];
          const tas = val.taOfficer ? val.taOfficer.split(/[,;]+/).map(t => t.trim()).filter(Boolean) : (val.taOfficers || []);
          const mornTas = val.morningTaOfficers || (tas.length > 0 ? [...tas] : []);
          const aftTas = val.afternoonTaOfficers || (tas.length > 0 ? [...tas] : []);
          const tgs = val.tgOfficer ? val.tgOfficer.split(/[,;]+/).map(t => t.trim()).filter(Boolean) : (val.tgOfficers || []);
          newDays.push({
            id: `day-edit-${index}-${Date.now()}-${Math.random()}`,
            date: val.date || calculateEndDate(session.startDate, index + 1),
            instructors: insts,
            morningInstructors: val.morningInstructors || (insts.length > 0 ? [...insts] : []),
            afternoonInstructors: val.afternoonInstructors || (insts.length > 0 ? [...insts] : []),
            taOfficers: tas,
            morningTaOfficers: mornTas,
            afternoonTaOfficers: aftTas,
            tgOfficers: tgs,
            morningTgOfficers: (val as any).morningTgOfficers || (tgs.length > 0 ? [...tgs] : []),
            afternoonTgOfficers: (val as any).afternoonTgOfficers || (tgs.length > 0 ? [...tgs] : []),
            startTime: val.startTime || session.startTime || '08:00',
            endTime: val.endTime || session.endTime || '16:30',
            classroom: val.classroom || session.classroom || '',
          });
        }
      });
    } else {
      for (let i = 1; i <= duration; i++) {
        const insts = session.instructor ? session.instructor.split(/[,;]+/).map(i => i.trim()).filter(Boolean) : [];
        const tas = session.taOfficer ? session.taOfficer.split(/[,;]+/).map(t => t.trim()).filter(Boolean) : [];
        newDays.push({
          id: `day-edit-${i}-${Date.now()}-${Math.random()}`,
          date: calculateEndDate(session.startDate, i),
          instructors: insts,
          morningInstructors: [...insts],
          afternoonInstructors: [...insts],
          taOfficers: tas,
          morningTaOfficers: [...tas],
          afternoonTaOfficers: [...tas],
          tgOfficers: session.tgOfficer ? session.tgOfficer.split(/[,;]+/).map(t => t.trim()).filter(Boolean) : [],
          morningTgOfficers: session.tgOfficer ? session.tgOfficer.split(/[,;]+/).map(t => t.trim()).filter(Boolean) : [],
          afternoonTgOfficers: session.tgOfficer ? session.tgOfficer.split(/[,;]+/).map(t => t.trim()).filter(Boolean) : [],
          startTime: session.startTime || '08:00',
          endTime: session.endTime || '16:30',
          classroom: session.classroom || '',
        });
      }
    }
    setCustomStudyDays(newDays);

    setIsAssignmentModalOpen(true);
    setPopupCourseSession(null);
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
        : (isSessionHseMultiDay
            ? Array.from(new Set(Object.values(editSubModules).map((v: any) => v.instructor).filter(Boolean))).join(', ') || editInstructor
            : editInstructor),
      classroom: editClassroom,
      maxCapacity: isNaN(editMaxCapacity) ? 20 : editMaxCapacity,
      taOfficer: isSessionHseMultiDay
        ? Array.from(new Set(Object.values(editSubModules).map((v: any) => v.taOfficer).filter(Boolean))).join(', ') || editTaOfficer
        : editTaOfficer,
      tgOfficer: isSessionHseMultiDay
        ? Array.from(new Set(Object.values(editSubModules).map((v: any) => v.tgOfficer).filter(Boolean))).join(', ') || editTgOfficer
        : editTgOfficer,
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
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [assignSessionCode, setAssignSessionCode] = useState<string>('');
  const [assignCourseCode, setAssignCourseCode] = useState<string>(courses[0]?.code || '');
  const [assignCourseName, setAssignCourseName] = useState<string>(courses[0]?.title || '');
  const [assignStartDate, setAssignStartDate] = useState<string>(getTodayString());
  const [assignEndDate, setAssignEndDate] = useState<string>('');
  const [assignTa, setAssignTa] = useState<string>('');
  const [assignTg, setAssignTg] = useState<string>('');
  const [assignMethod, setAssignMethod] = useState<'Online' | 'Offline'>('Offline');
  const [assignStudentsCount, setAssignStudentsCount] = useState<number>(0);
  const [assignInstructor, setAssignInstructor] = useState<string>('');
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

  // Custom Study Days dynamic states & handlers
  interface CustomStudyDay {
    id: string;
    date: string;
    instructors: string[];
    morningInstructors?: string[];
    afternoonInstructors?: string[];
    taOfficers: string[];
    morningTaOfficers?: string[];
    afternoonTaOfficers?: string[];
    tgOfficers: string[];
    morningTgOfficers?: string[];
    afternoonTgOfficers?: string[];
    startTime: string;
    endTime: string;
    classroom: string;
    moduleName?: string;
    sessionType?: 'Sáng' | 'Chiều' | 'Cả ngày';
  }

  const [customStudyDays, setCustomStudyDays] = useState<CustomStudyDay[]>([
    {
      id: 'day-initial',
      date: getTodayString(),
      instructors: [''],
      morningInstructors: [''],
      afternoonInstructors: [''],
      taOfficers: [],
      tgOfficers: [],
      morningTgOfficers: [],
      afternoonTgOfficers: [],
      startTime: '08:00',
      endTime: '16:30',
      classroom: ''
    }
  ]);

  const [prevSelCourseId, setPrevSelCourseId] = useState<string>('');
  const [prevAssignStartDate, setPrevAssignStartDate] = useState<string>('');

  const handleAddStudyDay = () => {
    let lastDate = getTodayString();
    if (customStudyDays.length > 0) {
      const lastDay = customStudyDays[customStudyDays.length - 1];
      lastDate = calculateEndDate(lastDay.date, 2); // next day
    }

    const defaultRoom = activeClassrooms?.[0]?.name || '';

    const newDay: CustomStudyDay = {
      id: `day-added-${Date.now()}-${Math.random()}`,
      date: lastDate,
      instructors: [''],
      morningInstructors: [''],
      afternoonInstructors: [''],
      taOfficers: [],
      tgOfficers: [],
      morningTgOfficers: [],
      afternoonTgOfficers: [],
      startTime: '08:00',
      endTime: '16:30',
      classroom: defaultRoom
    };
    setCustomStudyDays([...customStudyDays, newDay]);
  };

  const handleRemoveStudyDay = (id: string) => {
    if (customStudyDays.length <= 1) return;
    setCustomStudyDays(customStudyDays.filter(d => d.id !== id));
  };

  const handleUpdateStudyDay = (id: string, updates: Partial<CustomStudyDay>) => {
    setCustomStudyDays(prevDays => {
      const index = prevDays.findIndex(d => d.id === id);
      if (index === -1) return prevDays;

      const selected = courses.find(c => c.id === selCourseId);
      const isTFoetCourse = !!(selected && 
        (selected.code?.toUpperCase().includes('T.FOET') || 
         selected.title?.toUpperCase().includes('T.FOET')));

      // If it's a T.FOET course, changing the date of the first module (index === 0)
      // should update all other modules' dates to the same date.
      if (isTFoetCourse && index === 0 && updates.date !== undefined) {
        const targetDate = updates.date;
        return prevDays.map(d => ({
          ...d,
          ...(d.id === id ? updates : { date: targetDate })
        }));
      }

      return prevDays.map(d => {
        if (d.id === id) {
          const next = { ...d, ...updates };
          if (updates.morningTgOfficers || updates.afternoonTgOfficers) {
            const m = next.morningTgOfficers || [];
            const a = next.afternoonTgOfficers || [];
            next.tgOfficers = Array.from(new Set([...m, ...a])).filter(Boolean);
          }
          return next;
        }
        return d;
      });
    });
  };

  // Keep study days list initialized/updated when Course or Start Date changes
  useEffect(() => {
    if (isAssignmentModalOpen && !editingSessionId) {
      if (selCourseId !== prevSelCourseId || assignStartDate !== prevAssignStartDate) {
        setPrevSelCourseId(selCourseId);
        setPrevAssignStartDate(assignStartDate);
        
        const selected = courses.find(c => c.id === selCourseId);
        const duration = selected?.durationDays || 1;
        const isTFoetCourse = !!(selected && 
          (selected.code?.toUpperCase().includes('T.FOET') || 
           selected.title?.toUpperCase().includes('T.FOET')));

        const defaultRoom = activeClassrooms?.[0]?.name || '';

        const newDays: CustomStudyDay[] = [];
        if (isTFoetCourse) {
          const tFoetModules = ["HUET", "SS", "FA", "FF.SR"];
          tFoetModules.forEach((mod) => {
            newDays.push({
              id: `tfoet-${mod}-${Date.now()}-${Math.random()}`,
              date: assignStartDate,
              instructors: [''],
              morningInstructors: [''],
              afternoonInstructors: [''],
              taOfficers: [],
              tgOfficers: [],
              morningTgOfficers: [],
              afternoonTgOfficers: [],
              startTime: '08:00',
              endTime: '16:30',
              classroom: defaultRoom,
              moduleName: mod,
              sessionType: 'Cả ngày'
            });
          });
        } else {
          for (let i = 1; i <= duration; i++) {
            const computedDate = calculateEndDate(assignStartDate, i);
            newDays.push({
              id: `day-${i}-${Date.now()}-${Math.random()}`,
              date: computedDate,
              instructors: [''],
              morningInstructors: [''],
              afternoonInstructors: [''],
              taOfficers: [],
              tgOfficers: [],
              morningTgOfficers: [],
              afternoonTgOfficers: [],
              startTime: '08:00',
              endTime: '16:30',
              classroom: defaultRoom
            });
          }
        }
        setCustomStudyDays(newDays);
      }
    } else {
      setPrevSelCourseId('');
      setPrevAssignStartDate('');
    }
  }, [isAssignmentModalOpen, selCourseId, assignStartDate, members, activeClassrooms]);

  useEffect(() => {
    if (activeClassrooms && activeClassrooms.length > 0 && !assignClassroom) {
      setAssignClassroom(activeClassrooms[0].name);
    }
  }, [activeClassrooms, assignClassroom]);

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

  const isTFoet = !!(selectedCourse && 
    (selectedCourse.code?.toUpperCase().includes('T.FOET') || 
     selectedCourse.title?.toUpperCase().includes('T.FOET')));

  const [hseDaysData, setHseDaysData] = useState<Record<string, {
    date: string;
    theoryClassroom: string;
    practiceArea: string;
    instructor?: string;
    taOfficer?: string;
    tgOfficer?: string;
    startTime?: string;
    endTime?: string;
  }>>({});

  const isHseMultiDay = !!(selectedCourse && selectedCourse.domain === 'HSE' && selectedCourse.durationDays && selectedCourse.durationDays > 1);

  const currentStudyDaysConflicts = useMemo(() => {
    const list: {
      id: string;
      date: string;
      moduleName: string;
      personnel: string;
      classroom: string;
      role: string;
      conflictWith: string;
      message: string;
    }[] = [];

    const isOnlineNew = isOpitoBosiet ? false : (assignMethod === 'Online');

    customStudyDays.forEach((newDay, idx) => {
      const newDayDate = new Date(newDay.date);
      if (isNaN(newDayDate.getTime())) return;

      const newDayInstructors = Array.from(new Set([
        ...(newDay.instructors || []),
        ...(newDay.morningInstructors || []),
        ...(newDay.afternoonInstructors || [])
      ])).filter(Boolean);

      const newDayClassroom = newDay.classroom;
      const newDayStartHour = newDay.startTime || '08:00';
      const newDayEndHour = newDay.endTime || '16:30';
      const newDayTas = newDay.taOfficers || [];
      const newDayTgs = Array.from(new Set([
        ...(newDay.tgOfficers || []),
        ...(newDay.morningTgOfficers || []),
        ...(newDay.afternoonTgOfficers || [])
      ])).filter(Boolean);

      sessions.forEach(existing => {
        if (editingSessionId && existing.id === editingSessionId) return;
        
        // Check if existing session overlaps with this study day's date
        const exStart = new Date(existing.startDate);
        const exEnd = new Date(existing.endDate);
        const dateOverlaps = newDayDate >= exStart && newDayDate <= exEnd;
        if (!dateOverlaps) return;

        // Extract detail about existing session on this date
        let existingInstructor = existing.instructor;
        let existingClassroom = existing.classroom;
        let existingStartTime = existing.startTime;
        let existingEndTime = existing.endTime;
        let existingTa = existing.taOfficer || '';
        let existingTg = existing.tgOfficer || '';

        if (existing.subModules) {
          Object.keys(existing.subModules).forEach(key => {
            const val = existing.subModules?.[key];
            if (val && typeof val === 'object' && val !== null) {
              const obj = val as any;
              if (obj.date === newDay.date) {
                existingInstructor = obj.instructor || existingInstructor;
                existingClassroom = obj.classroom || obj.theoryClassroom || existingClassroom;
                existingStartTime = obj.startTime || existingStartTime;
                existingEndTime = obj.endTime || existingEndTime;
                if (obj.taOfficer) existingTa = obj.taOfficer;
                if (obj.tgOfficer) existingTg = obj.tgOfficer;
              }
            }
          });
        }

        // Time overlap check on this day
        const timesOverlap = newDayStartHour < existingEndTime && newDayEndHour > existingStartTime;
        if (!timesOverlap) return;

        const matchedCourse = courses.find(c => c.id === existing.courseId);
        const code = matchedCourse ? matchedCourse.code : 'Lớp học';
        const isOnlineExisting = existing.method === 'Online';

        // 1. Classroom check
        if (!isOnlineNew && !isOnlineExisting) {
          if (existingClassroom && newDayClassroom && existingClassroom === newDayClassroom) {
            list.push({
              id: `room-${existing.id}-${idx}`,
              date: formatDate(newDay.date),
              moduleName: newDay.moduleName || `Ngày ${idx + 1}`,
              personnel: '-',
              classroom: newDayClassroom,
              role: 'Phòng học',
              conflictWith: `${code} (${existingStartTime} - ${existingEndTime})`,
              message: `Phòng học "${newDayClassroom}" trùng lịch với lớp "${code}".`
            });
          }
        }

        // 2. Instructor check
        newDayInstructors.forEach(newDayInstructor => {
          if (newDayInstructor && existingInstructor && hasInstructorOverlap(newDayInstructor, existingInstructor)) {
            const conflictName = newDayInstructor.split(' (')[0];
            const isSameCourseName = selCourseId === existing.courseId || assignCourseCode === code;
            const isOneOrBothOnline = isOnlineNew || isOnlineExisting;
            if (!(isSameCourseName && isOneOrBothOnline)) {
              list.push({
                id: `inst-${existing.id}-${idx}-${newDayInstructor}`,
                date: formatDate(newDay.date),
                moduleName: newDay.moduleName || `Ngày ${idx + 1}`,
                personnel: conflictName,
                classroom: newDayClassroom || '-',
                role: 'Giảng viên',
                conflictWith: `${code} (${existingStartTime} - ${existingEndTime})`,
                message: `Giảng viên "${conflictName}" trùng lịch với lớp "${code}".`
              });
            }
          }
        });

        // 3. TA check
        if (!isOnlineNew && !isOnlineExisting && newDayTas.length > 0 && existingTa) {
          const existingTas = existingTa.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
          newDayTas.forEach(newDayTa => {
            const newTas = newDayTa.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
            const hasOverlap = newTas.some(nt => existingTas.some(et => nt.toLowerCase() === et.toLowerCase() || nt.toLowerCase().includes(et.toLowerCase()) || et.toLowerCase().includes(nt.toLowerCase())));
            if (hasOverlap) {
              list.push({
                id: `ta-${existing.id}-${idx}-${newDayTa}`,
                date: formatDate(newDay.date),
                moduleName: newDay.moduleName || `Ngày ${idx + 1}`,
                personnel: newDayTa,
                classroom: newDayClassroom || '-',
                role: 'Phụ giảng',
                conflictWith: `${code} (${existingStartTime} - ${existingEndTime})`,
                message: `Phụ giảng "${newDayTa}" trùng lịch với lớp Offline "${code}".`
              });
            }
          });
        }

        // 4. TG check
        if (!isOnlineNew && !isOnlineExisting && newDayTgs.length > 0 && existingTg) {
          const existingTgs = existingTg.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
          newDayTgs.forEach(newDayTg => {
            const newTgs = newDayTg.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
            const hasOverlap = newTgs.some(nt => existingTgs.some(et => nt.toLowerCase() === et.toLowerCase() || nt.toLowerCase().includes(et.toLowerCase()) || et.toLowerCase().includes(nt.toLowerCase())));
            if (hasOverlap) {
              list.push({
                id: `tg-${existing.id}-${idx}-${newDayTg}`,
                date: formatDate(newDay.date),
                moduleName: newDay.moduleName || `Ngày ${idx + 1}`,
                personnel: newDayTg,
                classroom: newDayClassroom || '-',
                role: 'Trợ giảng',
                conflictWith: `${code} (${existingStartTime} - ${existingEndTime})`,
                message: `Trợ giảng "${newDayTg}" trùng lịch với lớp Offline "${code}".`
              });
            }
          });
        }
      });
    });

    return list;
  }, [customStudyDays, sessions, editingSessionId, assignMethod, isOpitoBosiet, selCourseId, assignCourseCode, courses]);

  useEffect(() => {
    if (!selCourseId) return;
    const selected = courses.find(c => c.id === selCourseId);
    if (selected) {
      const duration = selected.durationDays || 1;
      const computedEnd = calculateEndDate(assignStartDate, duration);
      setAssignEndDate(computedEnd);

      if (selected.domain === 'HSE') {
        if (duration > 1) {
          const initialDays: Record<string, {
            date: string;
            theoryClassroom: string;
            practiceArea: string;
            instructor: string;
            taOfficer: string;
            tgOfficer: string;
            startTime: string;
            endTime: string;
          }> = {};
          for (let i = 1; i <= duration; i++) {
            const computedDate = calculateEndDate(assignStartDate, i);
            const key = `Day ${i}`;
            initialDays[key] = {
              date: computedDate,
              theoryClassroom: hseDaysData[key]?.theoryClassroom || assignClassroom || (activeClassrooms[0]?.name || ''),
              practiceArea: hseDaysData[key]?.practiceArea || '',
              instructor: hseDaysData[key]?.instructor || assignInstructor || '',
              taOfficer: hseDaysData[key]?.taOfficer || assignTa || '',
              tgOfficer: hseDaysData[key]?.tgOfficer || assignTg || '',
              startTime: hseDaysData[key]?.startTime || assignStartTime || '08:00',
              endTime: hseDaysData[key]?.endTime || assignEndTime || '16:30'
            };
          }
          setHseDaysData(initialDays);
        }
      }
    }
  }, [selCourseId, assignStartDate, assignClassroom, assignInstructor, assignTa, assignTg, assignStartTime, assignEndTime]);

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
          const existingSubModules = popupCourseSession.session.subModules || {};
          for (let i = 1; i <= duration; i++) {
            const key = `Day ${i}`;
            const computedDate = calculateEndDate(editStartDate, i);
            const existingDay = existingSubModules[key] || {};
            next[key] = {
              ...(next[key] || { 
                instructor: existingDay.instructor || editInstructor || "", 
                startTime: existingDay.startTime || editStartTime || "08:00", 
                endTime: existingDay.endTime || editEndTime || "16:30", 
                classroom: existingDay.classroom || existingDay.theoryClassroom || editClassroom || "",
                theoryClassroom: existingDay.theoryClassroom || existingDay.classroom || editClassroom || "",
                practiceArea: existingDay.practiceArea || "",
                taOfficer: existingDay.taOfficer || editTaOfficer || "",
                tgOfficer: existingDay.tgOfficer || editTgOfficer || ""
              }),
              date: computedDate,
              theoryClassroom: next[key]?.theoryClassroom || next[key]?.classroom || existingDay.theoryClassroom || existingDay.classroom || editClassroom || "",
              classroom: next[key]?.classroom || existingDay.classroom || existingDay.theoryClassroom || editClassroom || "",
              practiceArea: next[key]?.practiceArea || existingDay.practiceArea || "",
              instructor: next[key]?.instructor || existingDay.instructor || editInstructor || "",
              taOfficer: next[key]?.taOfficer || existingDay.taOfficer || editTaOfficer || "",
              tgOfficer: next[key]?.tgOfficer || existingDay.tgOfficer || editTgOfficer || "",
              startTime: next[key]?.startTime || existingDay.startTime || editStartTime || "08:00",
              endTime: next[key]?.endTime || existingDay.endTime || editEndTime || "16:30"
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

  const handlePublishAssignment = (e: FormEvent) => {
    e.preventDefault();
    setAssignFeedback(null);

    if (!selCourseId) {
      setAssignFeedback({ type: 'error', message: 'Vui lòng chọn một khóa học học thuật để bắt đầu.' });
      return;
    }

    if (customStudyDays.length === 0) {
      setAssignFeedback({ type: 'error', message: 'Vui lòng thêm ít nhất một ngày học.' });
      return;
    }

    if (customStudyDays.some(d => !d.date)) {
      setAssignFeedback({ type: 'error', message: 'Tất cả các ngày học yêu cầu điền đầy đủ Ngày học.' });
      return;
    }

    // Determine min and max dates
    const dates = customStudyDays.map(d => d.date).filter(Boolean);
    const sortedDates = [...dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const computedStartDate = sortedDates[0] || getTodayString();
    const computedEndDate = sortedDates[sortedDates.length - 1] || computedStartDate;

    const isOnlineNew = isOpitoBosiet ? false : (assignMethod === 'Online');
    const testConflicts: string[] = [];

    // Perform day-by-day conflict checking
    customStudyDays.forEach((newDay, idx) => {
      const newDayDate = new Date(newDay.date);
      if (isNaN(newDayDate.getTime())) return;

      const newDayInstructors = newDay.instructors || [];
      const newDayClassroom = newDay.classroom;
      const newDayStartHour = newDay.startTime || '08:00';
      const newDayEndHour = newDay.endTime || '16:30';
      const newDayTas = newDay.taOfficers || [];
      const newDayTgs = newDay.tgOfficers || [];

      sessions.forEach(existing => {
        if (editingSessionId && existing.id === editingSessionId) return;
        // Check if existing session overlaps with this study day's date
        const exStart = new Date(existing.startDate);
        const exEnd = new Date(existing.endDate);
        const dateOverlaps = newDayDate >= exStart && newDayDate <= exEnd;
        if (!dateOverlaps) return;

        // Check if existing session has a specific subModule on this exact date
        let existingInstructor = existing.instructor;
        let existingClassroom = existing.classroom;
        let existingStartTime = existing.startTime;
        let existingEndTime = existing.endTime;
        let existingTa = existing.taOfficer || '';
        let existingTg = existing.tgOfficer || '';

        if (existing.subModules) {
          Object.keys(existing.subModules).forEach(key => {
            const val = existing.subModules?.[key];
            if (val && typeof val === 'object' && val !== null) {
              const obj = val as any;
              if (obj.date === newDay.date) {
                existingInstructor = obj.instructor || existingInstructor;
                existingClassroom = obj.classroom || obj.theoryClassroom || existingClassroom;
                existingStartTime = obj.startTime || existingStartTime;
                existingEndTime = obj.endTime || existingEndTime;
                if (obj.taOfficer) existingTa = obj.taOfficer;
                if (obj.tgOfficer) existingTg = obj.tgOfficer;
              }
            }
          });
        }

        // Time overlap check on this day
        const timesOverlap = newDayStartHour < existingEndTime && newDayEndHour > existingStartTime;
        if (!timesOverlap) return;

        const matchedCourse = courses.find(c => c.id === existing.courseId);
        const code = matchedCourse ? matchedCourse.code : 'Lớp học';
        const isOnlineExisting = existing.method === 'Online';

        // 1. Classroom check
        if (!isOnlineNew && !isOnlineExisting) {
          if (existingClassroom && newDayClassroom && existingClassroom === newDayClassroom) {
            testConflicts.push(`Ngày ${idx + 1} (${formatDate(newDay.date)}): Phòng học "${newDayClassroom}" đã có lịch bởi lớp "${code}" (${existingStartTime} - ${existingEndTime}).`);
          }
        }

        // 2. Instructor check
        newDayInstructors.forEach(newDayInstructor => {
          if (newDayInstructor && existingInstructor && hasInstructorOverlap(newDayInstructor, existingInstructor)) {
            const conflictName = newDayInstructor.split(' (')[0];
            const isSameCourseName = selCourseId === existing.courseId || assignCourseCode === code || assignCourseName === (matchedCourse ? matchedCourse.title : '');
            const isOneOrBothOnline = isOnlineNew || isOnlineExisting;
            if (!(isSameCourseName && isOneOrBothOnline)) {
              testConflicts.push(`Ngày ${idx + 1} (${formatDate(newDay.date)}): Giảng viên "${conflictName}" trùng lịch với lớp "${code}" (${existingStartTime} - ${existingEndTime}).`);
            }
          }
        });

        // 3. TA check
        if (!isOnlineNew && !isOnlineExisting && newDayTas.length > 0 && existingTa) {
          const existingTas = existingTa.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
          newDayTas.forEach(newDayTa => {
            const newTas = newDayTa.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
            const hasOverlap = newTas.some(nt => existingTas.some(et => nt.toLowerCase() === et.toLowerCase() || nt.toLowerCase().includes(et.toLowerCase()) || et.toLowerCase().includes(nt.toLowerCase())));
            if (hasOverlap) {
              testConflicts.push(`Ngày ${idx + 1} (${formatDate(newDay.date)}): Phụ giảng "${newDayTa}" trùng lịch với lớp Offline "${code}".`);
            }
          });
        }

        // 4. TG check
        if (!isOnlineNew && !isOnlineExisting && newDayTgs.length > 0 && existingTg) {
          const existingTgs = existingTg.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
          newDayTgs.forEach(newDayTg => {
            const newTgs = newDayTg.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
            const hasOverlap = newTgs.some(nt => existingTgs.some(et => nt.toLowerCase() === et.toLowerCase() || nt.toLowerCase().includes(et.toLowerCase()) || et.toLowerCase().includes(nt.toLowerCase())));
            if (hasOverlap) {
              testConflicts.push(`Ngày ${idx + 1} (${formatDate(newDay.date)}): Trợ giảng "${newDayTg}" trùng lịch với lớp Offline "${code}".`);
            }
          });
        }
      });
    });

    let warningSuffix = "";
    if (testConflicts.length > 0) {
      warningSuffix = " (Lưu ý: Có lịch trùng lặp nhưng vẫn được xác nhận thành công)";
    }

    const allInstructors = customStudyDays.flatMap(d => {
      const morn = d.morningInstructors || [];
      const aft = d.afternoonInstructors || [];
      return [...morn, ...aft, ...d.instructors];
    });
    const sessionInstructor = Array.from(new Set(allInstructors)).filter(Boolean).join(', ') || 'Đội ngũ Giảng viên';
    const sessionClassroom = customStudyDays[0]?.classroom || '';
    const sessionStartTime = customStudyDays[0]?.startTime || '08:00';
    const sessionEndTime = customStudyDays[0]?.endTime || '16:30';
    const sessionTa = Array.from(new Set(customStudyDays.flatMap(d => d.taOfficers).filter(Boolean))).join(', ') || undefined;
    const sessionTg = Array.from(new Set(customStudyDays.flatMap(d => {
      const mornTg = d.morningTgOfficers || [];
      const aftTg = d.afternoonTgOfficers || [];
      return [...mornTg, ...aftTg, ...d.tgOfficers];
    }).filter(Boolean))).join(', ') || undefined;

    // Create subModules from custom study days
    const subModules: Record<string, any> = {};
    customStudyDays.forEach((day, index) => {
      const morn = day.morningInstructors || [];
      const aft = day.afternoonInstructors || [];
      const combinedInst = Array.from(new Set([...morn, ...aft, ...day.instructors])).filter(Boolean);

      const mornTg = day.morningTgOfficers || [];
      const aftTg = day.afternoonTgOfficers || [];
      const combinedTg = Array.from(new Set([...mornTg, ...aftTg, ...day.tgOfficers])).filter(Boolean);

      const keyName = day.moduleName || `Day ${index + 1}`;

      subModules[keyName] = {
        instructor: combinedInst.join(', '),
        morningInstructors: morn,
        afternoonInstructors: aft,
        date: day.date,
        startTime: day.startTime || '08:00',
        endTime: day.endTime || '16:30',
        classroom: day.classroom,
        theoryClassroom: day.classroom,
        practiceArea: '',
        taOfficer: day.taOfficers.filter(Boolean).join(', '),
        tgOfficer: combinedTg.filter(Boolean).join(', '),
        tgOfficers: combinedTg,
        morningTgOfficers: mornTg,
        afternoonTgOfficers: aftTg,
        sessionType: day.sessionType
      };
    });

    const currentEnrolledIds = editingSessionId ? (sessions.find(s => s.id === editingSessionId)?.enrolledIds || []) : [];
    let updatedEnrolledIds = [...currentEnrolledIds];
    const studentsCount = isNaN(assignStudentsCount) ? 0 : assignStudentsCount;

    if (updatedEnrolledIds.length < studentsCount) {
      const diff = studentsCount - updatedEnrolledIds.length;
      for (let i = 0; i < diff; i++) {
        updatedEnrolledIds.push(`student-manual-${Date.now()}-${Math.random()}`);
      }
    } else if (updatedEnrolledIds.length > studentsCount) {
      updatedEnrolledIds = updatedEnrolledIds.slice(0, studentsCount);
    }

    const newSessionObject: CourseSession = {
      id: editingSessionId || `s-custom-${Date.now()}`,
      courseId: selCourseId,
      sessionCode: assignSessionCode,
      startDate: computedStartDate,
      endDate: computedEndDate,
      startTime: sessionStartTime,
      endTime: sessionEndTime,
      instructor: sessionInstructor,
      classroom: sessionClassroom,
      maxCapacity: assignCapacity,
      enrolledIds: updatedEnrolledIds,
      taOfficer: sessionTa,
      tgOfficer: sessionTg,
      method: isOpitoBosiet ? 'Offline' : assignMethod,
      notes: assignNote || undefined,
      domain: assignDomain,
      subModules: subModules
    };

    if (editingSessionId) {
      if (onUpdateSession) {
        onUpdateSession(newSessionObject);

        // Update Course Name if it changed!
        const matchedCourse = courses.find(c => c.id === selCourseId);
        if (matchedCourse && matchedCourse.title !== assignCourseName && onUpdateCourse) {
          onUpdateCourse({ ...matchedCourse, title: assignCourseName });
        }

        setAssignFeedback({ 
          type: 'success', 
          message: `Lớp học cho khóa ${assignCourseCode} đã được cập nhật thành công.${warningSuffix}` 
        });
        setAssignTa('');
        setAssignTg('');
        setAssignNote('');
        setAssignMethod('Offline');
        setAssignStudentsCount(0);
        setEditingSessionId(null);
        setIsAssignmentModalOpen(false);
      } else {
        setAssignFeedback({ type: 'error', message: 'Không thể cập nhật lịch học: Trình điều phối onUpdateSession chưa được kết nối.' });
      }
    } else {
      if (onAddSession) {
        onAddSession(newSessionObject);
        setAssignFeedback({ 
          type: 'success', 
          message: `Lớp học cho khóa ${assignCourseCode} đã được phân lịch thành công.${warningSuffix}` 
        });
        // Clear specific temporary fields
        setAssignTa('');
        setAssignTg('');
        setAssignNote('');
        setAssignMethod('Offline');
        setIsAssignmentModalOpen(false);
      } else {
        setAssignFeedback({ type: 'error', message: 'Không thể đăng lịch học: Trình điều phối onAddSession chưa được kết nối.' });
      }
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
          className="fixed inset-0 bg-slate-950/20 backdrop-blur-xs flex items-center justify-center p-0 z-[9999] animate-in fade-in duration-200"
        >
          <div 
            id="courses-assignment-modal-card" 
            className="bg-white w-screen h-screen flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
          >
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-md font-bold text-slate-900 flex items-center gap-2">
                  <Settings className="h-4.5 w-4.5 text-[#559b8c]" />
                  {editingSessionId ? "Cập nhật Lớp học đã đăng ký" : "Đăng ký Khóa học"}
                </h3>
              </div>
              <button
                id="close-assignment-modal-btn"
                type="button"
                onClick={() => {
                  setIsAssignmentModalOpen(false);
                  setAssignFeedback(null);
                  setEditingSessionId(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 cursor-pointer transition-colors"
                title="Đóng Cửa sổ"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content - Simple Form */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-50/50">
              <form id="course-assignment-form" onSubmit={handlePublishAssignment} className="space-y-6 max-w-7xl mx-auto">
                {/* Course Selection block */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs text-left">
                  <div className="space-y-1 md:col-span-1">
                    <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Mã
                    </label>
                    <input
                      id="assign-input-session-code"
                      type="text"
                      value={assignSessionCode}
                      onChange={(e) => setAssignSessionCode(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                      placeholder="Mã..."
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
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
                    {editingSessionId && (
                      <div className="mt-2.5">
                        <label className="block text-[9.5px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Tên hiển thị tùy chỉnh (Chỉnh sửa nếu cần)
                        </label>
                        <input
                          id="assign-input-course-title-edit"
                          type="text"
                          value={assignCourseName}
                          onChange={(e) => setAssignCourseName(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                          placeholder="Nhập tên khóa học..."
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
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

                  <div className="space-y-1">
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

                  <div className="space-y-1">
                    <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Hình thức học
                    </label>
                    <select
                      id="assign-select-method"
                      value={isOpitoBosiet ? 'Offline' : assignMethod}
                      disabled={isOpitoBosiet}
                      onChange={(e) => setAssignMethod(e.target.value as 'Online' | 'Offline')}
                      className={`w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] ${isOpitoBosiet ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <option value="Offline">Trực tiếp (Offline)</option>
                      <option value="Online">Trực tuyến (Online)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10.5px] font-black text-slate-500 uppercase tracking-wider mb-1">
                      Học viên
                    </label>
                    <input
                      id="assign-input-students-count"
                      type="number"
                      min="0"
                      value={isNaN(assignStudentsCount) ? '' : assignStudentsCount}
                      onChange={(e) => setAssignStudentsCount(parseInt(e.target.value))}
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                      placeholder="Số lượng học viên..."
                    />
                  </div>
                </div>

                {/* Custom Study Days (Dynamic Schedule Details) */}
                <div className="space-y-4 text-left border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="h-4.5 w-4.5 text-[#559b8c]" />
                      Thông tin Ngày học &amp; Phân công
                    </span>
                  </div>

                  <div className="space-y-4 lg:max-h-[calc(100vh-320px)] max-h-[500px] overflow-y-auto pr-1">
                    {customStudyDays.map((day, idx) => (
                      <div key={day.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3 relative">
                        {/* Day Header with date picker and inline add/delete buttons */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-extrabold text-[#559b8c]">
                              {day.moduleName ? `Học phần ${day.moduleName}:` : `Ngày ${idx + 1}:`}
                            </span>
                            {/* Ngày học: date picker */}
                            <input
                              type="date"
                              value={day.date}
                              onChange={(e) => handleUpdateStudyDay(day.id, { date: e.target.value })}
                              className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none font-semibold text-slate-700 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                            />
                            {/* Dấu cộng cho phép thêm ngày học */}
                            {!day.moduleName && (
                              <button
                                type="button"
                                onClick={handleAddStudyDay}
                                className="p-1 rounded-md text-[#559b8c] hover:bg-[#559b8c]/10 cursor-pointer transition-colors"
                                title="Thêm ngày học mới"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          
                          {customStudyDays.length > 1 && !day.moduleName && (
                            <button
                              type="button"
                              onClick={() => handleRemoveStudyDay(day.id)}
                              className="p-1 rounded-md text-rose-500 hover:text-rose-750 hover:bg-rose-50 cursor-pointer transition-colors"
                              title="Xóa ngày học này"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Fields: Phụ giảng, Trợ giảng, Giảng viên, Giờ học, phòng học */}
                        {day.moduleName ? (
                          // T.FOET Custom module fields block
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Buổi học & Phòng học */}
                            <div className="space-y-4 p-3 bg-white/50 border border-slate-200/80 rounded-xl text-left">
                              {/* Buổi học */}
                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-[#559b8c] uppercase tracking-wider">
                                  Buổi học
                                </label>
                                <select
                                  value={day.sessionType || 'Cả ngày'}
                                  onChange={(e) => {
                                    const val = e.target.value as 'Sáng' | 'Chiều' | 'Cả ngày';
                                    let start = '08:00';
                                    let end = '16:30';
                                    if (val === 'Sáng') {
                                      start = '08:00';
                                      end = '12:00';
                                    } else if (val === 'Chiều') {
                                      start = '13:00';
                                      end = '16:30';
                                    }
                                    handleUpdateStudyDay(day.id, { 
                                      sessionType: val,
                                      startTime: start,
                                      endTime: end
                                    });
                                  }}
                                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-bold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                >
                                  <option value="Cả ngày">Cả ngày (08:00 - 16:30)</option>
                                  <option value="Sáng">Buổi Sáng (08:00 - 12:00)</option>
                                  <option value="Chiều">Buổi Chiều (13:00 - 16:30)</option>
                                </select>
                              </div>

                              {/* Phòng học */}
                              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                    Phòng học
                                  </label>
                                  {!day.classroom && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateStudyDay(day.id, { classroom: ' ' });
                                      }}
                                      className="p-1 rounded-md text-[#559b8c] hover:bg-[#559b8c]/10 cursor-pointer transition-colors"
                                      title="Thêm Phòng học"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                                {day.classroom && (
                                  <div className="space-y-1.5 w-full">
                                    <div className="flex items-center gap-1.5">
                                      <select
                                        value={
                                          !day.classroom || day.classroom.trim() === "" 
                                            ? "" 
                                            : activeClassrooms.some(room => room.name === day.classroom.trim())
                                              ? day.classroom.trim()
                                              : "other"
                                        }
                                        onChange={(e) => {
                                          if (e.target.value === "other") {
                                            handleUpdateStudyDay(day.id, { classroom: "Cơ sở khác: " });
                                          } else {
                                            handleUpdateStudyDay(day.id, { classroom: e.target.value });
                                          }
                                        }}
                                        className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-bold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                      >
                                        <option value="">-- Chưa chọn --</option>
                                        {activeClassrooms.map(room => (
                                          <option key={room.id} value={room.name}>
                                            {room.name}
                                          </option>
                                        ))}
                                        <option value="other">Cơ sở khác</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleUpdateStudyDay(day.id, { classroom: '' });
                                        }}
                                        className="p-1 text-rose-500 hover:text-rose-750 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                                        title="Xóa phòng học"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                    {day.classroom && day.classroom.trim() !== "" && !activeClassrooms.some(room => room.name === day.classroom.trim()) && (
                                      <input
                                        type="text"
                                        placeholder="Nhập tên Cơ sở khác..."
                                        value={day.classroom.startsWith("Cơ sở khác: ") ? day.classroom.substring(12) : day.classroom}
                                        onChange={(e) => {
                                          handleUpdateStudyDay(day.id, { classroom: `Cơ sở khác: ${e.target.value}` });
                                        }}
                                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Giảng viên & Phụ giảng */}
                            <div className="space-y-4 p-3 bg-white/50 border border-slate-200/80 rounded-xl text-left">
                              {/* Giảng viên */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <label className="block text-[10px] font-black text-[#559b8c] uppercase tracking-wider">
                                    Giảng viên
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = day.instructors || [];
                                      handleUpdateStudyDay(day.id, { instructors: [...current, ''] });
                                    }}
                                    className="p-1 rounded-md text-[#559b8c] hover:bg-[#559b8c]/10 cursor-pointer transition-colors"
                                    title="Thêm Giảng viên"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="space-y-1.5">
                                  {(day.instructors || []).map((inst, instIdx) => {
                                    const isExternal = inst && inst !== "" && !members.some(m => `${m.name} (${m.position || 'Giảng viên'})` === inst);
                                    return (
                                      <div key={instIdx} className="space-y-1 w-full border-b border-slate-100 pb-1.5 last:border-none last:pb-0">
                                        <div className="flex items-center gap-1.5">
                                          <select
                                            value={isExternal ? "external" : inst}
                                            onChange={(e) => {
                                              const current = [...(day.instructors || [])];
                                              if (e.target.value === "external") {
                                                current[instIdx] = "Giảng viên ngoài: ";
                                              } else {
                                                current[instIdx] = e.target.value;
                                              }
                                              handleUpdateStudyDay(day.id, { instructors: current });
                                            }}
                                            className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-bold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                          >
                                            <option value="">-- Chọn Giảng viên --</option>
                                            {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                                              <option key={m.id} value={`${m.name} (${m.position || 'Giảng viên'})`}>
                                                {m.name}
                                              </option>
                                            ))}
                                            <option value="external">Giảng viên ngoài</option>
                                          </select>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const current = (day.instructors || []).filter((_, idx) => idx !== instIdx);
                                              handleUpdateStudyDay(day.id, { instructors: current });
                                            }}
                                            className="p-1 text-rose-500 hover:text-rose-750 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                                            title="Xóa giảng viên này"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        </div>
                                        {isExternal && (
                                          <input
                                            type="text"
                                            value={inst.startsWith("Giảng viên ngoài: ") ? inst.substring("Giảng viên ngoài: ".length) : inst}
                                            onChange={(e) => {
                                              const current = [...(day.instructors || [])];
                                              current[instIdx] = "Giảng viên ngoài: " + e.target.value;
                                              handleUpdateStudyDay(day.id, { instructors: current });
                                            }}
                                            className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-bold text-slate-850 focus:ring-1 focus:ring-[#559b8c]"
                                            placeholder="Nhập tên giảng viên ngoài..."
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                  {(day.instructors || []).length === 0 && (
                                    <div className="text-[11px] text-slate-400 italic font-sans">Chưa phân công giảng viên</div>
                                  )}
                                </div>
                              </div>

                              {/* Phụ giảng */}
                              <div className="space-y-1.5 border-t border-slate-100 pt-3 mt-3">
                                <div className="flex items-center justify-between">
                                  <label className="block text-[10px] font-black text-[#559b8c] uppercase tracking-wider">
                                    Phụ giảng (TA)
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = day.taOfficers || [];
                                      handleUpdateStudyDay(day.id, { taOfficers: [...current, ''] });
                                    }}
                                    className="p-1 rounded-md text-[#559b8c] hover:bg-[#559b8c]/10 cursor-pointer transition-colors"
                                    title="Thêm Phụ giảng"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="space-y-1.5">
                                  {(day.taOfficers || []).map((ta, taIdx) => (
                                    <div key={taIdx} className="flex items-center gap-1.5">
                                      <select
                                        value={ta}
                                        onChange={(e) => {
                                          const current = [...(day.taOfficers || [])];
                                          current[taIdx] = e.target.value;
                                          handleUpdateStudyDay(day.id, { taOfficers: current });
                                        }}
                                        className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-700 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                      >
                                        <option value="">-- Chọn Phụ giảng --</option>
                                        {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                                          <option key={m.id} value={m.name}>
                                            {m.name}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const current = (day.taOfficers || []).filter((_, idx) => idx !== taIdx);
                                          handleUpdateStudyDay(day.id, { taOfficers: current });
                                        }}
                                        className="p-1 text-rose-500 hover:text-rose-750 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                                        title="Xóa phụ giảng này"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                  {(day.taOfficers || []).length === 0 && (
                                    <div className="text-[11px] text-slate-400 italic font-sans">Chưa phân công phụ giảng</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Standard study day fields
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Giảng viên */}
                          <div className="space-y-4 p-3 bg-white/50 border border-slate-200/80 rounded-xl">
                            {/* Giảng viên Sáng */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="block text-[10px] font-black text-[#559b8c] uppercase tracking-wider">
                                  Giảng viên Buổi Sáng
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = day.morningInstructors || [];
                                    handleUpdateStudyDay(day.id, { morningInstructors: [...current, ''] });
                                  }}
                                  className="p-1 rounded-md text-[#559b8c] hover:bg-[#559b8c]/10 cursor-pointer transition-colors"
                                  title="Thêm Giảng viên Sáng"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="space-y-1.5">
                                {(day.morningInstructors || []).map((inst, instIdx) => {
                                  const isExternal = inst && inst !== "" && !members.some(m => `${m.name} (${m.position || 'Giảng viên'})` === inst);
                                  return (
                                    <div key={instIdx} className="space-y-1 w-full border-b border-slate-100 pb-1.5 last:border-none last:pb-0">
                                      <div className="flex items-center gap-1.5">
                                        <select
                                          value={isExternal ? "external" : inst}
                                          onChange={(e) => {
                                            const current = [...(day.morningInstructors || [])];
                                            if (e.target.value === "external") {
                                              current[instIdx] = "Giảng viên ngoài: ";
                                            } else {
                                              current[instIdx] = e.target.value;
                                            }
                                            handleUpdateStudyDay(day.id, { morningInstructors: current });
                                          }}
                                          className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-bold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                        >
                                          <option value="">-- Chọn Giảng viên Sáng --</option>
                                          {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                                            <option key={m.id} value={`${m.name} (${m.position || 'Giảng viên'})`}>
                                              {m.name}
                                            </option>
                                          ))}
                                          <option value="external">Giảng viên ngoài</option>
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const current = (day.morningInstructors || []).filter((_, idx) => idx !== instIdx);
                                            handleUpdateStudyDay(day.id, { morningInstructors: current });
                                          }}
                                          className="p-1 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                                          title="Xóa giảng viên này"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                      {isExternal && (
                                        <input
                                          type="text"
                                          value={inst.startsWith("Giảng viên ngoài: ") ? inst.substring("Giảng viên ngoài: ".length) : inst}
                                          onChange={(e) => {
                                            const current = [...(day.morningInstructors || [])];
                                            current[instIdx] = "Giảng viên ngoài: " + e.target.value;
                                            handleUpdateStudyDay(day.id, { morningInstructors: current });
                                          }}
                                          className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-bold text-slate-850 focus:ring-1 focus:ring-[#559b8c]"
                                          placeholder="Nhập tên giảng viên ngoài..."
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                                {(day.morningInstructors || []).length === 0 && (
                                  <div className="text-[11px] text-slate-400 italic">Chưa phân công buổi sáng</div>
                                )}
                              </div>
                            </div>

                            {/* Giảng viên Chiều */}
                            <div className="space-y-1.5 border-t border-slate-150 pt-2.5">
                              <div className="flex items-center justify-between">
                                <label className="block text-[10px] font-black text-amber-600 uppercase tracking-wider">
                                  Giảng viên Buổi Chiều
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = day.afternoonInstructors || [];
                                    handleUpdateStudyDay(day.id, { afternoonInstructors: [...current, ''] });
                                  }}
                                  className="p-1 rounded-md text-amber-600 hover:bg-amber-50 cursor-pointer transition-colors"
                                  title="Thêm Giảng viên Chiều"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="space-y-1.5">
                                {(day.afternoonInstructors || []).map((inst, instIdx) => {
                                  const isExternal = inst && inst !== "" && !members.some(m => `${m.name} (${m.position || 'Giảng viên'})` === inst);
                                  return (
                                    <div key={instIdx} className="space-y-1 w-full border-b border-slate-100 pb-1.5 last:border-none last:pb-0">
                                      <div className="flex items-center gap-1.5">
                                        <select
                                          value={isExternal ? "external" : inst}
                                          onChange={(e) => {
                                            const current = [...(day.afternoonInstructors || [])];
                                            if (e.target.value === "external") {
                                              current[instIdx] = "Giảng viên ngoài: ";
                                            } else {
                                              current[instIdx] = e.target.value;
                                            }
                                            handleUpdateStudyDay(day.id, { afternoonInstructors: current });
                                          }}
                                          className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-bold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                        >
                                          <option value="">-- Chọn Giảng viên Chiều --</option>
                                          {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                                            <option key={m.id} value={`${m.name} (${m.position || 'Giảng viên'})`}>
                                              {m.name}
                                            </option>
                                          ))}
                                          <option value="external">Giảng viên ngoài</option>
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const current = (day.afternoonInstructors || []).filter((_, idx) => idx !== instIdx);
                                            handleUpdateStudyDay(day.id, { afternoonInstructors: current });
                                          }}
                                          className="p-1 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                                          title="Xóa giảng viên này"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                      {isExternal && (
                                        <input
                                          type="text"
                                          value={inst.startsWith("Giảng viên ngoài: ") ? inst.substring("Giảng viên ngoài: ".length) : inst}
                                          onChange={(e) => {
                                            const current = [...(day.afternoonInstructors || [])];
                                            current[instIdx] = "Giảng viên ngoài: " + e.target.value;
                                            handleUpdateStudyDay(day.id, { afternoonInstructors: current });
                                          }}
                                          className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-bold text-slate-850 focus:ring-1 focus:ring-[#559b8c]"
                                          placeholder="Nhập tên giảng viên ngoài..."
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                                {(day.afternoonInstructors || []).length === 0 && (
                                  <div className="text-[11px] text-slate-400 italic">Chưa phân công buổi chiều</div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Phòng học */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                Phòng học
                              </label>
                              {!day.classroom && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleUpdateStudyDay(day.id, { classroom: ' ' });
                                  }}
                                  className="p-1 rounded-md text-[#559b8c] hover:bg-[#559b8c]/10 cursor-pointer transition-colors"
                                  title="Thêm Phòng học"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            {day.classroom && (
                              <div className="space-y-1.5 w-full">
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={
                                      !day.classroom || day.classroom.trim() === "" 
                                        ? "" 
                                        : activeClassrooms.some(room => room.name === day.classroom.trim())
                                          ? day.classroom.trim()
                                          : "other"
                                    }
                                    onChange={(e) => {
                                      if (e.target.value === "other") {
                                        handleUpdateStudyDay(day.id, { classroom: "Cơ sở khác: " });
                                      } else {
                                        handleUpdateStudyDay(day.id, { classroom: e.target.value });
                                      }
                                    }}
                                    className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-bold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                  >
                                    <option value="">-- Chưa chọn --</option>
                                    {activeClassrooms.map(room => (
                                      <option key={room.id} value={room.name}>
                                        {room.name}
                                      </option>
                                    ))}
                                    <option value="other">Cơ sở khác</option>
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleUpdateStudyDay(day.id, { classroom: '' });
                                    }}
                                    className="p-1 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                                    title="Xóa phòng học"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                {day.classroom && day.classroom.trim() !== "" && !activeClassrooms.some(room => room.name === day.classroom.trim()) && (
                                  <input
                                    type="text"
                                    placeholder="Nhập tên Cơ sở khác..."
                                    value={day.classroom.startsWith("Cơ sở khác: ") ? day.classroom.substring(12) : day.classroom}
                                    onChange={(e) => {
                                      handleUpdateStudyDay(day.id, { classroom: `Cơ sở khác: ${e.target.value}` });
                                    }}
                                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                                  />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Phụ giảng */}
                          <div className="space-y-4 p-3 bg-white/50 border border-slate-200/80 rounded-xl text-left">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] font-black text-[#559b8c] uppercase tracking-wider">
                                Phụ giảng (TA)
                              </label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = day.morningTaOfficers || [];
                                    handleUpdateStudyDay(day.id, { morningTaOfficers: [...current, ''] });
                                  }}
                                  className="text-[9px] font-bold text-[#559b8c] hover:bg-[#559b8c]/10 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                  title="Thêm Phụ giảng Sáng"
                                >
                                  + Sáng
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = day.afternoonTaOfficers || [];
                                    handleUpdateStudyDay(day.id, { afternoonTaOfficers: [...current, ''] });
                                  }}
                                  className="text-[9px] font-bold text-[#559b8c] hover:bg-[#559b8c]/10 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                  title="Thêm Phụ giảng Chiều"
                                >
                                  + Chiều
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {/* Sáng list */}
                              {(day.morningTaOfficers || []).length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider block">Buổi Sáng</span>
                                  {(day.morningTaOfficers || []).map((ta, taIdx) => (
                                    <div key={`m-ta-${taIdx}`} className="flex items-center gap-1.5">
                                      <select
                                        value={ta}
                                        onChange={(e) => {
                                          const current = [...(day.morningTaOfficers || [])];
                                          current[taIdx] = e.target.value;
                                          handleUpdateStudyDay(day.id, { morningTaOfficers: current });
                                        }}
                                        className="flex-1 text-xs bg-amber-50/50 border border-amber-200/55 rounded-lg p-2 outline-none font-semibold text-slate-700 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                      >
                                        <option value="">-- Chọn TA Sáng --</option>
                                        {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                                          <option key={m.id} value={m.name}>
                                            {m.name}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const current = (day.morningTaOfficers || []).filter((_, idx) => idx !== taIdx);
                                          handleUpdateStudyDay(day.id, { morningTaOfficers: current });
                                        }}
                                        className="p-1 text-rose-500 hover:text-rose-750 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                                        title="Xóa phụ giảng sáng này"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Chiều list */}
                              {(day.afternoonTaOfficers || []).length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-wider block">Buổi Chiều</span>
                                  {(day.afternoonTaOfficers || []).map((ta, taIdx) => (
                                    <div key={`a-ta-${taIdx}`} className="flex items-center gap-1.5">
                                      <select
                                        value={ta}
                                        onChange={(e) => {
                                          const current = [...(day.afternoonTaOfficers || [])];
                                          current[taIdx] = e.target.value;
                                          handleUpdateStudyDay(day.id, { afternoonTaOfficers: current });
                                        }}
                                        className="flex-1 text-xs bg-indigo-50/50 border border-indigo-200/55 rounded-lg p-2 outline-none font-semibold text-slate-700 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                      >
                                        <option value="">-- Chọn TA Chiều --</option>
                                        {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                                          <option key={m.id} value={m.name}>
                                            {m.name}
                                          </option>
                                        ))}
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const current = (day.afternoonTaOfficers || []).filter((_, idx) => idx !== taIdx);
                                          handleUpdateStudyDay(day.id, { afternoonTaOfficers: current });
                                        }}
                                        className="p-1 text-rose-500 hover:text-rose-750 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                                        title="Xóa phụ giảng chiều này"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {(day.morningTaOfficers || []).length === 0 && (day.afternoonTaOfficers || []).length === 0 && (
                                <div className="text-[11px] text-slate-400 italic">Chưa phân công phụ giảng</div>
                              )}
                            </div>
                          </div>

                          {/* Trợ giảng */}
                          <div className="space-y-4 p-3 bg-white/50 border border-slate-200/80 rounded-xl">
                            {/* Trợ giảng Sáng */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="block text-[10px] font-black text-[#559b8c] uppercase tracking-wider">
                                  Trợ giảng Buổi Sáng (TG)
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = day.morningTgOfficers || [];
                                    handleUpdateStudyDay(day.id, { morningTgOfficers: [...current, ''] });
                                  }}
                                  className="p-1 rounded-md text-[#559b8c] hover:bg-[#559b8c]/10 cursor-pointer transition-colors"
                                  title="Thêm Trợ giảng Sáng"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="space-y-1.5">
                                {(day.morningTgOfficers || []).map((tg, tgIdx) => (
                                  <div key={tgIdx} className="flex items-center gap-1.5">
                                    <select
                                      value={tg}
                                      onChange={(e) => {
                                        const current = [...(day.morningTgOfficers || [])];
                                        current[tgIdx] = e.target.value;
                                        handleUpdateStudyDay(day.id, { morningTgOfficers: current });
                                      }}
                                      className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-700 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                    >
                                      <option value="">-- Chọn Trợ giảng Sáng --</option>
                                      {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                                        <option key={m.id} value={m.name}>
                                          {m.name}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = (day.morningTgOfficers || []).filter((_, idx) => idx !== tgIdx);
                                        handleUpdateStudyDay(day.id, { morningTgOfficers: current });
                                      }}
                                      className="p-1 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                                      title="Xóa trợ giảng này"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                                {(day.morningTgOfficers || []).length === 0 && (
                                  <div className="text-[11px] text-slate-400 italic">Chưa phân công buổi sáng</div>
                                )}
                              </div>
                            </div>

                            {/* Trợ giảng Chiều */}
                            <div className="space-y-1.5 border-t border-slate-150 pt-2.5">
                              <div className="flex items-center justify-between">
                                <label className="block text-[10px] font-black text-amber-600 uppercase tracking-wider">
                                  Trợ giảng Buổi Chiều (TG)
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const current = day.afternoonTgOfficers || [];
                                    handleUpdateStudyDay(day.id, { afternoonTgOfficers: [...current, ''] });
                                  }}
                                  className="p-1 rounded-md text-amber-600 hover:bg-amber-50 cursor-pointer transition-colors"
                                  title="Thêm Trợ giảng Chiều"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <div className="space-y-1.5">
                                {(day.afternoonTgOfficers || []).map((tg, tgIdx) => (
                                  <div key={tgIdx} className="flex items-center gap-1.5">
                                    <select
                                      value={tg}
                                      onChange={(e) => {
                                        const current = [...(day.afternoonTgOfficers || [])];
                                        current[tgIdx] = e.target.value;
                                        handleUpdateStudyDay(day.id, { afternoonTgOfficers: current });
                                      }}
                                      className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-700 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                    >
                                      <option value="">-- Chọn Trợ giảng Chiều --</option>
                                      {members.filter(m => m.email.toLowerCase() !== 'setcadmin' && m.email.toLowerCase() !== 'setcadmin@safetycentre.org').map(m => (
                                        <option key={m.id} value={m.name}>
                                          {m.name}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = (day.afternoonTgOfficers || []).filter((_, idx) => idx !== tgIdx);
                                        handleUpdateStudyDay(day.id, { afternoonTgOfficers: current });
                                      }}
                                      className="p-1 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 cursor-pointer transition-colors"
                                      title="Xóa trợ giảng này"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                                {(day.afternoonTgOfficers || []).length === 0 && (
                                  <div className="text-[11px] text-slate-400 italic">Chưa phân công buổi chiều</div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Giờ học */}
                          <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                Giờ bắt đầu
                              </label>
                              <input
                                type="text"
                                value={day.startTime}
                                onChange={(e) => handleUpdateStudyDay(day.id, { startTime: e.target.value })}
                                placeholder="08:00"
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-bold text-slate-800 text-center focus:ring-1 focus:ring-[#559b8c]"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                Giờ kết thúc
                              </label>
                              <input
                                type="text"
                                value={day.endTime}
                                onChange={(e) => handleUpdateStudyDay(day.id, { endTime: e.target.value })}
                                placeholder="16:30"
                                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-bold text-slate-800 text-center focus:ring-1 focus:ring-[#559b8c]"
                              />
                            </div>
                          </div>
                        </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bảng Kiểm tra Trùng lặp / Conflict */}
                <div id="conflict-checker-section" className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-3.5 text-left">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className={`h-4.5 w-4.5 ${currentStudyDaysConflicts.length > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-450'}`} />
                      Bảng Kiểm tra Trùng lặp / Conflict ({currentStudyDaysConflicts.length})
                    </span>
                  </div>
                  
                  {currentStudyDaysConflicts.length === 0 ? (
                    <p className="text-xs font-semibold text-emerald-700 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-200/60 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      ✓ Tuyệt vời! Không phát hiện trùng lặp/conflict nào về nhân sự hay phòng học. Lịch trình hoàn toàn an toàn để đăng ký.
                    </p>
                  ) : (
                    <div className="overflow-hidden border border-slate-200 rounded-xl shadow-4xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200">
                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Ngày học &amp; Học phần</th>
                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Tên nhân sự</th>
                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Phòng học</th>
                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Vai trò</th>
                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">Chi tiết trùng lặp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentStudyDaysConflicts.map((conf, index) => (
                            <tr key={conf.id || index} className="hover:bg-slate-50/40 transition-colors">
                              <td className="p-3 text-xs font-bold text-slate-700 whitespace-nowrap">{conf.moduleName} ({conf.date})</td>
                              <td className="p-3 text-xs font-semibold text-rose-600">
                                {conf.personnel !== '-' ? conf.personnel : <span className="text-slate-350">—</span>}
                              </td>
                              <td className="p-3 text-xs font-semibold text-amber-600">
                                {conf.classroom !== '-' ? conf.classroom : <span className="text-slate-350">—</span>}
                              </td>
                              <td className="p-3 text-xs">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                  conf.role === 'Giảng viên' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' :
                                  conf.role === 'Phụ giảng' ? 'bg-cyan-50 text-cyan-700 border border-cyan-150' :
                                  conf.role === 'Trợ giảng' ? 'bg-sky-50 text-sky-700 border border-sky-150' :
                                  'bg-amber-50 text-amber-700 border border-amber-150' // Classroom
                                }`}>
                                  {conf.role}
                                </span>
                              </td>
                              <td className="p-3 text-xs text-slate-650 font-medium">{conf.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-2">
                  <button
                    id="publish-course-assignment-btn"
                    type="submit"
                    className="text-xs font-black min-w-[200px] leading-none px-4.5 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] bg-[#559b8c] hover:bg-[#3f766a] text-white hover:shadow-lg cursor-pointer"
                  >
                    {editingSessionId ? <Settings className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editingSessionId ? "Cập nhật Lớp học" : "Xác nhận"}
                  </button>
                </div>
              </form>
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
                  setEditingSessionId(null);
                  setIsAssignmentModalOpen(true);
                  setAssignStudentsCount(0);
                  setAssignSessionCode('');
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
                <th rowSpan={2} className="p-3 font-extrabold text-slate-700 text-center border-r border-slate-200 bg-slate-100/80 w-[60px] min-w-[60px] uppercase">
                  TA
                </th>
                <th rowSpan={2} className="p-3 font-extrabold text-slate-700 text-center bg-slate-100/80 w-[60px] min-w-[60px] uppercase">
                  TT
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
                sortedTrackingMembers.map((member, mIdx) => {
                  const stats = calculateWeeklyStats(member);
                  
                  // Helper to get primary department
                  const getPrimaryDept = (m: Member): string => {
                    const depts = getMemberDepartments(m);
                    const allowedDepts = ['Ban Giám đốc', 'Tổ đào tạo', 'Tổ Thiết bị', 'Tổ hành chính'];
                    for (const d of allowedDepts) {
                      if (depts.includes(d)) return d;
                    }
                    return 'Khác';
                  };

                  const primaryDept = getPrimaryDept(member);
                  
                  // Style configurations based on primary department
                  const getDeptStyle = (m: Member) => {
                    const primary = getPrimaryDept(m);
                    if (primary === 'Ban Giám đốc') {
                      return {
                        row: 'bg-[#f4f6ff]/40 hover:bg-[#ebf0ff]/60 transition-colors',
                        sticky: 'bg-[#f0f2ff]', // soft solid indigo
                        badge: 'bg-indigo-100/70 text-indigo-800 border-indigo-200/50',
                        text: 'text-indigo-950 font-black',
                        tag: 'Ban Giám đốc'
                      };
                    }
                    if (primary === 'Tổ đào tạo') {
                      return {
                        row: 'bg-[#fffcf4]/50 hover:bg-[#fff7e0]/70 transition-colors',
                        sticky: 'bg-[#fffcf0]', // soft solid amber
                        badge: 'bg-amber-100/70 text-amber-800 border-amber-250/50',
                        text: 'text-amber-950 font-black',
                        tag: 'Tổ đào tạo'
                      };
                    }
                    if (primary === 'Tổ Thiết bị') {
                      return {
                        row: 'bg-[#f0f9ff]/40 hover:bg-[#e0f2fe]/60 transition-colors',
                        sticky: 'bg-[#f0f9ff]', // soft solid sky
                        badge: 'bg-sky-100/70 text-sky-800 border-sky-200/50',
                        text: 'text-sky-950 font-black',
                        tag: 'Tổ Thiết bị'
                      };
                    }
                    if (primary === 'Tổ hành chính') {
                      return {
                        row: 'bg-[#f0fdf4]/40 hover:bg-[#dcfce7]/60 transition-colors',
                        sticky: 'bg-[#f0fdf4]', // soft solid mint
                        badge: 'bg-emerald-100/70 text-emerald-800 border-emerald-200/50',
                        text: 'text-emerald-950 font-black',
                        tag: 'Tổ hành chính'
                      };
                    }
                    return {
                      row: 'bg-slate-50/20 hover:bg-slate-50/40 transition-colors',
                      sticky: 'bg-white',
                      badge: 'bg-slate-100 text-slate-700 border-slate-200',
                      text: 'text-slate-900',
                      tag: 'Khác'
                    };
                  };

                  const deptStyle = getDeptStyle(member);
                  const isNewDept = mIdx > 0 && getPrimaryDept(sortedTrackingMembers[mIdx - 1]) !== primaryDept;
                  const rowBorderClass = isNewDept ? 'border-t-2 border-t-slate-400 border-b border-b-slate-200' : 'border-b border-b-slate-200';

                  return (
                    <tr key={member.id} className={`${deptStyle.row} border-b border-b-slate-200`}>
                      <td className={`p-3 font-bold border-r border-r-slate-200 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] ${deptStyle.sticky} ${rowBorderClass}`}>
                        <div className="flex flex-col text-left">
                          <span className={`text-xs truncate max-w-[170px] ${deptStyle.text}`} title={member.name}>{member.name}</span>
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
                            <td className={`p-2 border-r border-r-slate-200 align-top ${cellClass} text-center min-w-[75px] ${rowBorderClass}`}>
                              {morningAssignments.length > 0 ? (
                                <div className="flex flex-col gap-1.5">
                                  {formatAssignmentStrings(morningAssignments).map((assign, aIdx) => {
                                    const badgeBg = getCourseBadgeColor(assign);
                                    
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
                            <td className={`p-2 border-r border-r-slate-200 align-top ${cellClass} text-center min-w-[75px] ${rowBorderClass}`}>
                              {afternoonAssignments.length > 0 ? (
                                <div className="flex flex-col gap-1.5">
                                  {formatAssignmentStrings(afternoonAssignments).map((assign, aIdx) => {
                                    const badgeBg = getCourseBadgeColor(assign);
                                    
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
                            <td className={`p-2 border-r border-r-slate-200 align-middle ${cellClass} text-center font-mono text-[11.5px] font-bold text-amber-800 bg-amber-50/15 ${rowBorderClass}`}>
                              {dayPeriods > 0 ? (
                                <span>{dayPeriods}</span>
                              ) : (
                                <span className="text-slate-300 font-normal italic">-</span>
                              )}
                            </td>
                          </Fragment>
                        );
                      })}
                      {/* TG Summary Column */}
                      <td className={`p-3 font-mono font-black text-center border-r border-r-slate-200 bg-slate-50/40 text-xs ${rowBorderClass}`}>
                        {stats.tgTotal > 0 ? (
                          <span className="px-1.5 py-0.5 bg-sky-50 text-sky-800 rounded border border-sky-200 shadow-3xs">
                            {stats.tgTotal}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal italic">-</span>
                        )}
                      </td>
                      {/* TA Summary Column */}
                      <td className={`p-3 font-mono font-black text-center border-r border-r-slate-200 bg-slate-50/40 text-xs ${rowBorderClass}`}>
                        {stats.taTotal > 0 ? (
                          <span className="px-1.5 py-0.5 bg-teal-50 text-teal-800 rounded border border-teal-200 shadow-3xs">
                            {stats.taTotal}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-normal italic">-</span>
                        )}
                      </td>
                      {/* TT Summary Column */}
                      <td className={`p-3 font-mono font-black text-center bg-slate-50/40 text-xs ${rowBorderClass}`}>
                        {stats.ttTotal > 0 ? (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-200 shadow-3xs">
                            {stats.ttTotal === Math.floor(stats.ttTotal) ? stats.ttTotal : stats.ttTotal.toFixed(1)}
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
                  <td colSpan={25} className="p-8 text-center text-xs text-slate-400 font-bold font-serif bg-slate-50/50">
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
                          value={isNaN(editMaxCapacity) ? '' : editMaxCapacity}
                          onChange={(e) => setEditMaxCapacity(parseInt(e.target.value))}
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
                                        <option value="Phòng giả làm Không gian hạn chế" />
                                        <option value="Khu huấn luyện Sơ cấp cứu thực tế" />
                                        <option value="Sân huấn luyện An toàn Lao động ngoài trời" />
                                      </datalist>
                                    </div>
                                  </div>

                                  {/* Giờ học */}
                                  <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                        Giờ bắt đầu
                                      </label>
                                      <input
                                        type="time"
                                        value={data.startTime || '08:00'}
                                        onChange={(e) => setEditSubModules(prev => ({
                                          ...prev,
                                          [key]: { ...prev[key], startTime: e.target.value }
                                        }))}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                        Giờ kết thúc
                                      </label>
                                      <input
                                        type="time"
                                        value={data.endTime || '16:30'}
                                        onChange={(e) => setEditSubModules(prev => ({
                                          ...prev,
                                          [key]: { ...prev[key], endTime: e.target.value }
                                        }))}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c]"
                                      />
                                    </div>
                                  </div>

                                  {/* Nhân sự */}
                                  <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1.5 border-t border-slate-100 mt-1">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                        Giảng viên
                                      </label>
                                      <select
                                        value={data.instructor && !sortedTrackingMembers.some(m => m.name === data.instructor) && data.instructor !== "" ? "external" : (data.instructor || '')}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setEditSubModules(prev => ({
                                            ...prev,
                                            [key]: { 
                                              ...prev[key], 
                                              instructor: val === "external" ? "Giảng viên ngoài: " : val 
                                            }
                                          }));
                                        }}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                      >
                                        <option value="">-- Chọn Giảng viên --</option>
                                        {sortedTrackingMembers.map(m => (
                                          <option key={m.id} value={m.name}>
                                            {m.name}
                                          </option>
                                        ))}
                                        <option value="external">Giảng viên ngoài</option>
                                      </select>
                                      {data.instructor && !sortedTrackingMembers.some(m => m.name === data.instructor) && data.instructor !== "" && (
                                        <input
                                          type="text"
                                          value={data.instructor.startsWith("Giảng viên ngoài: ") ? data.instructor.substring("Giảng viên ngoài: ".length) : data.instructor}
                                          onChange={(e) => {
                                            const val = "Giảng viên ngoài: " + e.target.value;
                                            setEditSubModules(prev => ({
                                              ...prev,
                                              [key]: { ...prev[key], instructor: val }
                                            }));
                                          }}
                                          className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-850 focus:ring-1 focus:ring-[#559b8c] mt-1"
                                          placeholder="Nhập tên giảng viên ngoài..."
                                        />
                                      )}
                                    </div>

                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                        Phụ giảng
                                      </label>
                                      <select
                                        value={data.taOfficer || ''}
                                        onChange={(e) => setEditSubModules(prev => ({
                                          ...prev,
                                          [key]: { ...prev[key], taOfficer: e.target.value }
                                        }))}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                      >
                                        <option value="">-- Trống --</option>
                                        {sortedTrackingMembers
                                          .filter(m => !getMemberDepartments(m).some(d => d.toLowerCase().includes('hành chính')))
                                          .map(m => (
                                            <option key={m.id} value={m.name}>
                                              {m.name}
                                            </option>
                                          ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                        Trợ giảng
                                      </label>
                                      <select
                                        value={data.tgOfficer || ''}
                                        onChange={(e) => setEditSubModules(prev => ({
                                          ...prev,
                                          [key]: { ...prev[key], tgOfficer: e.target.value }
                                        }))}
                                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none font-semibold text-slate-800 focus:ring-1 focus:ring-[#559b8c] cursor-pointer"
                                      >
                                        <option value="">-- Trống --</option>
                                        {sortedTrackingMembers
                                          .filter(m => !getMemberDepartments(m).some(d => d.toLowerCase().includes('giám đốc')))
                                          .map(m => (
                                            <option key={m.id} value={m.name}>
                                              {m.name}
                                            </option>
                                          ))}
                                      </select>
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
                        value={isNaN(editMaxCapacity) ? '' : editMaxCapacity}
                        onChange={(e) => setEditMaxCapacity(parseInt(e.target.value))}
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
                    <button
                      type="button"
                      onClick={handleStartEditingSession}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 border border-emerald-100 flex-row"
                      title="Thay đổi tham số lịch học"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      Chỉnh sửa
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPopupCourseSession(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-750 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Đóng Chi tiết
                  </button>
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
