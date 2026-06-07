/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Calendar, Users, MapPin, Clock } from 'lucide-react';
import { Course, CourseSession } from '../types';

interface CalendarViewProps {
  courses: Course[];
  sessions: CourseSession[];
  onSelectCourse: (course: Course, session: CourseSession) => void;
  activeMonth?: string;
  activeDay?: number | 'all';
  activeYear?: number;
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

export default function CalendarView({ courses, sessions, onSelectCourse, activeMonth = 'June', activeDay = 'all', activeYear = 2026 }: CalendarViewProps) {
  const config = MONTHS_CONFIG[activeMonth] || MONTHS_CONFIG['June'];
  const emptyDaysBefore = config.emptyDaysBefore;
  const isLeapYear = (activeYear % 4 === 0 && activeYear % 100 !== 0) || (activeYear % 400 === 0);
  const totalDays = activeMonth === 'February' && isLeapYear ? 29 : config.days;

  const [selectedDay, setSelectedDay] = useState<number | null>(activeMonth === 'June' ? 4 : 1);

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

  const selectedDaySessions = selectedDay ? getSessionsForDay(selectedDay) : [];

  return (
    <div id="calendar-view-container" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Grid card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="h-5 w-5 text-slate-600" />
            Classroom Monthly Calendar Planner
          </h2>
          <span className="text-sm font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full font-mono uppercase">
            {activeMonth} {activeYear}
          </span>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center font-semibold text-xs text-slate-500 uppercase tracking-wider mb-2">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Grid Cells */}
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="bg-slate-50/50 rounded-lg min-h-[90px] border border-dashed border-slate-100" />;
            }

            const isDayInSelectedDayRange = activeDay === 'all' || day === activeDay;

            if (!isDayInSelectedDayRange) {
              // Dim and disable cells not in the active day
              return (
                <div
                  key={`day-${day}`}
                  className="min-h-[95px] p-2 rounded-lg border border-slate-150 bg-slate-50/20 opacity-20 select-none pointer-events-none flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded text-slate-400 bg-slate-50">
                      {day}
                    </span>
                  </div>
                  <div className="mt-1" />
                </div>
              );
            }

            const daySessions = getSessionsForDay(day);
            const isToday = activeMonth === 'June' && day === 4;
            const isSelected = selectedDay === day;

            return (
              <div
                key={`day-${day}`}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[95px] p-2 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-indigo-50/40 border-indigo-400 ring-1 ring-indigo-400' 
                    : isToday 
                    ? 'bg-orange-50/30 border-orange-300' 
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Date marking */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                    isToday 
                      ? 'bg-orange-500 text-white font-black' 
                      : isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-700 bg-slate-100'
                  }`}>
                    {day}
                  </span>
                  {daySessions.length > 0 && (
                    <span className="text-[9px] font-bold text-slate-400 font-mono">
                      {daySessions.length} active
                    </span>
                  )}
                </div>

                {/* Badges labels */}
                <div className="mt-1 space-y-0.5 max-h-[55px] overflow-hidden">
                  {daySessions.slice(0, 2).map(s => {
                    const c = courses.find(item => item.id === s.courseId);
                    if (!c) return null;

                    // Styles mapping
                    const colorMap: Record<string, string> = {
                      'Safety': 'bg-amber-100 text-amber-800 border-amber-200',
                      'Environment': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      'Emergency': 'bg-rose-100 text-rose-800 border-rose-200',
                      'Health': 'bg-teal-100 text-teal-850 border-teal-200',
                      'Compliance': 'bg-indigo-100 text-indigo-850 border-indigo-200',
                    };

                    return (
                      <div
                        key={s.id}
                        className={`text-[9px] font-semibold px-1 rounded truncate border ${colorMap[c.category] || 'bg-slate-100 text-slate-800'}`}
                        title={c.title}
                      >
                        {c.code}
                      </div>
                    );
                  })}
                  {daySessions.length > 2 && (
                    <div className="text-[8px] text-center text-slate-400 font-bold">
                      +{daySessions.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda details card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="border-b border-slate-200 pb-3 mb-4">
            <h3 className="text-md font-bold text-slate-900 tracking-tight">
              Day Schedule Explorer
            </h3>
            <p className="text-xs text-slate-500">
              Selected: <span className="font-semibold text-indigo-700">{activeMonth} {selectedDay}, {activeYear}</span>
            </p>
          </div>

          {selectedDaySessions.length === 0 ? (
            <div className="text-center py-10 bg-white border border-slate-200 border-dashed rounded-xl p-4">
              <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">No sessions scheduled for this day.</p>
              <p className="text-[10px] text-slate-400 mt-1">Select other dates in the planner grid above.</p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
              {selectedDaySessions.map(session => {
                const c = courses.find(item => item.id === session.courseId);
                if (!c) return null;

                const catStyles: Record<string, string> = {
                  'Safety': 'bg-amber-100 text-amber-800 border-amber-200',
                  'Environment': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  'Emergency': 'bg-rose-100 text-rose-800 border-rose-200',
                  'Health': 'bg-teal-100 text-teal-800 border-teal-200',
                  'Compliance': 'bg-indigo-100 text-indigo-800 border-indigo-200',
                };

                return (
                  <div
                    key={session.id}
                    onClick={() => onSelectCourse(c, session)}
                    className="p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${catStyles[c.category]}`}>
                        {c.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">
                        {c.code}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                      {c.title}
                    </h4>

                    <div className="mt-2 space-y-1 text-[10px] text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{session.startTime} - {session.endTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span className="truncate">{session.classroom}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3 w-3 text-slate-400" />
                        <span>{session.enrolledIds.length} / {session.maxCapacity} Enrolled ({session.maxCapacity - session.enrolledIds.length} left)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Occupancy average is active</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
        </div>
      </div>
    </div>
  );
}
