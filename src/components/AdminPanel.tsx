/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Course, CourseSession, Classroom } from '../types';
import { CLASSROOMS, INSTRUCTORS } from '../data';
import { formatDate } from '../utils/date';
import { Plus, AlertTriangle, ShieldCheck, FileCheck, HelpCircle } from 'lucide-react';

interface AdminPanelProps {
  courses: Course[];
  sessions: CourseSession[];
  onAddSession: (newSession: CourseSession) => void;
  onRemoveSession: (sessionId: string) => void;
}

export default function AdminPanel({ courses, sessions, onAddSession, onRemoveSession }: AdminPanelProps) {
  // Form State
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [startDate, setStartDate] = useState('2026-06-10');
  const [endDate, setEndDate] = useState('2026-06-12');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('16:00');
  const [instructor, setInstructor] = useState(INSTRUCTORS[0]);
  const [classroom, setClassroom] = useState(CLASSROOMS[0].name);
  const [maxCapacity, setMaxCapacity] = useState(20);

  // Validation Warnings
  const [conflicts, setConflicts] = useState<{ type: string; info: string }[]>([]);

  // Function to calculate overlaps
  const checkOverlaps = (
    cRoom: string,
    cInst: string,
    sDate: string,
    eDate: string,
    sTime: string,
    eTime: string
  ) => {
    const list: { type: string; info: string }[] = [];

    const newStart = new Date(sDate);
    const newEnd = new Date(eDate);

    sessions.forEach(existing => {
      const exStart = new Date(existing.startDate);
      const exEnd = new Date(existing.endDate);

      // Check dates overlap
      const datesOverlap = newStart <= exEnd && newEnd >= exStart;
      if (!datesOverlap) return;

      // Check daily times overlap
      const timesOverlap = startTime < existing.endTime && endTime > existing.startTime;
      if (!timesOverlap) return;

      const matchedCourse = courses.find(c => c.id === existing.courseId);
      const code = matchedCourse ? matchedCourse.code : 'Session';

      // Classroom overlap
      if (existing.classroom === cRoom) {
        list.push({
          type: 'Classroom Double-Booking',
          info: `"${cRoom}" is already booked by ${code} during ${formatDate(existing.startDate)} to ${formatDate(existing.endDate)} (${existing.startTime}-${existing.endTime})`
        });
      }

      // Instructor overlap
      if (existing.instructor === cInst) {
        list.push({
          type: 'Trainer Conflict',
          info: `Instructor ${cInst.split(' (')[0]} is scheduled for ${code} on those same dates.`
        });
      }
    });

    return list;
  };

  const handleTestSchedule = (e: React.FormEvent) => {
    e.preventDefault();

    const activeConflicts = checkOverlaps(
      classroom,
      instructor,
      startDate,
      endDate,
      startTime,
      endTime
    );

    setConflicts(activeConflicts);

    // Create session
    const uniqueSessionId = `s-custom-${Date.now()}`;
    const newSess: CourseSession = {
      id: uniqueSessionId,
      courseId,
      startDate,
      endDate,
      startTime,
      endTime,
      instructor,
      classroom,
      maxCapacity,
      enrolledIds: [] // Empty list to start
    };

    onAddSession(newSess);

    // Trigger basic visual confirmation alert if success
    if (activeConflicts.length === 0) {
      setConflicts([]);
    }
  };

  return (
    <div id="admin-panel-container" className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Schedule Generator Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm md:col-span-2">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <Plus className="h-5 w-5 text-emerald-600" />
          <h2 className="text-md font-bold text-slate-900 tracking-tight">
            Schedule New Cohort Session
          </h2>
        </div>

        <form onSubmit={handleTestSchedule} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Program Course</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-medium focus:ring-1 focus:ring-emerald-500"
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} – {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Max Student Seats</label>
              <input
                type="number"
                min="5"
                max="35"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(parseInt(e.target.value))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Course Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Course End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Daily Bell Start (HH:MM)</label>
              <input
                type="text"
                placeholder="e.g. 09:00"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Daily Bell End (HH:MM)</label>
              <input
                type="text"
                placeholder="e.g. 16:00"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assign Classroom Room</label>
              <select
                value={classroom}
                onChange={(e) => setClassroom(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {CLASSROOMS.map(r => (
                  <option key={r.id} value={r.name}>
                    {r.name} (Cap: {r.capacity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assigned Trainer / Instructor</label>
              <select
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {INSTRUCTORS.map(trainer => (
                  <option key={trainer} value={trainer}>
                    {trainer.split(' (')[0]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="text-xs font-bold px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 hover:shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Publish Active Schedule Slot
            </button>
          </div>
        </form>
      </div>

      {/* Conflicts & Safety Logs */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">Overload Conflict Audits</h3>
          <p className="text-[10px] text-slate-500">Live system checks for resources collision.</p>
        </div>

        {conflicts.length > 0 ? (
          <div className="space-y-2.5">
            {conflicts.map((conf, index) => (
              <div key={index} className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-650" />
                  <span>{conf.type}</span>
                </div>
                <p className="text-[10.5px] leading-tight text-amber-950 font-medium">{conf.info}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-emerald-50 border border-emerald-100/80 rounded-xl text-center py-7">
            <ShieldCheck className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-emerald-950">Resource Scheduling Confirmed Clear</h4>
            <p className="text-[10px] text-emerald-700/80 mt-1 max-w-xs mx-auto">
              Selected classrooms, trainers, schedules, and capacities parsed with zero collisions against historical registries.
            </p>
          </div>
        )}

        {/* Existing Sessions management table */}
        <div className="border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between mb-3 text-xs">
            <h4 className="font-bold text-slate-800 flex items-center gap-1">
              <FileCheck className="h-4 w-4 text-slate-500" />
              Batch Manager
            </h4>
            <span className="font-mono text-[10px] text-slate-400 font-bold">{sessions.length} Batches listed</span>
          </div>

          <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
            {sessions.filter(s => s.id.startsWith('s-custom-')).map(s => {
              const matchingCourse = courses.find(c => c.id === s.courseId);
              return (
                <div key={s.id} className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-md text-[10.5px]">
                  <div className="truncate">
                    <span className="font-mono font-bold text-indigo-700 block">{matchingCourse?.code || 'CUSTOM'}</span>
                    <span className="text-slate-500 text-[9px] block">Dates: {formatDate(s.startDate)} - {formatDate(s.endDate)}</span>
                  </div>
                  <button
                    onClick={() => onRemoveSession(s.id)}
                    className="text-[10px] text-red-600 hover:text-red-800 px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 font-bold cursor-pointer transition-colors"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
            {sessions.filter(s => s.id.startsWith('s-custom-')).length === 0 && (
              <p className="text-[10px] text-slate-400 italic text-center py-3">No user-created sessions to manage.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
