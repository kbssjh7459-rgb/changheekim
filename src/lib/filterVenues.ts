import type { ReservationChannel, SportType, SurfaceType, Venue } from '@/types';

export interface VenueFilters {
  district?: string;
  sports: SportType[];
  surface?: SurfaceType;
  nightOnly: boolean;
  channel?: ReservationChannel;
}

type RawSearchParams = Record<string, string | string[] | undefined>;

const SPORT_VALUES: SportType[] = ['축구', '풋살'];
const SURFACE_VALUES: SurfaceType[] = ['인조잔디', '천연잔디', '맨땅', '기타'];
const CHANNEL_VALUES: ReservationChannel[] = [
  'SEOUL_YEYAK', 'DISTRICT_SITE', 'PLATFORM', 'PHONE_VISIT', 'UNKNOWN',
];

function toArray(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

/** URL 쿼리스트링(Next.js searchParams) → 필터 객체. 알 수 없는 값은 무시한다. */
export function parseFilters(searchParams: RawSearchParams): VenueFilters {
  const district = toArray(searchParams.district)[0] || undefined;

  const sports = toArray(searchParams.sport).filter((s): s is SportType =>
    SPORT_VALUES.includes(s as SportType),
  );

  const surfaceRaw = toArray(searchParams.surface)[0];
  const surface = SURFACE_VALUES.includes(surfaceRaw as SurfaceType) ? (surfaceRaw as SurfaceType) : undefined;

  const nightOnly = toArray(searchParams.night)[0] === '1';

  const channelRaw = toArray(searchParams.channel)[0];
  const channel = CHANNEL_VALUES.includes(channelRaw as ReservationChannel)
    ? (channelRaw as ReservationChannel)
    : undefined;

  return { district, sports, surface, nightOnly, channel };
}

export function applyFilters(venues: Venue[], filters: VenueFilters): Venue[] {
  return venues.filter((v) => {
    if (filters.district && v.district !== filters.district) return false;
    if (filters.sports.length > 0 && !filters.sports.some((s) => v.sports.includes(s))) return false;
    if (filters.surface && v.surface !== filters.surface) return false;
    if (filters.nightOnly && !v.hasNightLighting) return false;
    if (filters.channel && v.channel !== filters.channel) return false;
    return true;
  });
}
