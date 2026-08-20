/** 매월 특정 날짜(예: 15일) 반복 */
export interface MonthlyDayRule {
  type: 'MONTHLY_DAY';
  day: number; // 1~31. 해당 월에 없는 날짜(예: 31일의 2월)면 그 달은 말일로 당겨서 처리
  time: string; // 'HH:MM'
}

/** 매월 N째주 요일(예: 둘째주 수요일) 반복 */
export interface MonthlyNthWeekdayRule {
  type: 'MONTHLY_NTH_WEEKDAY';
  nth: 1 | 2 | 3 | 4 | 5;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=일요일 ... 6=토요일 (Date.getDay() 규칙)
  time: string; // 'HH:MM'
}

export type OpenRule = MonthlyDayRule | MonthlyNthWeekdayRule;

export interface OpenScheduleEntry {
  venueId: string;
  rule: OpenRule;
  note?: string; // '익월분 예약 오픈' 등
  sourceUrl: string;
  verifiedAt: string;
}
