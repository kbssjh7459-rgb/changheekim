import type { TeamProfile, VenuePolicy } from '@/types';

export interface EligibilityResult {
  status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'UNKNOWN';
  reasons: string[];
}

/**
 * 팀 프로필 기준 자격 판정. 순수 함수 — 서버 저장 없음(팀 프로필은 localStorage 전용).
 * policy가 없으면 판정 근거 자체가 없으므로 UNKNOWN.
 */
export function checkEligibility(team: TeamProfile, policy?: VenuePolicy): EligibilityResult {
  if (!policy) {
    return { status: 'UNKNOWN', reasons: ['자격요건 미조사'] };
  }

  const reasons: string[] = [];
  let unknown = false;
  let notEligible = false;

  if (policy.residency.required) {
    if (team.memberCount === 0) {
      unknown = true;
      reasons.push('팀원이 0명이라 거주 비율을 계산할 수 없음');
    } else {
      const district = policy.residency.district;
      const count = (district && team.districtDistribution[district]) || 0;

      if (policy.residency.minCount !== undefined) {
        if (count >= policy.residency.minCount) {
          reasons.push(`${district ?? ''} 거주 팀원 ${count}명 (최소 ${policy.residency.minCount}명 충족)`);
        } else {
          notEligible = true;
          reasons.push(`${district ?? ''} 거주 팀원 ${count}명 (최소 ${policy.residency.minCount}명 필요)`);
        }
      } else if (policy.residency.minRatioPercent !== undefined) {
        const ratio = (count / team.memberCount) * 100;
        if (ratio >= policy.residency.minRatioPercent) {
          reasons.push(`${district ?? ''} 거주 비율 ${ratio.toFixed(0)}% (최소 ${policy.residency.minRatioPercent}% 충족)`);
        } else {
          notEligible = true;
          reasons.push(`${district ?? ''} 거주 비율 ${ratio.toFixed(0)}% (최소 ${policy.residency.minRatioPercent}% 필요)`);
        }
      }
    }
  }

  if (policy.requiresRegisteredTeam && !team.isRegisteredTeam) {
    notEligible = true;
    reasons.push('등록단체 요건 있음 (미등록 팀)');
  }

  if (unknown) return { status: 'UNKNOWN', reasons };
  if (notEligible) return { status: 'NOT_ELIGIBLE', reasons };
  if (reasons.length === 0) reasons.push('별도 자격요건 없음');
  return { status: 'ELIGIBLE', reasons };
}
