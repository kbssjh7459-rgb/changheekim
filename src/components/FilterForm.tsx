import Link from 'next/link';
import { SEOUL_DISTRICTS } from '@/lib/normalize';
import { CHANNEL_LABELS, SURFACE_LABELS } from '@/lib/labels';
import type { VenueFilters } from '@/lib/filterVenues';
import type { ReservationChannel, SportType, SurfaceType } from '@/types';

const SPORTS: SportType[] = ['축구', '풋살'];
const SURFACES: SurfaceType[] = ['인조잔디', '천연잔디', '맨땅', '기타'];
const CHANNELS: ReservationChannel[] = ['SEOUL_YEYAK', 'DISTRICT_SITE', 'PLATFORM', 'PHONE_VISIT', 'UNKNOWN'];

/**
 * 순수 HTML GET 폼. 자바스크립트 없이도 제출 시 쿼리스트링이 그대로 URL에 반영되고,
 * 그 URL을 새 탭에 붙여넣으면 서버 컴포넌트가 searchParams로 같은 결과를 그린다.
 */
export function FilterForm({ filters }: { filters: VenueFilters }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="district" className="text-xs font-medium text-gray-600">자치구</label>
        <select id="district" name="district" defaultValue={filters.district ?? ''} className="rounded border border-gray-300 px-2 py-1 text-sm">
          <option value="">전체</option>
          {SEOUL_DISTRICTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-xs font-medium text-gray-600">종목</legend>
        <div className="flex gap-3">
          {SPORTS.map((sport) => (
            <label key={sport} className="flex items-center gap-1 text-sm">
              <input type="checkbox" name="sport" value={sport} defaultChecked={filters.sports.includes(sport)} />
              {sport}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor="surface" className="text-xs font-medium text-gray-600">잔디</label>
        <select id="surface" name="surface" defaultValue={filters.surface ?? ''} className="rounded border border-gray-300 px-2 py-1 text-sm">
          <option value="">전체</option>
          {SURFACES.map((s) => (
            <option key={s} value={s}>{SURFACE_LABELS[s]}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="channel" className="text-xs font-medium text-gray-600">예약 채널</label>
        <select id="channel" name="channel" defaultValue={filters.channel ?? ''} className="rounded border border-gray-300 px-2 py-1 text-sm">
          <option value="">전체</option>
          {CHANNELS.map((c) => (
            <option key={c} value={c}>{CHANNEL_LABELS[c]}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-1 text-sm">
        <input type="checkbox" name="night" value="1" defaultChecked={filters.nightOnly} />
        야간조명만
      </label>

      <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700">
        필터 적용
      </button>
      <Link href="/" className="text-sm text-gray-500 underline">초기화</Link>
    </form>
  );
}
