import type { OpenRule } from '@/types';

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const NTH_LABELS = ['', '첫째', '둘째', '셋째', '넷째', '다섯째'];

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** rangeStart~rangeEnd(포함) 사이에 걸리는 규칙 발생일시를 날짜순으로 전개한다. */
export function expandOpenRule(rule: OpenRule, rangeStart: Date, rangeEnd: Date): Date[] {
  const { hour, minute } = parseTime(rule.time);
  const results: Date[] = [];

  const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  const last = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);

  while (cursor <= last) {
    const year = cursor.getFullYear();
    const monthIndex = cursor.getMonth();
    let occurrence: Date | null = null;

    if (rule.type === 'MONTHLY_DAY') {
      const day = Math.min(rule.day, daysInMonth(year, monthIndex));
      occurrence = new Date(year, monthIndex, day, hour, minute);
    } else {
      const candidates: Date[] = [];
      const total = daysInMonth(year, monthIndex);
      for (let day = 1; day <= total; day += 1) {
        const d = new Date(year, monthIndex, day);
        if (d.getDay() === rule.weekday) candidates.push(d);
      }
      const picked = candidates[rule.nth - 1];
      if (picked) occurrence = new Date(year, monthIndex, picked.getDate(), hour, minute);
    }

    if (occurrence && occurrence >= rangeStart && occurrence <= rangeEnd) {
      results.push(occurrence);
    }

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return results.sort((a, b) => a.getTime() - b.getTime());
}

export function formatRuleText(rule: OpenRule): string {
  if (rule.type === 'MONTHLY_DAY') {
    return `매월 ${rule.day}일 ${rule.time}`;
  }
  return `매월 ${NTH_LABELS[rule.nth]}주 ${WEEKDAY_LABELS[rule.weekday]}요일 ${rule.time}`;
}
