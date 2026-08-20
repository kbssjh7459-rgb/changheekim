import type { CoverageLevel, ReservationChannel, SurfaceType } from '@/types';

export const CHANNEL_LABELS: Record<ReservationChannel, string> = {
  SEOUL_YEYAK: '서울시 통합예약',
  DISTRICT_SITE: '자치구·공단 자체 사이트',
  PLATFORM: '민간 플랫폼',
  PHONE_VISIT: '전화·방문',
  UNKNOWN: '채널 미확인',
};

export const COVERAGE_LABELS: Record<CoverageLevel, string> = {
  LIVE: '실시간 현황',
  SCHEDULE_ONLY: '오픈 일정만 확인',
  LINK_ONLY: '채널 링크만 제공',
  UNKNOWN: '미조사',
};

export const SURFACE_LABELS: Record<SurfaceType, string> = {
  인조잔디: '인조잔디',
  천연잔디: '천연잔디',
  맨땅: '맨땅',
  기타: '재질 미상',
};
