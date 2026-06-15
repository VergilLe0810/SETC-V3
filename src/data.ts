/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Course, CourseSession, Classroom } from './types';

export const CLASSROOMS: Classroom[] = [
  { id: 'room-101', name: 'Phòng thực hành An toàn Chính (Phòng 101)', capacity: 25, building: 'Nhà A (Trụ sở Đào tạo An toàn)' },
  { id: 'room-102', name: 'Phòng Vật lý Môi trường 102', capacity: 20, building: 'Nhà A (Trụ sở Đào tạo An toàn)' },
  { id: 'room-ex', name: 'Sân thực hành Diễn tập Phòng cháy Chữa cháy', capacity: 30, building: 'Khu vực Ngoài trời' },
  { id: 'room-conf', name: 'Phòng mô phỏng Không gian hạn chế Công nghiệp', capacity: 15, building: 'Khu Phụ trợ Đào tạo' },
  { id: 'room-eco', name: 'Phòng thí nghiệm Phân tích Hệ sinh thái B', capacity: 20, building: 'Nhà B (Khu Sinh thái)' },
];

export const INSTRUCTORS: string[] = [
  'TS. Elena Rostova (Chuyên gia Tuân thủ Môi trường)',
  'Chỉ huy James McCallister (Cán bộ Hoạt động Cứu nạn)',
  'Sarah Jenkins (Giảng viên Ủy quyền OSHA)',
  'David Vance (Chuyên gia Phân tích Nguy cơ Hóa chất)',
  'Marcus Aureli (Cố vấn Sức khỏe Nghề nghiệp)',
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
