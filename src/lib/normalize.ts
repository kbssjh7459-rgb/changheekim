import { createHash } from 'node:crypto';
import type { PriceRule, ReservationChannel, SportType, SurfaceType } from '@/types';
import { SEOUL_DISTRICTS } from './districts';

export { SEOUL_DISTRICTS };

/**
 * 원본 수치 문자열을 숫자로 변환한다.
 * 전각 공백·쉼표 등 오염 문자를 제거하고, 남는 게 없으면 undefined를 반환한다.
 * (원본에 "3366.㎡"처럼 단위가 붙는 사례가 있어 숫자·소수점 외 문자는 전부 버린다)
 */
export function parseNumeric(raw?: string | null): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[^\d.]/g, '').trim();
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/** 위도/경도 문자열 → 숫자. 범위를 벗어나면 오염값으로 보고 undefined. */
export function parseCoordinate(raw?: string | null, kind: 'lat' | 'lng' = 'lat'): number | undefined {
  const n = parseNumeric(raw);
  if (n === undefined) return undefined;
  const [min, max] = kind === 'lat' ? [-90, 90] : [-180, 180];
  return n >= min && n <= max ? n : undefined;
}

/**
 * "(평일)55000+(평일야간)27500+(주말)27500", "50000원(평일)+60000원(주말)",
 * "평일:66000+주말:85800", "75000", "0" 같은 요금 문자열을 구간별로 쪼갠다.
 * 구간을 못 알아내도 raw는 항상 보존한다.
 */
export function parseFeeRule(raw?: string | null): PriceRule | undefined {
  if (!raw || !raw.trim()) return undefined;
  const segments = raw.split('+').map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return undefined;

  const entries = segments.map((seg) => {
    const amount = parseNumeric(seg) ?? 0;
    const label = seg
      .replace(/[()]/g, ' ')
      .replace(/[\d,원:]/g, '')
      .trim();
    return { label: label || '기본', amount };
  });

  return { raw, entries };
}

const SPORT_KEYWORDS: [pattern: RegExp, sport: SportType][] = [
  [/축구/, '축구'],
  [/풋살/, '풋살'],
];

/** "축구장", "축구장+테니스장", "풋살경기장" 등에서 실제 축구/풋살 종목만 뽑는다. */
export function detectSports(openFcltyType?: string | null): SportType[] {
  if (!openFcltyType) return [];
  const found = SPORT_KEYWORDS.filter(([pattern]) => pattern.test(openFcltyType)).map(([, s]) => s);
  return [...new Set(found)];
}

/** 시설명 등 원문에 "인조잔디"/"천연잔디" 언급이 있으면 그대로 쓴다. 언급 없으면 기타(미상). */
export function detectSurface(...texts: (string | null | undefined)[]): SurfaceType {
  const combined = texts.filter(Boolean).join(' ');
  if (/천연잔디/.test(combined)) return '천연잔디';
  if (/인조잔디/.test(combined)) return '인조잔디';
  return '기타';
}

/** 부대시설 문자열에 "조명" 언급이 있으면 야간조명 보유로 본다. 언급 없으면 미확인 → false. */
export function detectNightLighting(etcFclty?: string | null): boolean {
  if (!etcFclty) return false;
  return /조명/.test(etcFclty);
}

const CHANNEL_RULES: [pattern: RegExp, channel: ReservationChannel][] = [
  [/인터넷|온라인|홈페이지|예약시스템|앱|공유누리/, 'DISTRICT_SITE'],
  [/방문|전화|팩스|이메일|우편|현장|추첨|선착순/, 'PHONE_VISIT'],
];

/**
 * 신청방법구분(sbscrptnMthSe) 원문 → ReservationChannel 매핑.
 * 이 함수는 신청방법 "문구"만 보고 판단한다. 서울 yeyak(OA-2266) 매칭으로
 * SEOUL_YEYAK을 붙이는 건 build-dataset.ts의 병합 단계 책임이다.
 */
export function mapReservationChannel(sbscrptnMthSe?: string | null): ReservationChannel {
  if (!sbscrptnMthSe || !sbscrptnMthSe.trim()) return 'UNKNOWN';
  for (const [pattern, channel] of CHANNEL_RULES) {
    if (pattern.test(sbscrptnMthSe)) return channel;
  }
  return 'UNKNOWN';
}

/** "서울특별시 은평구 진관1로 46" → "은평구". 서울 주소가 아니면 undefined. */
export function extractSeoulDistrict(address?: string | null): string | undefined {
  if (!address) return undefined;
  // \b는 한글에서 동작하지 않음(\w가 ASCII 전용) → 공백/문자열 끝 lookahead로 대체
  const match = address.match(/서울특별시\s*([가-힣]+구)(?=\s|$)/);
  if (!match) return undefined;
  const district = match[1];
  return (SEOUL_DISTRICTS as readonly string[]).includes(district) ? district : undefined;
}

/** district+name(+선택 salt)으로 안정적인 슬러그를 만든다. 같은 입력 → 항상 같은 값. */
export function generateVenueId(parts: { district: string; name: string; salt?: string }): string {
  const key = `${parts.district}|${parts.name}|${parts.salt ?? ''}`;
  const hash = createHash('sha1').update(key, 'utf-8').digest('hex').slice(0, 10);
  return `venue-${hash}`;
}
