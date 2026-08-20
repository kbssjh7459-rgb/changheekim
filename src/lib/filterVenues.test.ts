import { describe, expect, it } from 'vitest';
import { applyFilters, parseFilters } from './filterVenues';
import type { Venue } from '@/types';

function makeVenue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: 'venue-1',
    name: '테스트구장',
    district: '강서구',
    operator: '테스트공단',
    sports: ['축구'],
    surface: '인조잔디',
    hasNightLighting: false,
    channel: 'SEOUL_YEYAK',
    coverage: 'LINK_ONLY',
    source: 'API',
    lastFetchedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('parseFilters', () => {
  it('빈 쿼리는 빈 필터', () => {
    const f = parseFilters({});
    expect(f).toEqual({ district: undefined, sports: [], surface: undefined, nightOnly: false, channel: undefined });
  });

  it('district는 단일값', () => {
    expect(parseFilters({ district: '강서구' }).district).toBe('강서구');
  });

  it('sport는 배열(반복 쿼리파라미터)로 온다', () => {
    expect(parseFilters({ sport: ['축구', '풋살'] }).sports).toEqual(['축구', '풋살']);
    expect(parseFilters({ sport: '축구' }).sports).toEqual(['축구']);
  });

  it('알 수 없는 값은 무시한다', () => {
    expect(parseFilters({ sport: ['야구'] }).sports).toEqual([]);
    expect(parseFilters({ surface: '잔디아님' }).surface).toBeUndefined();
    expect(parseFilters({ channel: 'BOGUS' }).channel).toBeUndefined();
  });

  it('night=1일 때만 nightOnly true', () => {
    expect(parseFilters({ night: '1' }).nightOnly).toBe(true);
    expect(parseFilters({ night: '0' }).nightOnly).toBe(false);
    expect(parseFilters({}).nightOnly).toBe(false);
  });
});

describe('applyFilters', () => {
  const venues = [
    makeVenue({ id: 'a', district: '강서구', sports: ['축구'], surface: '인조잔디', hasNightLighting: true, channel: 'SEOUL_YEYAK' }),
    makeVenue({ id: 'b', district: '양천구', sports: ['풋살'], surface: '기타', hasNightLighting: false, channel: 'DISTRICT_SITE' }),
    makeVenue({ id: 'c', district: '강서구', sports: ['축구', '풋살'], surface: '천연잔디', hasNightLighting: false, channel: 'PHONE_VISIT' }),
  ];

  it('필터 없으면 전부 반환', () => {
    expect(applyFilters(venues, { sports: [], nightOnly: false })).toHaveLength(3);
  });

  it('district로 좁힌다', () => {
    const result = applyFilters(venues, { district: '강서구', sports: [], nightOnly: false });
    expect(result.map((v) => v.id)).toEqual(['a', 'c']);
  });

  it('sports는 하나라도 겹치면 통과(OR)', () => {
    const result = applyFilters(venues, { sports: ['풋살'], nightOnly: false });
    expect(result.map((v) => v.id)).toEqual(['b', 'c']);
  });

  it('nightOnly는 조명 있는 곳만', () => {
    const result = applyFilters(venues, { sports: [], nightOnly: true });
    expect(result.map((v) => v.id)).toEqual(['a']);
  });

  it('surface·channel 필터', () => {
    expect(applyFilters(venues, { sports: [], nightOnly: false, surface: '기타' }).map((v) => v.id)).toEqual(['b']);
    expect(applyFilters(venues, { sports: [], nightOnly: false, channel: 'PHONE_VISIT' }).map((v) => v.id)).toEqual(['c']);
  });

  it('필터를 AND로 결합한다', () => {
    const result = applyFilters(venues, { district: '강서구', sports: ['풋살'], nightOnly: false });
    expect(result.map((v) => v.id)).toEqual(['c']);
  });
});
