'use client';

import { useEffect, useState } from 'react';
import { checkEligibility } from '@/lib/eligibility';
import { loadTeamProfile, saveTeamProfile, defaultTeamProfile } from '@/lib/teamProfile';
import { SEOUL_DISTRICTS } from '@/lib/districts';
import type { TeamProfile, VenuePolicy } from '@/types';

const STATUS_STYLE: Record<string, string> = {
  ELIGIBLE: 'bg-green-50 text-green-700 ring-green-600/30',
  NOT_ELIGIBLE: 'bg-red-50 text-red-700 ring-red-600/30',
  UNKNOWN: 'bg-gray-100 text-gray-500 ring-gray-400/30',
};

const STATUS_LABEL: Record<string, string> = {
  ELIGIBLE: '신청 가능',
  NOT_ELIGIBLE: '신청 불가',
  UNKNOWN: '판정 불가',
};

export function VenueEligibility({ policy }: { policy?: VenuePolicy }) {
  const [team, setTeam] = useState<TeamProfile>(defaultTeamProfile());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTeam(loadTeamProfile());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveTeamProfile(team);
  }, [team, loaded]);

  const result = checkEligibility(team, policy);
  const districtCount = policy?.residency.district
    ? team.districtDistribution[policy.residency.district] ?? 0
    : 0;

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">우리 팀 자격 판정</h2>
        <span className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${STATUS_STYLE[result.status]}`}>
          {STATUS_LABEL[result.status]}
        </span>
      </div>

      <ul className="mt-2 list-inside list-disc text-sm text-gray-600">
        {result.reasons.map((reason, i) => (
          <li key={i}>{reason}</li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-gray-600">팀 전체 인원수</span>
          <input
            type="number"
            min={0}
            value={team.memberCount}
            onChange={(e) => setTeam((t) => ({ ...t, memberCount: Math.max(0, Number(e.target.value) || 0) }))}
            className="rounded border border-gray-300 px-2 py-1"
          />
        </label>

        {policy?.residency.district && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs font-medium text-gray-600">{policy.residency.district} 거주(재직) 인원수</span>
            <input
              type="number"
              min={0}
              value={districtCount}
              onChange={(e) => {
                const value = Math.max(0, Number(e.target.value) || 0);
                setTeam((t) => ({
                  ...t,
                  districtDistribution: { ...t.districtDistribution, [policy.residency.district as string]: value },
                }));
              }}
              className="rounded border border-gray-300 px-2 py-1"
            />
          </label>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={team.isRegisteredTeam}
            onChange={(e) => setTeam((t) => ({ ...t, isRegisteredTeam: e.target.checked }))}
          />
          등록단체임
        </label>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        팀 정보는 이 브라우저에만 저장됩니다(localStorage). 서버로 전송되지 않습니다.
        {' '}
        {policy?.residency.district && !SEOUL_DISTRICTS.includes(policy.residency.district as (typeof SEOUL_DISTRICTS)[number]) && (
          <span>(주의: 정책의 거주 요건 구 표기 확인 필요)</span>
        )}
      </p>
    </div>
  );
}
