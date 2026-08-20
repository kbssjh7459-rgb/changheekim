import Link from 'next/link';
import type { Venue } from '@/types';
import { CHANNEL_LABELS, COVERAGE_LABELS, SURFACE_LABELS } from '@/lib/labels';

const CHANNEL_BADGE_STYLE: Record<Venue['channel'], string> = {
  SEOUL_YEYAK: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  DISTRICT_SITE: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  PLATFORM: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  PHONE_VISIT: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  UNKNOWN: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const COVERAGE_BADGE_STYLE: Record<Venue['coverage'], string> = {
  LIVE: 'bg-green-50 text-green-700 ring-green-600/20',
  SCHEDULE_ONLY: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  LINK_ONLY: 'bg-gray-50 text-gray-600 ring-gray-500/20',
  UNKNOWN: 'bg-gray-50 text-gray-500 ring-gray-400/20',
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}

export function VenueCard({ venue }: { venue: Venue }) {
  return (
    <li className="rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900">
          <Link href={`/venues/${venue.id}`} className="hover:underline">{venue.name}</Link>
        </h3>
        <span className="shrink-0 text-sm text-gray-500">{venue.district}</span>
      </div>

      <p className="mt-1 text-sm text-gray-500">{venue.operator}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {venue.sports.map((sport) => (
          <Badge key={sport} className="bg-indigo-50 text-indigo-700 ring-indigo-600/20">
            {sport}
          </Badge>
        ))}
        <Badge className="bg-teal-50 text-teal-700 ring-teal-600/20">{SURFACE_LABELS[venue.surface]}</Badge>
        {venue.hasNightLighting && (
          <Badge className="bg-orange-50 text-orange-700 ring-orange-600/20">야간조명</Badge>
        )}
        <Badge className={CHANNEL_BADGE_STYLE[venue.channel]}>{CHANNEL_LABELS[venue.channel]}</Badge>
        <Badge className={COVERAGE_BADGE_STYLE[venue.coverage]}>{COVERAGE_LABELS[venue.coverage]}</Badge>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        {venue.policy ? (
          <>
            자격요건 확인됨 (
            <a href={venue.policy.sourceUrl} target="_blank" rel="noreferrer" className="underline">
              출처
            </a>
            , {venue.policy.verifiedAt})
          </>
        ) : (
          <span className="text-gray-400">자격요건 미조사</span>
        )}
      </p>

      {venue.reserveUrl && (
        <a
          href={venue.reserveUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          예약 채널 바로가기 →
        </a>
      )}
    </li>
  );
}
