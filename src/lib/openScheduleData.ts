import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';
import type { OpenScheduleEntry } from '@/types';

const PATH = path.join(process.cwd(), 'data', 'manual', 'open-schedule.yaml');

/** sourceUrl·verifiedAt·rule 없는 항목은 무시한다 (CLAUDE.md §2 규칙 2와 동일한 원칙). */
export function loadOpenSchedule(): OpenScheduleEntry[] {
  if (!existsSync(PATH)) return [];
  const parsed = loadYaml(readFileSync(PATH, 'utf-8')) as Record<
    string,
    Omit<OpenScheduleEntry, 'venueId'>
  > | null;
  if (!parsed) return [];

  return Object.entries(parsed)
    .filter(([, v]) => v?.rule && v?.sourceUrl && v?.verifiedAt)
    .map(([venueId, v]) => ({ venueId, ...v }));
}
