/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CourseCategory = 'Safety' | 'Environment' | 'Emergency' | 'Health' | 'Compliance';

export type CourseDomain = 'OPITO/GWO' | 'HSE' | 'Decree' | 'Formal';

export type CourseLevel = 'Basic' | 'Intermediate' | 'Advanced';

export interface Course {
  id: string;
  code: string;
  title: string;
  category: CourseCategory;
  level: CourseLevel;
  description: string;
  syllabus: string[];
  durationDays: number;
  certificationEarned: string;
  domain?: CourseDomain;
  periods?: number;
  quizQuestions?: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface CourseSession {
  id: string;
  courseId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  instructor: string;
  classroom: string;
  maxCapacity: number;
  enrolledIds: string[]; // List of user IDs enrolled
  taOfficer?: string; // Teaching Assisstance (TA)
  tgOfficer?: string; // Teacher Assistance (TG)
  method?: 'Online' | 'Offline';
  notes?: string;
  domain?: CourseDomain;
  subModules?: Record<string, string | {
    instructor: string;
    date: string;
    startTime: string;
    endTime: string;
    classroom: string;
    taOfficers?: string[];
    theoryClassroom?: string;
    practiceArea?: string;
  }>;
}

export interface UserProgress {
  userId: string;
  courseId: string;
  sessionId: string;
  quizPassed: boolean;
  certificateId?: string;
  completedAt?: string;
}

export interface Classroom {
  id: string;
  name: string;
  capacity: number;
  building: string;
}

export interface ScheduleConflict {
  type: 'instructor' | 'classroom';
  description: string;
  sessionIds: string[];
}

export interface Member {
  id: string;
  name: string;
  dob: string;
  position: string;
  email: string;
  createdAt: string;
  avatar?: string;
  phone?: string;
  authorizedLevel?: string;
  password?: string;
}

export interface Task {
  id: string;
  assignedBy: string; // Name of authorized member, e.g. "Vuong Le"
  assignedTo: string; // Email of assigned member
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  status: 'Pending' | 'In Progress' | 'Completed';
  createdAt: string;
  sessionId?: string;
  courseName?: string;
  assignedRole?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  taOfficer?: string;
  tgOfficer?: string;
  method?: 'Online' | 'Offline';
  instructor?: string;
}

