import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Venue } from '@/types';

/** data/venues.json을 읽는다. v1은 정적 데이터라 매 호출마다 다시 읽어도 비용이 작다. */
export function loadVenues(): Venue[] {
  const filePath = path.join(process.cwd(), 'data', 'venues.json');
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as Venue[];
}
