import Link from 'next/link';
import { loadVenues } from '@/lib/venues';
import { parseFilters, applyFilters } from '@/lib/filterVenues';
import { FilterForm } from '@/components/FilterForm';
import { VenueCard } from '@/components/VenueCard';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const filters = parseFilters(resolvedSearchParams);
  const venues = applyFilters(loadVenues(), filters);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">ground-pass</h1>
        <Link href="/calendar" className="text-sm text-blue-600 hover:underline">접수 오픈 캘린더 →</Link>
      </div>
      <p className="mt-1 text-sm text-gray-500">서울 공공 축구·풋살장 통합 조회</p>

      <div className="mt-6">
        <FilterForm filters={filters} />
      </div>

      <p className="mt-4 text-sm text-gray-500">{venues.length}건</p>

      {venues.length === 0 ? (
        <p className="mt-8 text-center text-gray-400">조건에 맞는 구장이 없습니다.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </ul>
      )}
    </main>
  );
}
