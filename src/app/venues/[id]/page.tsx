import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadVenues } from '@/lib/venues';
import { CHANNEL_LABELS, COVERAGE_LABELS, SURFACE_LABELS } from '@/lib/labels';
import { VenueEligibility } from '@/components/VenueEligibility';

const ALLOCATION_LABELS: Record<string, string> = {
  선착순: '선착순',
  추첨: '추첨',
  혼합: '선착순+추첨 혼합',
  미확인: '미확인',
};

export default async function VenueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venue = loadVenues().find((v) => v.id === id);
  if (!venue) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm text-gray-500 underline">← 목록으로</Link>

      <div className="mt-3 flex items-start justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
        <span className="shrink-0 text-sm text-gray-500">{venue.district}</span>
      </div>
      <p className="mt-1 text-sm text-gray-500">{venue.operator}</p>
      {venue.address && <p className="mt-1 text-sm text-gray-400">{venue.address}</p>}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {venue.sports.map((sport) => (
          <span key={sport} className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
            {sport}
          </span>
        ))}
        <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-600/20">
          {SURFACE_LABELS[venue.surface]}
        </span>
        {venue.hasNightLighting && (
          <span className="rounded-full bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
            야간조명
          </span>
        )}
        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
          {CHANNEL_LABELS[venue.channel]}
        </span>
        <span className="rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20">
          {COVERAGE_LABELS[venue.coverage]}
        </span>
      </div>

      {venue.priceRule && (
        <div className="mt-4 text-sm text-gray-700">
          <span className="font-medium">요금: </span>
          {venue.priceRule.entries.map((e) => `${e.label} ${e.amount.toLocaleString()}원`).join(' / ')}
        </div>
      )}

      {venue.reserveUrl && (
        <a
          href={venue.reserveUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          예약 채널 바로가기 →
        </a>
      )}

      <section className="mt-8">
        <h2 className="font-semibold text-gray-900">자격요건</h2>
        {venue.policy ? (
          <div className="mt-2 overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <th className="w-32 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">거주 요건</th>
                  <td className="px-3 py-2">
                    {venue.policy.residency.required
                      ? venue.policy.residency.note ?? `${venue.policy.residency.district ?? ''} 거주/재직 요건 있음`
                      : '없음'}
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <th className="bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">등록단체</th>
                  <td className="px-3 py-2">{venue.policy.requiresRegisteredTeam ? '사전 등록 필요' : '불필요'}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <th className="bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">배정 방식</th>
                  <td className="px-3 py-2">{ALLOCATION_LABELS[venue.policy.allocation]}</td>
                </tr>
                {venue.policy.openRule && (
                  <tr className="border-b border-gray-100">
                    <th className="bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">오픈 일정</th>
                    <td className="px-3 py-2">{venue.policy.openRule}</td>
                  </tr>
                )}
                {venue.policy.penalty && (
                  <tr>
                    <th className="bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">페널티</th>
                    <td className="px-3 py-2">{venue.policy.penalty}</td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="border-t border-gray-100 px-3 py-2 text-xs text-gray-400">
              출처:{' '}
              <a href={venue.policy.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                {venue.policy.sourceUrl}
              </a>
              {' · '}최종확인일 {venue.policy.verifiedAt}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-400">자격요건 미조사</p>
        )}
      </section>

      <section className="mt-6">
        <VenueEligibility policy={venue.policy} />
      </section>
    </main>
  );
}
