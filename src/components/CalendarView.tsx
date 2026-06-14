/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Calendar, Users, MapPin, Clock, User, ArrowUpRight, X, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Course, CourseSession } from '../types';
import { getSessionStatus } from '../data';

interface CalendarViewProps {
  courses: Course[];
  sessions: CourseSession[];
  onSelectCourse: (course: Course, session: CourseSession) => void;
  activeMonth?: string;
  activeDay?: number | 'all';
  activeYear?: number;
  setActiveMonth?: (month: string) => void;
  setActiveYear?: (year: number) => void;
}

const MONTHS_CONFIG: Record<string, { days: number, emptyDaysBefore: number, startDay: number }> = {
  'January': { days: 31, emptyDaysBefore: 4, startDay: 4 }, // Thu
  'February': { days: 28, emptyDaysBefore: 0, startDay: 0 }, // Sun
  'March': { days: 31, emptyDaysBefore: 0, startDay: 0 }, // Sun
  'April': { days: 30, emptyDaysBefore: 3, startDay: 3 }, // Wed
  'May': { days: 31, emptyDaysBefore: 5, startDay: 5 }, // Fri
  'June': { days: 30, emptyDaysBefore: 1, startDay: 1 }, // Mon
  'July': { days: 31, emptyDaysBefore: 3, startDay: 3 }, // Wed
  'August': { days: 31, emptyDaysBefore: 6, startDay: 6 }, // Sat
  'September': { days: 30, emptyDaysBefore: 2, startDay: 2 }, // Tue
  'October': { days: 31, emptyDaysBefore: 4, startDay: 4 }, // Thu
  'November': { days: 30, emptyDaysBefore: 0, startDay: 0 }, // Sun
  'December': { days: 31, emptyDaysBefore: 2, startDay: 2 } // Tue
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

const CATEGORY_STYLES: Record<string, { bg: string, border: string, text: string, textAccent: string }> = {
  'Safety': { 
    bg: 'bg-amber-50/90 hover:bg-amber-100/90', 
    border: 'border-l-[3px] border-amber-500 border-t border-r border-b border-amber-150', 
    text: 'text-amber-900', 
    textAccent: 'text-amber-700' 
  },
  'Environment': { 
    bg: 'bg-emerald-50/90 hover:bg-emerald-100/90', 
    border: 'border-l-[3px] border-emerald-500 border-t border-r border-b border-slate-150', 
    text: 'text-emerald-950', 
    textAccent: 'text-emerald-800' 
  },
  'Emergency': { 
    bg: 'bg-rose-50/90 hover:bg-rose-100/90', 
    border: 'border-l-[3px] border-rose-500 border-t border-r border-b border-rose-150', 
    text: 'text-rose-950', 
    textAccent: 'text-rose-850' 
  },
  'Health': { 
    bg: 'bg-teal-50/90 hover:bg-teal-100/90', 
    border: 'border-l-[3px] border-teal-500 border-t border-r border-b border-teal-150', 
    text: 'text-teal-950', 
    textAccent: 'text-teal-800' 
  },
  'Compliance': { 
    bg: 'bg-indigo-50/90 hover:bg-indigo-100/90', 
    border: 'border-l-[3px] border-indigo-500 border-t border-r border-b border-indigo-150', 
    text: 'text-indigo-955', 
    textAccent: 'text-indigo-850' 
  }
};

export default function CalendarView({ 
  courses, 
  sessions, 
  onSelectCourse, 
  activeMonth = 'June', 
  activeDay = 'all', 
  activeYear = 2026,
  setActiveMonth,
  setActiveYear
}: CalendarViewProps) {
  const config = MONTHS_CONFIG[activeMonth] || MONTHS_CONFIG['June'];
  const emptyDaysBefore = config.emptyDaysBefore;
  const isLeapYear = (activeYear % 4 === 0 && activeYear % 100 !== 0) || (activeYear % 400 === 0);
  const totalDays = activeMonth === 'February' && isLeapYear ? 29 : config.days;

  const [selectedDay, setSelectedDay] = useState<number | null>(activeMonth === 'June' ? 4 : 1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDay, setModalDay] = useState<number | null>(null);

  // Dynamic current real-time today calculation
  const realToday = new Date();
  const todayDateStr = `${realToday.getFullYear()}-${String(realToday.getMonth() + 1).padStart(2, '0')}-${String(realToday.getDate()).padStart(2, '0')}`;

  // Synchronize selected day when activeDay changes
  useEffect(() => {
    if (activeDay && activeDay !== 'all') {
      setSelectedDay(activeDay);
    } else {
      setSelectedDay(activeMonth === 'June' ? 4 : 1);
    }
  }, [activeMonth, activeDay]);

  const daysArr = Array.from({ length: totalDays }, (_, i) => i + 1);
  const calendarCells = [...Array(emptyDaysBefore).fill(null), ...daysArr];

  // Helper to find courses running on a specific day in selected month
  const getSessionsForDay = (day: number) => {
    const monthNum = MONTH_TO_NUM[activeMonth] || '06';
    const dayStr = String(day).padStart(2, '0');
    const targetDateStr = `${activeYear}-${monthNum}-${dayStr}`;

    return sessions.filter(session => {
      return targetDateStr >= session.startDate && targetDateStr <= session.endDate;
    });
  };

  const getDayName = (dayNum: number) => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const index = (dayNum - 1 + config.startDay) % 7;
    return daysOfWeek[index];
  };

  const selectedDaySessions = modalDay ? getSessionsForDay(modalDay) : [];

  return (
    <div id="calendar-view-container" className="w-full space-y-6">
      {/* Calendar Grid card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-600" />
            Lịch Đào Tạo
          </h2>

          {/* Month & Year Dropdown selection */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select 
                value={activeMonth}
                onChange={(e) => setActiveMonth?.(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-slate-50/75 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-350 rounded-xl px-3 py-1.5 pr-8 cursor-pointer outline-none transition-all appearance-none shadow-3xs"
                title="Chọn Tháng"
              >
                {Object.keys(MONTHS_CONFIG).map(m => (
                  <option key={m} value={m}>{VI_MONTH_NAMES[m] || m}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            </div>

            <div className="relative">
              <select 
                value={activeYear}
                onChange={(e) => setActiveYear?.(Number(e.target.value))}
                className="text-xs font-bold text-slate-800 bg-slate-50/75 hover:bg-slate-100/70 border border-slate-200 hover:border-slate-350 rounded-xl px-3 py-1.5 pr-8 cursor-pointer outline-none transition-all appearance-none shadow-3xs"
                title="Chọn Năm"
              >
                {[2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">
          <div>CN</div>
          <div>T2</div>
          <div>T3</div>
          <div>T4</div>
          <div>T5</div>
          <div>T6</div>
          <div>T7</div>
        </div>

        {/* Calendar Grid Cells */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarCells.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="bg-slate-50/30 rounded-xl min-h-[60px] sm:min-h-[135px] border border-dashed border-slate-100" />;
            }

            const daySessions = getSessionsForDay(day);
            const isToday = realToday.getDate() === day && 
                            String(realToday.getMonth() + 1).padStart(2, '0') === (MONTH_TO_NUM[activeMonth] || '06') && 
                            realToday.getFullYear() === activeYear;
            const isSelected = selectedDay === day;
            const isFilterSelected = activeDay !== 'all' && activeDay === day;

            return (
              <div
                key={`day-${day}`}
                onClick={() => {
                  setSelectedDay(day);
                  setModalDay(day);
                  setIsModalOpen(true);
                }}
                className={`min-h-[60px] sm:min-h-[135px] p-1.5 sm:p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group/cell ${
                  isFilterSelected
                    ? 'bg-emerald-50/30 border-emerald-400 ring-2 ring-emerald-100 shadow-sm'
                    : isSelected 
                    ? 'bg-indigo-50/30 border-indigo-400 ring-2 ring-indigo-100 shadow-xs' 
                    : isToday 
                    ? 'bg-orange-50/10 border-orange-300 ring-2 ring-orange-50' 
                    : 'bg-white border-slate-200 hover:border-slate-350 hover:shadow-xs'
                }`}
              >
                {/* Date marking */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] sm:text-[11px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded ${
                    isToday 
                      ? 'bg-orange-500 text-white font-black' 
                      : isFilterSelected
                      ? 'bg-emerald-600 text-white'
                      : isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-700 bg-slate-100 group-hover/cell:bg-slate-200 transition-colors'
                  }`}>
                    {day}
                  </span>
                  {daySessions.length > 0 && (
                    <span className="text-[9px] font-black text-slate-400 font-mono hidden sm:inline">
                      {daySessions.length} khóa
                    </span>
                  )}
                </div>

                {/* Dots on mobile */}
                <div className="flex sm:hidden justify-center gap-0.5 mt-1 overflow-hidden">
                  {daySessions.slice(0, 3).map(s => {
                    const c = courses.find(item => item.id === s.courseId);
                    let dotColor = "bg-slate-400";
                    if (c?.category === 'Safety') dotColor = "bg-amber-500";
                    else if (c?.category === 'Environment') dotColor = "bg-emerald-500";
                    else if (c?.category === 'Emergency') dotColor = "bg-rose-500";
                    else if (c?.category === 'Health') dotColor = "bg-teal-500";
                    else if (c?.category === 'Compliance') dotColor = "bg-indigo-500";
                    return <span key={s.id} className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />;
                  })}
                  {daySessions.length > 3 && (
                    <span className="text-[7px] text-slate-400 font-bold leading-none">+</span>
                  )}
                </div>

                {/* Timetable-like mini cards */}
                <div className="mt-2 space-y-1.5 flex-1 min-h-0 overflow-y-auto max-h-[85px] scrollbar-thin hidden sm:block">
                  {daySessions.map(s => {
                    const c = courses.find(item => item.id === s.courseId);
                    if (!c) return null;

                    const style = CATEGORY_STYLES[c.category] || { 
                      bg: 'bg-slate-50 hover:bg-slate-150', 
                      border: 'border-l-[3px] border-slate-500 border-t border-r border-b border-slate-150', 
                      text: 'text-slate-900', 
                      textAccent: 'text-slate-700' 
                    };

                    return (
                      <div
                        key={s.id}
                        className={`text-[9px] p-1.5 rounded-md ${style.bg} ${style.border} transition-all flex flex-col justify-between shadow-[0_1px_1px_rgba(0,0,0,0.03)]`}
                        title={`${c.title} | ${s.startTime}-${s.endTime}`}
                      >
                        <div className="flex items-center justify-between font-mono gap-0.5 leading-none">
                          <span className={`font-black ${style.textAccent} truncate text-[8.5px]`}>{c.code}</span>
                          <span className="text-[7.5px] text-slate-500 scale-95 origin-right shrink-0 font-medium">{s.startTime}</span>
                        </div>
                        <div className={`font-semibold ${style.text} truncate leading-tight mt-0.5 text-[8.5px]`}>
                          {c.title}
                        </div>
                      </div>
                    );
                  })}
                  {daySessions.length === 0 && (
                    <div className="h-full flex items-center justify-center py-4" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pop-up Window Modal showing courses happening for clicked day */}
      {isModalOpen && modalDay !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
            onClick={() => setIsModalOpen(false)}
          />

          {/* Modal Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 z-10 animate-in fade-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-[#559b8c] rounded-xl">
                  <Calendar className="h-5 w-5 text-indigo-700" />
                </div>
                <div>
                  <h3 className="text-md font-bold text-slate-900 tracking-tight leading-none">
                    Khóa Học Được Lên Lịch Cho Ngày {modalDay}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1 uppercase font-mono">
                    Thứ tự ngày {modalDay} {VI_MONTH_NAMES[activeMonth] || activeMonth}, {activeYear}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-650 p-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content List */}
            <div className="py-4 overflow-y-auto flex-1 space-y-4">
              {selectedDaySessions.length === 0 ? (
                <div className="text-center py-10 bg-slate-50/50 border border-slate-200 border-dashed rounded-xl p-6">
                  <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-bold">Không có khóa học nào được lên lịch cho ngày này.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Không có đợt đăng ký hoặc khóa học nào diễn ra trong ngày này.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDaySessions.map(session => {
                    const c = courses.find(item => item.id === session.courseId);
                    if (!c) return null;

                    const status = getSessionStatus(session.startDate, session.endDate, todayDateStr);

                    return (
                      <div 
                        key={session.id}
                        className="bg-white border border-slate-150 rounded-xl p-5 hover:border-[#559b8c] hover:shadow-2xs transition-all flex flex-col gap-3.5"
                      >
                        {/* Status, Course code */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono font-black text-slate-505 bg-slate-50 border border-slate-150 px-2.5 py-0.5 rounded uppercase tracking-wider font-semibold">
                              {c.code}
                            </span>
                            <span className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded uppercase tracking-wider border ${
                              session.method === 'Online' 
                                ? 'bg-sky-100 text-sky-800 border-sky-200' 
                                : 'bg-emerald-100 text-emerald-850 border-emerald-200'
                            }`}>
                              {session.method === 'Online' ? 'Trực tuyến' : 'Trực tiếp'}
                            </span>
                          </div>
                          
                          {/* Status Badge */}
                          <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full truncate ${
                            status === 'ON-GOING' ? 'bg-emerald-100 text-emerald-800 animate-pulse font-extrabold' :
                            status === 'UP-COMING' ? 'bg-sky-100 text-sky-800' : 'bg-slate-105 text-slate-600'
                          }`}>
                            {status === 'ON-GOING' ? 'Đang diễn ra' : status === 'UP-COMING' ? 'Sắp diễn ra' : 'Đã hoàn thành'}
                          </span>
                        </div>

                        {/* Title of course */}
                        <div className="text-left">
                          <h4 className="text-sm font-black text-slate-905 leading-tight">
                            {c.title}
                          </h4>
                        </div>

                        {/* Allowed details grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 pt-1 text-[11px] text-slate-600 font-semibold text-left">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Địa điểm</span>
                              <span className="text-slate-800 font-bold truncate block">{session.classroom}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Clock className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Thời gian & Ngày</span>
                              <span className="text-slate-800 font-bold block">{session.startTime} - {session.endTime}</span>
                              <span className="text-[10px] text-slate-400 block italic mt-0.5 font-medium">📅 Từ {session.startDate} đến {session.endDate}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Giảng viên</span>
                              <span className="text-slate-800 font-bold truncate block">{session.instructor.split(' (')[0]}</span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <SlidersHorizontal className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Hình thức</span>
                              <span className="text-slate-850 font-bold block">
                                {session.method === 'Online' ? 'Trực tuyến' : 'Trực tiếp'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Users className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Trợ giảng (TA)</span>
                              <span className="text-slate-850 font-bold block whitespace-pre-wrap leading-tight">
                                {session.taOfficer || 'Chưa phân công'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <Users className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Trợ lý giảng viên (TG)</span>
                              <span className="text-slate-850 font-bold block whitespace-pre-wrap leading-tight">
                                {session.tgOfficer || 'Chưa phân công'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-[#559b8c] hover:bg-[#3f766a] rounded-xl transition-all shadow-md active:scale-95 cursor-pointer font-sans"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
