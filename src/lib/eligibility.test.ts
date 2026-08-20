import { describe, expect, it } from 'vitest';
import { checkEligibility } from './eligibility';
import type { TeamProfile, VenuePolicy } from '@/types';

function makeTeam(overrides: Partial<TeamProfile> = {}): TeamProfile {
  return {
    districtDistribution: {},
    memberCount: 0,
    isRegisteredTeam: false,
    ...overrides,
  };
}

function makePolicy(overrides: Partial<VenuePolicy> = {}): VenuePolicy {
  return {
    residency: { required: false },
    requiresRegisteredTeam: false,
    allocation: '선착순',
    sourceUrl: 'https://example.com',
    verifiedAt: '2026-08-20',
    ...overrides,
  };
}

describe('checkEligibility', () => {
  it('policy가 없으면 UNKNOWN', () => {
    const result = checkEligibility(makeTeam(), undefined);
    expect(result.status).toBe('UNKNOWN');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('거주 요건도 등록단체 요건도 없으면 ELIGIBLE', () => {
    const policy = makePolicy({ residency: { required: false } });
    const team = makeTeam({ memberCount: 5 });
    expect(checkEligibility(team, policy).status).toBe('ELIGIBLE');
  });

  it('등록단체 요건인데 미등록이면 NOT_ELIGIBLE', () => {
    const policy = makePolicy({ requiresRegisteredTeam: true });
    const team = makeTeam({ memberCount: 5, isRegisteredTeam: false });
    const result = checkEligibility(team, policy);
    expect(result.status).toBe('NOT_ELIGIBLE');
    expect(result.reasons.join(' ')).toMatch(/등록/);
  });

  it('등록단체 요건이고 등록됐으면 ELIGIBLE', () => {
    const policy = makePolicy({ requiresRegisteredTeam: true });
    const team = makeTeam({ memberCount: 5, isRegisteredTeam: true });
    expect(checkEligibility(team, policy).status).toBe('ELIGIBLE');
  });

  it('팀원 0명이면 거주비율 계산 불가 → UNKNOWN', () => {
    const policy = makePolicy({
      residency: { required: true, district: '구로구', minRatioPercent: 80 },
    });
    const team = makeTeam({ memberCount: 0, districtDistribution: {} });
    expect(checkEligibility(team, policy).status).toBe('UNKNOWN');
  });

  it('거주비율 경계값(정확히 최소치)은 통과', () => {
    const policy = makePolicy({
      residency: { required: true, district: '구로구', minRatioPercent: 50 },
    });
    const team = makeTeam({ memberCount: 10, districtDistribution: { 구로구: 5 } }); // 정확히 50%
    expect(checkEligibility(team, policy).status).toBe('ELIGIBLE');
  });

  it('거주비율이 최소치보다 낮으면 NOT_ELIGIBLE', () => {
    const policy = makePolicy({
      residency: { required: true, district: '구로구', minRatioPercent: 80 },
    });
    const team = makeTeam({ memberCount: 10, districtDistribution: { 구로구: 7 } }); // 70%
    const result = checkEligibility(team, policy);
    expect(result.status).toBe('NOT_ELIGIBLE');
    expect(result.reasons.join(' ')).toMatch(/구로구/);
  });

  it('거주비율 요건 + 등록단체 요건 둘 다 있으면 둘 다 충족해야 ELIGIBLE', () => {
    const policy = makePolicy({
      residency: { required: true, district: '구로구', minRatioPercent: 80 },
      requiresRegisteredTeam: true,
    });
    const passRatioOnly = makeTeam({ memberCount: 10, districtDistribution: { 구로구: 9 }, isRegisteredTeam: false });
    expect(checkEligibility(passRatioOnly, policy).status).toBe('NOT_ELIGIBLE');

    const passBoth = makeTeam({ memberCount: 10, districtDistribution: { 구로구: 9 }, isRegisteredTeam: true });
    expect(checkEligibility(passBoth, policy).status).toBe('ELIGIBLE');
  });

  it('minCount 요건(구민 최소 인원수)도 지원한다', () => {
    const policy = makePolicy({
      residency: { required: true, district: '강서구', minCount: 3 },
    });
    const under = makeTeam({ memberCount: 10, districtDistribution: { 강서구: 2 } });
    const meets = makeTeam({ memberCount: 10, districtDistribution: { 강서구: 3 } });
    expect(checkEligibility(under, policy).status).toBe('NOT_ELIGIBLE');
    expect(checkEligibility(meets, policy).status).toBe('ELIGIBLE');
  });
});
