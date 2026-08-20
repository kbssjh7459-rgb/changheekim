import Link from 'next/link';
import { loadOpenSchedule } from '@/lib/openScheduleData';
import { loadVenues } from '@/lib/venues';
import { expandOpenRule, formatRuleText } from '@/lib/openSchedule';
import { buildMonthGrid } from '@/lib/calendarGrid';

interface Occurrence {
  date: Date;
  venueId: string;
  venueName: string;
  district: string;
  ruleText: string;
  note?: string;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function MonthSection({ year, monthIndex, occurrences }: { year: number; monthIndex: number; occurrences: Occurrence[] }) {
  const weeks = buildMonthGrid(year, monthIndex);
  return (
    <div>
      <h2 className="font-semibold text-gray-900">{year}년 {monthIndex + 1}월</h2>
      <table className="mt-2 w-full table-fixed border-collapse text-center text-sm">
        <thead>
          <tr className="text-gray-400">
            {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
              <th key={d} className="pb-1 font-normal">{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wi) => (
            <tr key={wi}>
              {week.map((day, di) => {
                const dayOccurrences = day ? occurrences.filter((o) => sameDay(o.date, day)) : [];
                return (
                  <td key={di} className="h-16 align-top border border-gray-100 p-1">
                    {day && (
                      <>
                        <div className="text-xs text-gray-400">{day.getDate()}</div>
                        {dayOccurrences.map((o) => (
                          <Link
                            key={o.venueId}
                            href={`/venues/${o.venueId}`}
                            className="mt-0.5 block truncate rounded bg-red-50 px-1 text-[11px] text-red-700 hover:underline"
                            title={o.venueName}
                          >
                            {o.venueName}
                          </Link>
                        ))}
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CalendarPage() {
  const schedule = loadOpenSchedule();
  const venues = loadVenues();
  const venueMap = new Map(venues.map((v) => [v.id, v]));

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);

  const occurrences: Occurrence[] = schedule.flatMap((entry) => {
    const venue = venueMap.get(entry.venueId);
    if (!venue) return [];
    return expandOpenRule(entry.rule, thisMonthStart, nextMonthEnd).map((date) => ({
      date,
      venueId: entry.venueId,
      venueName: venue.name,
      district: venue.district,
      ruleText: formatRuleText(entry.rule),
      note: entry.note,
    }));
  });

  const upcoming = occurrences.filter((o) => o.date >= now).sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-gray-500 underline">← 목록으로</Link>
      <h1 className="mt-3 text-2xl font-bold text-gray-900">접수 오픈 캘린더</h1>
      <p className="mt-1 text-sm text-gray-500">
        패턴이 확실히 확인된 구장만 표시합니다. 나머지는 상세 페이지의 자격요건에서 개별 오픈 안내를 확인하세요.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <MonthSection year={thisMonthStart.getFullYear()} monthIndex={thisMonthStart.getMonth()} occurrences={occurrences} />
        <MonthSection
          year={new Date(now.getFullYear(), now.getMonth() + 1, 1).getFullYear()}
          monthIndex={new Date(now.getFullYear(), now.getMonth() + 1, 1).getMonth()}
          occurrences={occurrences}
        />
      </div>

      <section className="mt-8">
        <h2 className="font-semibold text-gray-900">다가오는 오픈 일정</h2>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">확인된 일정이 없습니다.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200">
            {upcoming.map((o, i) => (
              <li key={i} className="flex items-center justify-between gap-2 p-3 text-sm">
                <div>
                  <Link href={`/venues/${o.venueId}`} className="font-medium text-gray-900 hover:underline">
                    {o.venueName}
                  </Link>
                  <span className="ml-2 text-gray-400">{o.district}</span>
                  {o.note && <p className="mt-0.5 text-xs text-gray-400">{o.note}</p>}
                </div>
                <div className="shrink-0 text-right text-gray-600">
                  <div>{o.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</div>
                  <div className="text-xs text-gray-400">{o.ruleText}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
