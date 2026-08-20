import type { TeamProfile } from '@/types';

const STORAGE_KEY = 'ground-pass:team-profile';

export function defaultTeamProfile(): TeamProfile {
  return { districtDistribution: {}, memberCount: 0, isRegisteredTeam: false };
}

/** 팀 프로필은 서버에 저장하지 않는다 (CLAUDE.md §6). localStorage 전용. */
export function loadTeamProfile(): TeamProfile {
  if (typeof window === 'undefined') return defaultTeamProfile();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultTeamProfile();
    return { ...defaultTeamProfile(), ...JSON.parse(raw) };
  } catch {
    return defaultTeamProfile();
  }
}

export function saveTeamProfile(profile: TeamProfile): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
