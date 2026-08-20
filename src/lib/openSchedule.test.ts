import { describe, expect, it } from 'vitest';
import { expandOpenRule, formatRuleText } from './openSchedule';
import type { MonthlyDayRule, MonthlyNthWeekdayRule } from '@/types';

describe('expandOpenRule - MONTHLY_DAY', () => {
  it('범위 안의 매월 지정일을 전개한다', () => {
    const rule: MonthlyDayRule = { type: 'MONTHLY_DAY', day: 15, time: '13:00' };
    const dates = expandOpenRule(rule, new Date(2026, 7, 1), new Date(2026, 9, 0)); // 8~9월
    expect(dates).toHaveLength(2);
    expect(dates[0]).toEqual(new Date(2026, 7, 15, 13, 0));
    expect(dates[1]).toEqual(new Date(2026, 8, 15, 13, 0));
  });

  it('날짜순으로 정렬되어 나온다', () => {
    const rule: MonthlyDayRule = { type: 'MONTHLY_DAY', day: 15, time: '13:00' };
    const dates = expandOpenRule(rule, new Date(2026, 7, 1), new Date(2026, 9, 0));
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    expect(dates).toEqual(sorted);
  });

  it('해당 월에 없는 날짜(31일)는 말일로 당긴다', () => {
    const rule: MonthlyDayRule = { type: 'MONTHLY_DAY', day: 31, time: '09:00' };
    // 2026년 2월은 28일까지
    const dates = expandOpenRule(rule, new Date(2026, 1, 1), new Date(2026, 1, 28, 23, 59));
    expect(dates).toHaveLength(1);
    expect(dates[0]).toEqual(new Date(2026, 1, 28, 9, 0));
  });

  it('범위 경계 밖은 제외한다', () => {
    const rule: MonthlyDayRule = { type: 'MONTHLY_DAY', day: 15, time: '13:00' };
    const dates = expandOpenRule(rule, new Date(2026, 7, 16), new Date(2026, 7, 31)); // 8/16~8/31만
    expect(dates).toHaveLength(0);
  });
});

describe('expandOpenRule - MONTHLY_NTH_WEEKDAY', () => {
  it('매월 둘째주 수요일을 전개한다', () => {
    // 2026년 8월: 수요일은 5,12,19,26일 → 둘째주 수요일 = 12일
    const rule: MonthlyNthWeekdayRule = { type: 'MONTHLY_NTH_WEEKDAY', nth: 2, weekday: 3, time: '10:00' };
    const dates = expandOpenRule(rule, new Date(2026, 7, 1), new Date(2026, 7, 31));
    expect(dates).toHaveLength(1);
    expect(dates[0]).toEqual(new Date(2026, 7, 12, 10, 0));
  });

  it('5째주가 없는 달은 건너뛴다', () => {
    // 2026년 8월 수요일은 5,12,19,26일 → 5째주 없음
    const rule: MonthlyNthWeekdayRule = { type: 'MONTHLY_NTH_WEEKDAY', nth: 5, weekday: 3, time: '10:00' };
    const dates = expandOpenRule(rule, new Date(2026, 7, 1), new Date(2026, 7, 31));
    expect(dates).toHaveLength(0);
  });
});

describe('formatRuleText', () => {
  it('MONTHLY_DAY를 사람이 읽는 문구로 바꾼다', () => {
    expect(formatRuleText({ type: 'MONTHLY_DAY', day: 15, time: '13:00' })).toBe('매월 15일 13:00');
  });

  it('MONTHLY_NTH_WEEKDAY를 사람이 읽는 문구로 바꾼다', () => {
    expect(formatRuleText({ type: 'MONTHLY_NTH_WEEKDAY', nth: 2, weekday: 3, time: '10:00' })).toBe('매월 둘째주 수요일 10:00');
  });
});
