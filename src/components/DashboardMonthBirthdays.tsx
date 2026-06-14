/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Member } from '../types';
import { Cake, Sparkles, Gift, Calendar, Clock, User } from 'lucide-react';
import { formatDate } from '../utils/date';

interface DashboardMonthBirthdaysProps {
  members: Member[];
  activeMonth: string;
  activeYear: number;
}

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

export default function DashboardMonthBirthdays({ members, activeMonth, activeYear }: DashboardMonthBirthdaysProps) {
  const currentMonthIdx = useMemo(() => MONTH_LIST.indexOf(activeMonth), [activeMonth]);

  const birthdayMembers = useMemo(() => {
    if (currentMonthIdx === -1) return [];

    // Form "today's" reference date within the current active month selection
    // Day index set to 4 to match the standard app's timeline reference point 'XXXX-XX-04'
    const monthNum = String(currentMonthIdx + 1).padStart(2, '0');
    const todayStr = `${activeYear}-${monthNum}-04`;
    const today = new Date(todayStr);

    return members
      .filter((m) => {
        // Exclude SETC Creator Admin
        const isCreator = m.id === 'mem-creator' || 
                          m.email.toLowerCase() === 'setcadmin' || 
                          m.email.toLowerCase() === 'setcadmin@safetycentre.org';
        if (isCreator) return false;

        const birthDate = new Date(m.dob);
        if (isNaN(birthDate.getTime())) return false;
        return birthDate.getMonth() === currentMonthIdx;
      })
      .map((m) => {
        const birthDate = new Date(m.dob);

        // Calculate dynamic current age on today reference date
        let age = today.getFullYear() - birthDate.getFullYear();
        const mDiff = today.getMonth() - birthDate.getMonth();
        const dDiff = today.getDate() - birthDate.getDate();
        if (mDiff < 0 || (mDiff === 0 && dDiff < 0)) {
          age--;
        }

        // Calculate upcoming birthday occurrence
        let nextYear = today.getFullYear();
        let nextBday = new Date(nextYear, birthDate.getMonth(), birthDate.getDate());

        // If safety reference birthday has already elapsed this active month, the upcoming one is next year
        if (nextBday < today) {
          nextYear += 1;
          nextBday = new Date(nextYear, birthDate.getMonth(), birthDate.getDate());
        }

        // Exactly round out differences in calendar days
        const t1 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
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
  }, [members, currentMonthIdx, activeMonth, activeYear]);

  return (
    <div id="dashboard-month-birthdays" className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3">
      {/* Mini Title bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 border-b border-slate-100 pb-2 text-left">
        <div className="flex items-center gap-2 flex-row">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <Cake className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-1.5 flex-row">
              <span>Sinh nhật trong {VI_MONTH_MAP[activeMonth] || activeMonth}</span>
              {birthdayMembers.length > 0 && (
                <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-250 animate-pulse flex-row">
                  <Sparkles className="h-2 w-2 animate-spin duration-3000" />
                  {birthdayMembers.length} thành viên
                </span>
              )}
            </h3>
          </div>
        </div>
      </div>

      {birthdayMembers.length === 0 ? (
        <div className="flex items-center gap-2 py-2 px-3 bg-slate-50 border border-slate-200/65 rounded-lg flex-row text-left">
          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200/50">
            <User className="h-3.5 w-3.5" />
          </div>
          <div className="leading-tight">
            <span className="text-slate-500 font-bold text-xs font-sans">Không có sinh nhật nào trong tháng này.</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {birthdayMembers.map(({ member, formattedDob, age, nextBdayStr, daysRemaining, isToday }) => (
            <div 
              key={member.id} 
              className={`p-3 rounded-lg border flex flex-col justify-between transition-all duration-150 relative overflow-hidden group select-default text-left ${
                isToday 
                  ? 'bg-emerald-50/20 border-emerald-250 hover:border-emerald-300 shadow-2xs' 
                  : 'bg-slate-50/30 border-slate-200/80 hover:border-slate-300/80 hover:bg-slate-50/50'
              }`}
            >
              {/* Abs shine bg for live matches */}
              {isToday && (
                <div className="absolute right-0 top-0 h-12 w-12 bg-emerald-500/5 rounded-bl-full pointer-events-none flex items-start justify-end p-1.5">
                  <Sparkles className="h-3 w-3 text-emerald-500 animate-pulse" />
                </div>
              )}
              
              <div className="space-y-2">
                {/* Header section with identity */}
                <div className="flex items-center gap-2 flex-row">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[10px] shrink-0 overflow-hidden shadow-2xs border ${
                    isToday ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {member.avatar ? (
                      <img src={member.avatar} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                    ) : (
                      member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 leading-tight">
                    <h4 className="font-extrabold text-slate-900 text-xs truncate group-hover:text-emerald-700 transition-colors">
                      {member.name}
                    </h4>
                    <p className="text-[9px] text-slate-400 truncate font-semibold mt-0.5">{member.position || 'Thành viên'}</p>
                  </div>
                </div>

                {/* Details layout strictly required (full name, DOB, age, upcoming birthday, remaining day till upcoming birhtday) */}
                <div className="space-y-1 border-t border-slate-100/80 pt-2 text-[10px]">
                  <div className="flex justify-between items-center text-slate-500 font-sans flex-row">
                    <span className="flex items-center gap-1 flex-row">
                      <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                      Ngày sinh:
                    </span>
                    <span className="font-mono font-bold text-slate-705">{formattedDob}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-500 font-sans flex-row">
                    <span className="flex items-center gap-1 font-sans flex-row">
                      <User className="h-3 w-3 text-slate-400 shrink-0" />
                      Tuổi:
                    </span>
                    <span className="font-bold text-slate-800">{age} tuổi</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-500 font-sans flex-row">
                    <span className="flex items-center gap-1 flex-row">
                      <Gift className="h-3 w-3 text-slate-400 shrink-0" />
                      Sinh nhật tới:
                    </span>
                    <span className="font-semibold text-slate-750 font-mono">{nextBdayStr}</span>
                  </div>
                </div>
              </div>

              {/* Day Countdown footer bar info */}
              <div className="mt-2 pt-1.5 border-t border-slate-100/60 flex items-center justify-between flex-row">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1 flex-row">
                  <Clock className="h-2.5 w-2.5 text-slate-400" />
                  Đếm ngược
                </span>
                {isToday ? (
                  <span className="bg-emerald-500 text-white font-black text-[9px] px-2 py-0.5 rounded-sm animate-pulse border border-emerald-600 uppercase tracking-wider">
                    Hôm nay! 🎉
                  </span>
                ) : (
                  <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded-sm ${
                    daysRemaining <= 15 
                      ? 'bg-amber-100 text-amber-950 border border-amber-250' 
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    Còn {daysRemaining} ngày
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
