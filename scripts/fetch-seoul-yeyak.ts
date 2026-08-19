/**
 * 서울 열린데이터광장 「서울시 체육시설 공공서비스예약 정보」(OA-2266) 전량 수집.
 * 서비스명: ListPublicReservationSport
 * 실행: npx tsx --env-file=.env.local scripts/fetch-seoul-yeyak.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { z } from 'zod';

const SERVICE_NAME = 'ListPublicReservationSport';
const PAGE_SIZE = 1000;
const OUT_PATH = 'data/raw/seoul-yeyak-sport.json';

const RowSchema = z.object({
  GUBUN: z.string().optional(),
  SVCID: z.string().optional(),
  MAXCLASSNM: z.string().optional(),
  MINCLASSNM: z.string().optional(),
  SVCSTATNM: z.string().optional(),
  SVCNM: z.string().optional(),
  PAYATNM: z.string().optional(),
  PLACENM: z.string().optional(),
  USETGTINFO: z.string().optional(),
  SVCURL: z.string().optional(),
  X: z.string().optional(),
  Y: z.string().optional(),
  SVCOPNBGNDT: z.string().optional(),
  SVCOPNENDDT: z.string().optional(),
  RCPTBGNDT: z.string().optional(),
  RCPTENDDT: z.string().optional(),
  AREANM: z.string().optional(),
  IMGURL: z.string().optional(),
  DTLCONT: z.string().optional(),
  TELNO: z.string().optional(),
  V_MIN: z.string().optional(),
  V_MAX: z.string().optional(),
  REVSTDDAYNM: z.string().optional(),
  REVSTDDAY: z.string().optional(),
});

const ResponseSchema = z.object({
  [SERVICE_NAME]: z.object({
    list_total_count: z.number(),
    RESULT: z.object({ CODE: z.string(), MESSAGE: z.string() }),
    row: z.array(RowSchema).optional().default([]),
  }),
});

async function fetchRange(apiKey: string, start: number, end: number) {
  const url = `http://openapi.seoul.go.kr:8088/${apiKey}/json/${SERVICE_NAME}/${start}/${end}/`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on range ${start}-${end}`);
  }
  const json = await res.json();
  const parsed = ResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.error('스키마 검증 실패:', JSON.stringify(json).slice(0, 500));
    throw new Error(`Zod 검증 실패 (range ${start}-${end}): ${parsed.error.message}`);
  }
  const body = parsed.data[SERVICE_NAME];
  // INFO-200 등은 정상적인 "더 이상 데이터 없음" 응답이라 에러로 취급하지 않음
  if (body.RESULT.CODE !== 'INFO-000' && body.RESULT.CODE !== 'INFO-200') {
    throw new Error(`API 에러: ${body.RESULT.CODE} ${body.RESULT.MESSAGE}`);
  }
  return body;
}

async function main() {
  const apiKey = process.env.SEOUL_OPEN_DATA_API_KEY;
  if (!apiKey) {
    throw new Error('SEOUL_OPEN_DATA_API_KEY 없음 (.env.local 확인)');
  }

  const allRows: z.infer<typeof RowSchema>[] = [];
  let start = 1;
  let totalCount = Infinity;

  while (allRows.length < totalCount) {
    const end = start + PAGE_SIZE - 1;
    const body = await fetchRange(apiKey, start, end);
    totalCount = body.list_total_count;
    allRows.push(...body.row);
    console.log(`range ${start}-${end}: +${body.row.length}건 (누적 ${allRows.length}/${totalCount})`);
    if (body.row.length === 0) break; // 무한루프 방지
    start = end + 1;
    await new Promise((r) => setTimeout(r, 300));
  }

  mkdirSync('data/raw', { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify({ fetchedAt: new Date().toISOString(), totalCount, items: allRows }, null, 2),
    'utf-8',
  );
  console.log(`\n완료: ${allRows.length}건 → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
