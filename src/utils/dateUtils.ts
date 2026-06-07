/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MonthWeek {
  weekNum: number;
  startDay: number;
  endDay: number;
  label: string;
}

export const MONTH_TO_NUM: Record<string, string> = {
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

export const MONTH_WEEKS_MAP: Record<string, number[]> = {
  'January': [1, 2, 3, 4],
  'February': [5, 6, 7, 8],
  'March': [9, 10, 11, 12],
  'April': [13, 14, 15, 16],
  'May': [17, 18, 19, 20],
  'June': [21, 22, 23, 24],
  'July': [25, 26, 27, 28],
  'August': [29, 30, 31, 32],
  'September': [33, 34, 35, 36],
  'October': [37, 38, 39, 40],
  'November': [41, 42, 43, 44],
  'December': [45, 46, 47, 48, 49, 50, 51, 52]
};

export interface MonthDay {
  dayNum: number;
  label: string;
}

export function getDaysForMonth(month: string, year: number = 2026): MonthDay[] {
  const MONTHS_LIST = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (mIdx: number, yr: number) => {
    return new Date(yr, mIdx + 1, 0).getDate();
  };

  const monthIndex = MONTHS_LIST.indexOf(month);
  if (monthIndex === -1) {
    return [];
  }

  const daysInThisMonth = getDaysInMonth(monthIndex, year);
  const monthNum = MONTH_TO_NUM[month] || '01';

  const daysList: MonthDay[] = [];
  for (let d = 1; d <= daysInThisMonth; d++) {
    const sDay = String(d).padStart(2, '0');
    daysList.push({
      dayNum: d,
      label: `Day ${d} (${sDay}/${monthNum}/${year})`
    });
  }
  return daysList;
}

