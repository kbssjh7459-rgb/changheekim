import { describe, expect, it } from 'vitest';
import { buildMonthGrid } from './calendarGrid';

describe('buildMonthGrid', () => {
  it('모든 주는 7칸이다', () => {
    const weeks = buildMonthGrid(2026, 7); // 2026-08
    weeks.forEach((week) => expect(week).toHaveLength(7));
  });

  it('그 달의 날짜 수만큼 채운다 (null 제외)', () => {
    const weeks = buildMonthGrid(2026, 1); // 2026-02, 28일
    const flat = weeks.flat().filter((d): d is Date => d !== null);
    expect(flat).toHaveLength(28);
    expect(flat[0].getDate()).toBe(1);
    expect(flat[flat.length - 1].getDate()).toBe(28);
  });

  it('1일이 일요일 시작 기준으로 올바른 요일 칸에 온다', () => {
    // 2026-08-01은 토요일 (getDay()=6)
    const weeks = buildMonthGrid(2026, 7);
    expect(weeks[0][6]?.getDate()).toBe(1);
    expect(weeks[0].slice(0, 6).every((d) => d === null)).toBe(true);
  });
});
