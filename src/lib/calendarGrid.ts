/** 월간 캘린더 그리드. 일요일 시작, 주 단위 배열. 앞뒤 빈 칸은 null. */
export function buildMonthGrid(year: number, monthIndex: number): (Date | null)[][] {
  const firstDay = new Date(year, monthIndex, 1);
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0=일요일

  const cells: (Date | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => new Date(year, monthIndex, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}
