export type SlotStatus =
  | 'AVAILABLE'
  | 'BOOKED'
  | 'NOT_OPEN_YET' // 아직 접수 시작 전 ★ 반드시 분리
  | 'CLOSED' // 휴관·정비·행사
  | 'INELIGIBLE' // 자격 미충족 (팀 프로필 기준 파생값, 수집값 아님)
  | 'UNKNOWN';

export interface SlotSnapshot {
  venueId: string;
  courtId: string; // 코트 구분 없으면 '' (PK 충돌 방지)
  date: string; // 'YYYY-MM-DD' 현지 날짜
  startHour: number; // 0~23
  endHour: number; // 24 허용. 날짜 넘김 슬롯은 만들지 말 것
  status: SlotStatus;
  price?: number;
  fetchedAt: string; // ISO
}

export interface VenueAdapter {
  adapterId: string;
  venueIds: string[];
  fetchMonth(venueId: string, yearMonth: string): Promise<SlotSnapshot[]>;
}
