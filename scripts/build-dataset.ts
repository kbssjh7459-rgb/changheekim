/**
 * data/raw/의 두 원본을 병합해 축구/풋살 서울 구장만 골라 data/venues.json으로 만든다.
 * 실행 전 npm run fetch:facility && npm run fetch:seoul 필요.
 * 실행: npx tsx scripts/build-dataset.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import {
  SEOUL_DISTRICTS,
  detectNightLighting,
  detectSports,
  extractSeoulDistrict,
  generateVenueId,
  mapReservationChannel,
  parseCoordinate,
  parseFeeRule,
} from '@/lib/normalize';
import type { Venue } from '@/types';

const FACILITY_RAW = 'data/raw/facility-open-api.json';
const SEOUL_RAW = 'data/raw/seoul-yeyak-sport.json';
const OUT_PATH = 'data/venues.json';

interface FacilityRawItem {
  openFcltyNm?: string;
  openFcltyType?: string;
  pchrgUseYn?: string;
  useStdrTime?: string;
  rntfee?: string;
  etcFclty?: string;
  sbscrptnMthSe?: string;
  rdnmadr?: string;
  lnmadr?: string;
  institutionNm?: string;
  phoneNumber?: string;
  homepageUrl?: string;
  latitude?: string;
  longitude?: string;
}

interface SeoulRawItem {
  SVCID?: string;
  MINCLASSNM?: string;
  SVCNM?: string;
  PLACENM?: string;
  SVCURL?: string;
  X?: string;
  Y?: string;
  AREANM?: string;
  TELNO?: string;
}

function loadRaw<T>(path: string): { fetchedAt: string; items: T[] } {
  if (!existsSync(path)) {
    throw new Error(`원본 파일 없음: ${path} (npm run fetch:facility / fetch:seoul 먼저 실행)`);
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

/** 국가 API(전국공공시설개방정보) → 서울 축구/풋살 Venue만 변환 */
function buildFromFacilityApi(items: FacilityRawItem[], fetchedAt: string): Venue[] {
  const venues: Venue[] = [];

  for (const item of items) {
    const district = extractSeoulDistrict(item.rdnmadr ?? item.lnmadr);
    if (!district) continue; // 서울 아님

    const sports = detectSports(item.openFcltyType);
    if (sports.length === 0) continue; // 축구/풋살 아님

    const name = item.openFcltyNm?.trim();
    if (!name) continue;

    venues.push({
      id: generateVenueId({ district, name, salt: 'facility-api' }),
      name,
      district,
      operator: item.institutionNm?.trim() || '확인 필요',
      sports,
      surface: '기타', // 이 API엔 재질 필드가 없음 → 미상
      hasNightLighting: detectNightLighting(item.etcFclty),
      address: item.rdnmadr || item.lnmadr || undefined,
      lat: parseCoordinate(item.latitude, 'lat'),
      lng: parseCoordinate(item.longitude, 'lng'),
      channel: mapReservationChannel(item.sbscrptnMthSe),
      reserveUrl: item.homepageUrl?.trim() || undefined,
      phone: item.phoneNumber?.trim() || undefined,
      priceRule: item.pchrgUseYn === 'Y' ? parseFeeRule(item.rntfee) : undefined,
      policy: undefined,
      coverage: 'LINK_ONLY',
      source: 'API',
      lastFetchedAt: fetchedAt,
    });
  }

  return venues;
}

/** 서울 yeyak(OA-2266) → PLACENM 단위로 묶어 Venue 변환. 슬롯 단위(SVCID) 여러 개가 시설 하나로 뭉친다. */
function buildFromSeoulYeyak(items: SeoulRawItem[], fetchedAt: string): Venue[] {
  const soccerFutsal = items.filter(
    (i) => /축구|풋살/.test(i.MINCLASSNM ?? '') && SEOUL_DISTRICTS.includes((i.AREANM ?? '') as (typeof SEOUL_DISTRICTS)[number]),
  );

  const groups = new Map<string, SeoulRawItem[]>();
  for (const item of soccerFutsal) {
    const key = item.PLACENM?.trim() || item.SVCNM?.trim() || item.SVCID || '미상';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  const venues: Venue[] = [];
  for (const [placeKey, rows] of groups) {
    const first = rows[0];
    const district = first.AREANM!;
    const parts = placeKey.split('>').map((s) => s.trim());
    const name = parts[parts.length - 1] || placeKey;
    const operator = parts.length > 1 ? parts[0] : '확인 필요';
    const sports = [...new Set(rows.flatMap((r) => detectSports(r.MINCLASSNM)))];

    venues.push({
      id: generateVenueId({ district, name, salt: 'seoul-yeyak' }),
      name,
      district,
      operator,
      sports,
      surface: '기타', // yeyak 목록 API에도 재질 필드 없음
      hasNightLighting: false, // 이 소스에서 확인 불가 → 기본값
      lat: parseCoordinate(first.Y, 'lat'),
      lng: parseCoordinate(first.X, 'lng'),
      channel: 'SEOUL_YEYAK',
      reserveUrl: first.SVCURL || undefined,
      phone: first.TELNO || undefined,
      priceRule: undefined, // yeyak 목록 API는 요금을 구조화된 필드로 안 줌(DTLCONT 자유텍스트뿐)
      policy: undefined,
      coverage: 'LINK_ONLY',
      source: 'API',
      lastFetchedAt: fetchedAt,
    });
  }

  return venues;
}

function main() {
  const facility = loadRaw<FacilityRawItem>(FACILITY_RAW);
  const seoul = loadRaw<SeoulRawItem>(SEOUL_RAW);

  const facilityVenues = buildFromFacilityApi(facility.items, facility.fetchedAt);
  const seoulVenues = buildFromSeoulYeyak(seoul.items, seoul.fetchedAt);

  // 두 소스는 서로 다른 식별자 체계라 동일 시설 여부를 신뢰성 있게 매칭할 근거가 없음.
  // 병합하지 않고 두 목록을 그대로 이어붙인다 → 같은 구장이 중복 등장할 수 있음(알려진 한계).
  const venues = [...seoulVenues, ...facilityVenues];

  writeFileSync('data/venues.json', JSON.stringify(venues, null, 2), 'utf-8');

  const byDistrict = new Map<string, number>();
  for (const v of venues) {
    byDistrict.set(v.district, (byDistrict.get(v.district) ?? 0) + 1);
  }

  console.log(`총 ${venues.length}건 → ${OUT_PATH}`);
  console.log(`  서울 yeyak(OA-2266): ${seoulVenues.length}건`);
  console.log(`  전국공공시설개방(서울만): ${facilityVenues.length}건`);
  console.log('\n자치구별 건수:');
  const missing = SEOUL_DISTRICTS.filter((d) => !byDistrict.has(d));
  for (const [district, count] of [...byDistrict.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${district}: ${count}`);
  }
  if (missing.length > 0) {
    console.log(`\n데이터 없는 구 (${missing.length}개, 크롤링 대상 후보): ${missing.join(', ')}`);
  }
}

main();
