/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Course, CourseSession, Classroom } from './types';

export const CLASSROOMS: Classroom[] = [
  { id: 'room-101', name: 'Main Safety Lab (Room 101)', capacity: 25, building: 'Block A (Safety HQ)' },
  { id: 'room-102', name: 'Environmental Physics Room 102', capacity: 20, building: 'Block A (Safety HQ)' },
  { id: 'room-ex', name: 'Practical Fire Simulation Ground', capacity: 30, building: 'Outdoor Yard' },
  { id: 'room-conf', name: 'Industrial Mock Confined Tank Room', capacity: 15, building: 'Training Annex' },
  { id: 'room-eco', name: 'Eco-System Analysis Lab B', capacity: 20, building: 'Block B (Eco Labs)' },
];

export const INSTRUCTORS: string[] = [
  'Dr. Elena Rostova (Environmental Compliance Expert)',
  'Chief James McCallister (Rescue Operations Officer)',
  'Sarah Jenkins (OSHA Authorized Trainer)',
  'David Vance (Chemical Hazards Analyst)',
  'Marcus Aureli (Industrial Health Consultant)',
];

export const INITIAL_COURSES: Course[] = [];

export const INITIAL_SESSIONS: CourseSession[] = [];

// Helper functions for parsing session states relative to simulated current time (June 4, 2026)
export const getSessionStatus = (startStr: string, endStr: string, todayStr = '2026-06-04') => {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const today = new Date(todayStr);

  // Strip hours to compare days
  start.setHours(0,0,0,0);
  end.setHours(0,0,0,0);
  today.setHours(0,0,0,0);

  if (today >= start && today <= end) {
    return 'ON-GOING';
  } else if (today < start) {
    return 'UP-COMING';
  } else {
    return 'COMPLETED';
  }
};
