export type ReservationChannel =
  | 'SEOUL_YEYAK' // 서울시 공공서비스예약 통합
  | 'DISTRICT_SITE' // 자치구·공단 자체 사이트
  | 'PLATFORM' // 민간 예약 플랫폼 (taapspace 등)
  | 'PHONE_VISIT' // 전화·방문
  | 'UNKNOWN';

export type CoverageLevel =
  | 'LIVE' // 어댑터 보유. 슬롯 현황 수집됨
  | 'SCHEDULE_ONLY' // 접수 오픈 일정만 앎
  | 'LINK_ONLY' // 채널·자격요건만 제공
  | 'UNKNOWN'; // 미조사

export type SurfaceType = '인조잔디' | '천연잔디' | '맨땅' | '기타';
export type SportType = '축구' | '풋살';
export type AllocationMethod = '선착순' | '추첨' | '혼합' | '미확인';

export interface ResidencyRequirement {
  required: boolean;
  district?: string; // '강서구'
  minRatioPercent?: number; // 50 → 팀원 50% 이상
  minCount?: number;
  note?: string; // 원문 근거 문구
}

export interface VenuePolicy {
  residency: ResidencyRequirement;
  requiresRegisteredTeam: boolean;
  allocation: AllocationMethod;
  openRule?: string; // '매월 둘째주 수요일 10:00, 익월분'
  penalty?: string;
  sourceUrl: string; // 필수
  verifiedAt: string; // 'YYYY-MM-DD' 필수
}

export interface PriceEntry {
  label: string; // '평일', '평일야간', '주말' 등 원문에서 추출한 구간 이름
  amount: number;
}

export interface PriceRule {
  raw: string; // 원본 요금 문자열 (파싱 실패 대비 보존)
  entries: PriceEntry[];
}

export interface Venue {
  id: string; // 안정적 슬러그. 같은 입력이면 항상 같은 값
  name: string;
  district: string;
  operator: string; // 관리기관
  sports: SportType[];
  surface: SurfaceType;
  hasNightLighting: boolean;
  address?: string;
  lat?: number; // 원본이 문자열이면 Number() + NaN 체크
  lng?: number;
  channel: ReservationChannel;
  reserveUrl?: string;
  phone?: string;
  priceRule?: PriceRule; // 파싱된 요금
  policy?: VenuePolicy; // 미조사면 undefined
  coverage: CoverageLevel;
  adapterId?: string; // coverage === 'LIVE'일 때만
  source: 'API' | 'MANUAL' | 'MERGED';
  lastFetchedAt: string;
}
