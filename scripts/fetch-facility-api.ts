/**
 * 공공데이터포털 「전국공공시설개방정보표준데이터」 전량 수집.
 * 엔드포인트: https://api.data.go.kr/openapi/tn_pubr_public_pblfclt_opn_info_api
 * 실행: npx tsx --env-file=.env.local scripts/fetch-facility-api.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { z } from 'zod';

const ENDPOINT = 'https://api.data.go.kr/openapi/tn_pubr_public_pblfclt_opn_info_api';
const NUM_OF_ROWS = 1000;
const OUT_PATH = 'data/raw/facility-open-api.json';

const FacilityItemSchema = z.object({
  openFcltyNm: z.string().optional(),
  openLcNm: z.string().optional(),
  openFcltyType: z.string().optional(),
  rstde: z.string().optional(),
  weekdayOperOpenHhmm: z.string().optional(),
  weekdayOperColseHhmm: z.string().optional(),
  wkendOperOpenHhmm: z.string().optional(),
  wkendOperCloseHhmm: z.string().optional(),
  pchrgUseYn: z.string().optional(),
  useStdrTime: z.string().optional(),
  rntfee: z.string().optional(),
  excessUseUnitTime: z.string().optional(),
  excessRntfee: z.string().optional(),
  aceptncPosblCo: z.string().optional(),
  ar: z.string().optional(),
  etcFclty: z.string().optional(),
  sbscrptnMthSe: z.string().optional(),
  fcltyPicInfo: z.string().optional(),
  rdnmadr: z.string().optional(),
  lnmadr: z.string().optional(),
  institutionNm: z.string().optional(),
  chrgDeptNm: z.string().optional(),
  phoneNumber: z.string().optional(),
  homepageUrl: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  referenceDate: z.string().optional(),
  insttCode: z.string().optional(),
  insttNm: z.string().optional(),
});

// items: { item: [...] } 구조. item이 결과 1건일 때 배열이 아닌 단일 객체로 오는
// 공공데이터포털 고질병까지 함께 방어한다.
const ItemsSchema = z.preprocess((val: unknown) => {
  const item = (val as { item?: unknown } | null | undefined)?.item;
  return Array.isArray(item) ? item : item ? [item] : [];
}, z.array(FacilityItemSchema));

const ResponseSchema = z.object({
  header: z.object({ resultCode: z.string(), resultMsg: z.string() }),
  body: z
    .object({
      items: ItemsSchema.optional().default([]),
      numOfRows: z.number(),
      pageNo: z.number(),
      totalCount: z.number(),
    })
    .nullable(), // resultCode 03(NODATA_ERROR)일 때 body가 null로 옴
});

async function fetchPage(serviceKey: string, pageNo: number) {
  // serviceKey는 data.go.kr이 발급한 Encoding 키(이미 %-인코딩됨) → URLSearchParams로 재인코딩하면 깨짐
  const url = `${ENDPOINT}?serviceKey=${serviceKey}&pageNo=${pageNo}&numOfRows=${NUM_OF_ROWS}&type=json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} on page ${pageNo}`);
  }
  const json = await res.json();
  const parsed = ResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.error('스키마 검증 실패:', JSON.stringify(json).slice(0, 500));
    throw new Error(`Zod 검증 실패 (page ${pageNo}): ${parsed.error.message}`);
  }
  const { header, body } = parsed.data;
  if (header.resultCode === '03') {
    return { items: [], numOfRows: NUM_OF_ROWS, pageNo, totalCount: -1 }; // 더 이상 데이터 없음
  }
  if (header.resultCode !== '00' || !body) {
    throw new Error(`API 에러: ${header.resultCode} ${header.resultMsg}`);
  }
  return body;
}

async function main() {
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error('DATA_GO_KR_SERVICE_KEY 없음 (.env.local 확인)');
  }

  const allItems: z.infer<typeof FacilityItemSchema>[] = [];
  let pageNo = 1;
  let totalCount = Infinity;

  while (allItems.length < totalCount) {
    const body = await fetchPage(serviceKey, pageNo);
    totalCount = body.totalCount;
    allItems.push(...body.items);
    console.log(`page ${pageNo}: +${body.items.length}건 (누적 ${allItems.length}/${totalCount})`);
    if (body.items.length === 0) break; // 무한루프 방지
    pageNo += 1;
    await new Promise((r) => setTimeout(r, 300));
  }

  mkdirSync('data/raw', { recursive: true });
  writeFileSync(
    OUT_PATH,
    JSON.stringify({ fetchedAt: new Date().toISOString(), totalCount, items: allItems }, null, 2),
    'utf-8',
  );
  console.log(`\n완료: ${allItems.length}건 → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
