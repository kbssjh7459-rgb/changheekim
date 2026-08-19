# CLAUDE.md — ground-pass

서울 공공 축구·풋살장 통합 조회 + 실시간 대관현황 웹.
**개인 유틸 프로젝트(비수익).** 이 파일이 프로젝트의 단일 진실 공급원이다.

---

## 1. 문제와 목적

서울에서 공공 인조잔디 축구장을 빌리려면 4중 장벽을 통과해야 한다.

1. **예약 채널 파편화** — 서울시 통합예약(yeyak) / 자치구 시설관리공단 자체 사이트 / 민간 플랫폼(taapspace 등) / 전화·방문
2. **채널이 수시로 바뀜** — 서초구는 통합예약 → 자체 사이트로 이관됨
3. **자격 요건 제각각** — "구민 50% 이상", 등록단체 한정, 추첨 vs 선착순
4. **접수 오픈 일정 제각각** — "매월 둘째주 수요일 10시" 식으로 구마다 다름

**목표:** "내 팀 기준으로, 지금 실제로 잡을 수 있는 자리"를 한 화면에서 본다.

**경쟁 서비스와의 차이:** 기존 공공시설 정보 사이트(플랫폼 도담 등)는 공공데이터를 정규화해 "이 시설이 무엇인지"까지만 보여준다. 자격 요건은 면책 문구로 처리하고 실시간 현황은 없다. ground-pass는 **자격 요건 + 실시간 빈자리**를 다룬다. 이 둘은 자동화가 안 되는 수작업 영역이라 그대로 차별점이 된다.

---

## 2. 절대 규칙

1. **예약 대행·자동신청·결제·로그인 기능을 만들지 않는다.** 제안도 하지 말 것. 공공 예약은 본인인증 필수이며, 자동 신청은 부정예약으로 간주된다.
2. **정책·자격요건 데이터를 추측해서 채우지 않는다.** `sourceUrl`(근거 링크)과 `verifiedAt`(확인일) 없이 `policy` 객체를 생성 금지. 모르는 값은 `undefined`로 두고 UI에 "미조사"로 표기한다.
3. **데이터 없음을 "예약 가능"으로 표시하지 않는다.** 빈 값은 반드시 `UNKNOWN`. 사용자가 헛걸음하면 서비스는 끝이다.
4. **개인정보를 저장하지 않는다.** 크롤링 응답에 예약자명·연락처가 섞여 오는 경우가 실제로 있다. 정규화 함수는 정의된 필드만 매핑하고 나머지는 즉시 버린다.
5. **크롤링 예의** — robots.txt 준수, 요청 간 최소 1.5초, 동시 요청 금지, 로그인 영역 접근 금지. User-Agent는 위장하지 말고 `ground-pass/1.0 (개인 프로젝트)`.
6. **한국어** — UI, 코드 주석, 커밋 메시지 전부 한국어.
7. **한 번에 한 티켓.** 티켓 종료 시 반드시 빌드/테스트 통과 후 커밋. 여러 티켓 동시 진행 금지.
8. **외부 API 응답 필드명을 추측하지 않는다.** 실제 응답을 `data/raw/`에 저장해 확인하고 쓴다.

---

## 3. 스택

| 구분 | v1 (정적 조회) | v2 (실시간 추가) |
|---|---|---|
| 프론트 | Next.js 15 App Router + TypeScript + Tailwind | 동일 |
| 데이터 | JSON/YAML + Git, 빌드타임 로드 | 마스터는 그대로 + 슬롯만 DB |
| DB | 없음 | Supabase(Postgres) — **슬롯 현황 전용** |
| 수집 | GitHub Actions 주 1회 | Cloudflare Worker Cron 15분 |
| 배포 | Vercel | 동일 |
| 기타 | Zod(스키마 검증), js-yaml, 카카오맵 JS SDK | |

**v2에서 DB를 여는 범위를 최소로 유지할 것.** 구장 마스터·자격요건·오픈일정은 계속 Git으로 관리한다. 이걸 DB로 옮기면 v1의 단순함(Git이 곧 버전관리·백업·이력)이 사라진다.

**Cron 선택 근거:** Vercel Hobby Cron은 하루 1회 제한이라 실시간에 못 쓴다. GitHub Actions의 `*/15`는 지연이 심하다. Cloudflare Worker Cron Trigger는 무료 플랜에서 분 단위 실행이 가능해 이 용도에 맞다.

---

## 4. 데이터 소스 3층 구조

층이 다르며 서로 대체하지 않는다.

| 층 | 소스 | 역할 | 확보 |
|---|---|---|---|
| **마스터** | 공공데이터포털 「공공시설 개방」 데이터 | 구장 목록, 관리기관, 요금, 신청방법, 운영시간, 휴관일, 면적 | 공식 API |
| **예약 링크** | 서울 열린데이터광장 「서울시 체육시설 공공서비스예약 정보」(OA-2266) | `SVCID` 기반 yeyak 딥링크 | 공식 API, 공공누리 1유형 |
| **실시간 현황** | 각 기관·플랫폼 사이트 | 슬롯별 예약 가능 여부 | 어댑터(정찰 후 JSON API 호출) |
| **정책** | 구청·공단 공고 | 자격요건, 오픈일정, 페널티 | **수동 입력 + 근거 링크 필수** |

**주의:** 마스터 데이터는 값이 지저분하다. 실제 관측된 예시 — 면적 `3366.㎡`, 기준시간 `2.시간`, 요금 `평일오전:21000+평일오후:30000+주말:39000`. 파싱 유틸을 `src/lib/normalize.ts`로 분리하고 반드시 단위테스트를 붙일 것.

**yeyak 딥링크 형식:**
`https://yeyak.seoul.go.kr/web/reservation/selectReservView.do?rsv_svc_id={SVCID}`

---

## 5. 타입 (SSOT: `src/types/`)

```ts
// ── 구장 마스터 ──────────────────────────────
export type ReservationChannel =
  | 'SEOUL_YEYAK'    // 서울시 공공서비스예약 통합
  | 'DISTRICT_SITE'  // 자치구·공단 자체 사이트
  | 'PLATFORM'       // 민간 예약 플랫폼 (taapspace 등)
  | 'PHONE_VISIT'    // 전화·방문
  | 'UNKNOWN';

export type CoverageLevel =
  | 'LIVE'           // 어댑터 보유. 슬롯 현황 수집됨
  | 'SCHEDULE_ONLY'  // 접수 오픈 일정만 앎
  | 'LINK_ONLY'      // 채널·자격요건만 제공
  | 'UNKNOWN';       // 미조사

export type SurfaceType = '인조잔디' | '천연잔디' | '맨땅' | '기타';
export type SportType = '축구' | '풋살';
export type AllocationMethod = '선착순' | '추첨' | '혼합' | '미확인';

export interface ResidencyRequirement {
  required: boolean;
  district?: string;          // '강서구'
  minRatioPercent?: number;   // 50 → 팀원 50% 이상
  minCount?: number;
  note?: string;              // 원문 근거 문구
}

export interface VenuePolicy {
  residency: ResidencyRequirement;
  requiresRegisteredTeam: boolean;
  allocation: AllocationMethod;
  openRule?: string;          // '매월 둘째주 수요일 10:00, 익월분'
  penalty?: string;
  sourceUrl: string;          // 필수
  verifiedAt: string;         // 'YYYY-MM-DD' 필수
}

export interface Venue {
  id: string;                 // 안정적 슬러그. 같은 입력이면 항상 같은 값
  name: string;
  district: string;
  operator: string;           // 관리기관
  sports: SportType[];
  surface: SurfaceType;
  hasNightLighting: boolean;
  address?: string;
  lat?: number;               // 원본이 문자열이면 Number() + NaN 체크
  lng?: number;
  channel: ReservationChannel;
  reserveUrl?: string;
  phone?: string;
  priceRule?: PriceRule;      // 파싱된 요금
  policy?: VenuePolicy;       // 미조사면 undefined
  coverage: CoverageLevel;
  adapterId?: string;         // coverage === 'LIVE'일 때만
  source: 'API' | 'MANUAL' | 'MERGED';
  lastFetchedAt: string;
}

// ── 실시간 슬롯 ──────────────────────────────
export type SlotStatus =
  | 'AVAILABLE'
  | 'BOOKED'
  | 'NOT_OPEN_YET'   // 아직 접수 시작 전 ★ 반드시 분리
  | 'CLOSED'         // 휴관·정비·행사
  | 'INELIGIBLE'     // 자격 미충족 (팀 프로필 기준 파생값, 수집값 아님)
  | 'UNKNOWN';

export interface SlotSnapshot {
  venueId: string;
  courtId: string;    // 코트 구분 없으면 '' (PK 충돌 방지)
  date: string;       // 'YYYY-MM-DD' 현지 날짜
  startHour: number;  // 0~23
  endHour: number;    // 24 허용. 날짜 넘김 슬롯은 만들지 말 것
  status: SlotStatus;
  price?: number;
  fetchedAt: string;  // ISO
}

export interface VenueAdapter {
  adapterId: string;
  venueIds: string[];
  fetchMonth(venueId: string, yearMonth: string): Promise<SlotSnapshot[]>;
}
```

> **`NOT_OPEN_YET`이 가장 중요하다.** 공공 구장은 "매월 15일 익월분 오픈"이 흔해 빈 칸의 대부분이 "아직 안 열림"이다. `BOOKED`로 처리하면 화면이 온통 마감이 되고, `AVAILABLE`로 처리하면 사용자를 속인다. 어댑터 응답에 명시적 구분이 없으면 `open-schedule.yaml`의 오픈 규칙과 대조해 계산한다.

---

## 6. 비즈니스 규칙

**시간대 등급** (`src/lib/timeGrade.ts`)
- 인기타임: 평일 19·20·21시
- 준인기타임: 평일 18·22·00시, 주말 전 시간
- 비인기타임: 평일 00~17시, 주말 00~06시

**자격 매칭** (`src/lib/eligibility.ts`) — 반드시 순수 함수 + 테스트 선작성
```ts
checkEligibility(team: TeamProfile, policy?: VenuePolicy):
  { status: 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'UNKNOWN', reasons: string[] }
```
- `policy`가 없으면 `UNKNOWN`
- 구민 비율은 `team.districtDistribution`으로 계산
- `reasons`에 사람이 읽을 문장을 담는다 (UI에 그대로 노출)
- 엣지케이스 테스트 필수: policy 없음 / 요건 없음 / 경계값(정확히 50%) / 팀원 0명

**팀 프로필**은 서버에 저장하지 않는다. localStorage만 사용.

---

## 7. 디렉토리 구조

```
ground-pass/
├── CLAUDE.md
├── .env.local / .env.example
├── data/
│   ├── venues.json                  ← 생성물
│   ├── raw/                         ← API 원본 스냅샷 (디버깅·diff용)
│   └── manual/
│       ├── policies.yaml            ← 자격요건 (수동)
│       ├── open-schedule.yaml       ← 접수 오픈 일정 (수동)
│       ├── adapters.yaml            ← 정찰 결과 기록
│       └── venues-extra.yaml        ← API에 없는 구장 수동 추가
├── scripts/
│   ├── fetch-facility-api.ts        ← 공공시설 개방
│   ├── fetch-seoul-yeyak.ts         ← 서울 yeyak
│   └── build-dataset.ts             ← 병합·정규화 → venues.json
├── workers/collector/               ← Cloudflare Worker (v2)
├── supabase/migrations/
├── src/
│   ├── app/
│   │   ├── page.tsx                 ← 목록 + 필터
│   │   ├── available/page.tsx       ← 통합 빈자리 보드
│   │   ├── calendar/page.tsx        ← 접수 오픈 캘린더
│   │   ├── status/page.tsx          ← 어댑터 건강 상태
│   │   ├── venues/[id]/page.tsx     ← 상세 + 시간표 그리드
│   │   └── api/slots/route.ts
│   ├── lib/
│   │   ├── venues.ts
│   │   ├── normalize.ts             ← 지저분한 원본값 파싱
│   │   ├── eligibility.ts
│   │   ├── timeGrade.ts
│   │   ├── db.ts
│   │   └── adapters/
│   │       ├── types.ts
│   │       ├── index.ts             ← 레지스트리
│   │       ├── taapspace.ts
│   │       ├── sscmc.ts
│   │       └── __tests__/fixtures/  ← 실제 응답 저장 (오프라인 테스트)
│   └── types/
└── tests/
```

---

## 8. 어댑터 정찰 프로토콜 (사이트 추가 시 매번)

**HTML을 파싱하지 말고 그 뒤의 JSON API를 찾는다.**

1. 크롬에서 대상 예약 페이지 → `F12` → Network → **Fetch/XHR** 필터
2. 로그 비우고 **실제로 조작** (구장 선택, 날짜 클릭, 조회)
3. 시간대·예약가능여부가 들어있는 응답 찾기
4. 우클릭 → **Copy as cURL (bash)**
5. cURL을 클로드 코드에 붙여넣고 어댑터 생성 요청
6. 실제 응답을 `__tests__/fixtures/`에 저장 → 네트워크 없이 파싱 테스트

**사이트 유형**

| 유형 | 판별 | 대응 |
|---|---|---|
| JSON API (SPA) | 소스에 `enable JavaScript`만 | API 직접 호출. 가장 안정적 |
| AJAX 폼 | 서버렌더인데 조작 시 XHR 발생 | XHR 재현 |
| 순수 HTML | JS 꺼도 보임, XHR 없음 | cheerio 파싱 (취약) |
| **로그인 필수** | 로그인 없이 현황 안 보임 | **수집하지 않음.** `LINK_ONLY`로 처리 |

**정찰 체크리스트:** robots.txt 허용 여부 / 약관의 자동수집 금지 문구 / 로그인 없이 보이는지 / 한 번에 며칠치 오는지 / 개인정보 섞였는지 / 같은 시스템 쓰는 다른 자치구가 있는지

**확인된 사이트**
- `taapspace.kr/front/court/product/{id}` — React SPA. **여러 구장 입점 플랫폼이라 어댑터 1개 = 구장 N개. 최우선.** 구장 목록 API가 따로 있는지도 확인할 것
- `cs.sscmc.or.kr/sdmcs` (서대문구도시관리공단) — 서버렌더 + 연쇄 AJAX. 소스에 `/rest/` 경로 존재 → JSON 엔드포인트 있음. `/bahcs`(북아현)도 동일 구조라 어댑터 1개로 2개 시설 커버

> 지자체 공단 사이트는 몇 개 SI 솔루션을 돌려쓰는 경우가 흔하다. 응답 필드명이 익숙하면 기존 어댑터를 먼저 시도할 것. 어댑터는 **사이트 단위가 아니라 시스템 단위**로 만든다.

**확장 우선순위 (ROI):** 플랫폼형 > 공단 통합형 > 단일 구장 > 로그인 필수(포기)

---

## 9. 적응형 폴링 (v2)

전 구장 × 전 날짜를 15분마다 긁으면 민폐이고 쿼터도 터진다.

| 구간 | 주기 |
|---|---|
| D+0~D+7, 인기타임 | 15분 |
| D+0~D+7, 그 외 | 1시간 |
| D+8~D+30 | 6시간 |
| D+31 이후 | 1일 |
| **접수 오픈 예정 시각 ±30분** | **5분** |

마지막 줄이 킬러 기능이다. `open-schedule.yaml`의 오픈 시각 전후로 폴링을 몰아주면 "오픈 직후 어디가 남았는지"를 보여줄 수 있다. 대부분 어댑터가 월 단위로 응답하므로 실제 요청 수는 표보다 훨씬 적다.

---

## 10. DB 스키마 (v2)

```sql
create table slots (
  venue_id text not null, court_id text not null default '',
  date date not null, start_hour smallint not null, end_hour smallint not null,
  status text not null, price integer, fetched_at timestamptz not null,
  primary key (venue_id, court_id, date, start_hour)
);
create index on slots (date, status);
create index on slots (venue_id, date);

create table slot_events (
  id bigserial primary key,
  venue_id text not null, court_id text not null default '',
  date date not null, start_hour smallint not null,
  from_status text not null, to_status text not null,
  detected_at timestamptz not null default now()
);
create index on slot_events (to_status, detected_at desc);

create table fetch_runs (
  id bigserial primary key, adapter_id text not null,
  started_at timestamptz not null, finished_at timestamptz,
  ok boolean, slot_count integer, error text
);
```

시각은 전부 UTC(`timestamptz`)로 저장하고 표시만 KST. 슬롯의 `date`는 현지 날짜 그대로.
`slot_events`는 90일 경과분 삭제 잡 필요(무료 쿼터).

---

## 11. 티켓

순서대로 하나씩. 완료 기준 미달 시 다음으로 넘어가지 않는다.

### T0. API 정찰 (수동, 코딩 전)
1. data.seoul.go.kr 인증키 발급
2. data.go.kr에서 「공공시설 개방」 검색 → 인증키 발급, 필드 목록 확보
3. OA-2266의 'Open API' 탭에서 서비스명·샘플 URL·필드 목록 확보
4. **브라우저에서 실제 호출해 JSON이 오는지 확인**

→ 확인한 실제 값을 T1 프롬프트에 붙여넣는다. **추측 금지.**

### T1. 셋업 + 수집 스크립트
Next.js 15(App Router, TS, Tailwind) 초기화, CLAUDE.md 배치. `scripts/fetch-facility-api.ts`, `scripts/fetch-seoul-yeyak.ts` 작성 — 페이지네이션 전량 수집, 원본을 `data/raw/`에 저장, Zod 검증, 키는 `.env.local`.
**완료:** 두 스크립트 실행 → raw JSON 적재 + 건수 출력

### T2. 타입 + 정규화 + 데이터셋 빌더
`src/types/`, `src/lib/normalize.ts`(요금 문자열·면적·기준시간 파싱, `신청방법`→`ReservationChannel` 매핑 테이블, 좌표 문자열→숫자), `scripts/build-dataset.ts`(두 소스 병합 → 축구·풋살만 필터 → `venues.json`, 자치구별 건수 요약 출력).
**완료:** `venues.json` 생성 + **자치구별 커버리지를 눈으로 확인** ← 이 숫자가 이후 공수를 결정한다. normalize 단위테스트 통과

### T3. 목록 화면
필터(자치구·종목·잔디·조명·채널), 필터 상태를 URL 쿼리스트링에 반영, 카드에 채널 뱃지 + 커버리지 뱃지 + `policy` 없으면 '자격요건 미조사'.
**완료:** 필터 URL을 새 탭에 붙여넣어도 같은 결과

### T4. 자격요건 + 상세
먼저 **손으로** `policies.yaml`에 5개 구 입력(강서·양천·마포·영등포·구로). 그다음 상세 페이지(자격요건 표 + **출처 링크·최종확인일 반드시 노출**), `eligibility.ts`(테스트 선작성).
**완료:** 테스트 통과 + 팀 프로필 변경 시 판정 색 변화

### T5. 접수 오픈 캘린더
`open-schedule.yaml` 스키마 설계, 반복규칙('매월 둘째주 수요일 10:00') → 실제 날짜 전개 유틸, 월간/리스트 뷰.
**완료:** 이번 달·다음 달 일정이 날짜순 정확 표시

### T6. 배포 + 자동 갱신
Vercel 배포, GitHub Actions 주 1회 수집→변경 시 자동 커밋, README(로컬 실행법 + YAML 편집 가이드).
**완료:** Actions 수동 트리거 초록불

### T7. 어댑터 인프라 + 첫 어댑터
`src/lib/adapters/` 인프라(레지스트리, 지연·재시도·UA 래퍼, 원본 저장) → 더미 어댑터로 검증 → **taapspace 어댑터** (정찰 cURL 기반, Zod 검증, 픽스처 테스트).
**완료:** 픽스처 테스트 통과 + 실제 호출로 특정 월 슬롯 반환

### T8. 저장소
Supabase 연동, 마이그레이션 3개 테이블, `upsertSlots()` — **diff 계산과 DB 쓰기를 분리**해 순수 함수로 테스트.
**완료:** 같은 스냅샷 2회 투입 → 2회차 `slot_events` 0건

### T9. 수집 워커
Cloudflare Worker + Cron 15분. `coverage==='LIVE'` 구장 대상. 적응형 폴링 정책 모듈 분리 + 테스트. `Promise.allSettled`로 어댑터 격리. 모든 실행을 `fetch_runs`에 기록.
**완료:** `wrangler dev` 수동 트리거 → slots 적재 + fetch_runs 성공 기록

### T10. 조회 API + 시간표 그리드
`/api/slots` (응답에 **데이터 기준시각** 필수 포함). 상세 페이지에 가로 날짜7 × 세로 시간 히트맵 — 초록=가능/회색=마감/빗금=미오픈/흰색=휴관. **"N분 전 기준" 배지 항상 노출**, 30분 초과 시 경고색. 자격 미달 시 오버레이 + `reasons` 표시. `LIVE`가 아니면 등급별 안내 UI.
**완료:** 커버리지 4등급이 각각 다른 UI로 표시됨

### T11. 통합 빈자리 보드
`/available` — 전 구장 횡단으로 `AVAILABLE`만 시간순. 필터: 자치구·요일·시간대등급·**"우리 팀이 신청 가능한 곳만"**.
> 사용자는 구장이 아니라 **자리**를 찾는다. 이 화면이 실질적 메인이 된다.

### T12. 취소표 + 운영 상태
`/api/events/recent`(→AVAILABLE 전환 최신순), 홈에 최근 취소표 섹션, `/status`(어댑터별 마지막 성공 시각·실패 횟수).
**완료:** 어댑터를 일부러 깨뜨렸을 때 `/status`에 즉시 드러남

**v3 이후:** 알림(FCM/알림톡), 자격요건 25개 구 확대, 어댑터 확장, 유저 제보 기능

> **어댑터 1개로 T8~T12를 끝까지 굴려보고 확장할 것.** 어댑터 5개를 먼저 만들고 파이프라인을 붙이면 무엇이 깨졌는지 알 수 없는 상태가 된다.

---

## 12. 함정

| 함정 | 대응 |
|---|---|
| **빈 칸을 예약가능으로 오인** | `NOT_OPEN_YET` 분리. 어댑터가 구분 못 하면 오픈규칙으로 계산 |
| **어댑터가 조용히 죽음** | 가장 위험. `fetch_runs` + `/status` + 마지막 성공 6시간 초과 시 해당 구장을 `UNKNOWN`으로 강등 |
| 사이트 개편으로 파싱 실패 | Zod 검증 실패를 에러로 승격. 픽스처 diff로 변경점 파악 |
| API 커버리지가 낮음 | T2에서 자치구별 건수 확인. 안 나오는 구 = 크롤링 대상 목록 확보. 실패 아님 |
| 원본 데이터가 지저분 | `3366.㎡`, `2.시간`, `평일오전:21000+...` — normalize에 테스트 필수 |
| 좌표가 문자열 | `Number()` 변환 + NaN 체크 |
| 코트 구분 누락 | A/B구장 있는데 `court_id` 비우면 PK 충돌로 덮어써짐 |
| 시간 경계 | `endHour=24` 허용, 날짜 넘김 슬롯 금지 |
| 타임존 | DB는 UTC, 표시만 KST |
| 카카오맵 키 도메인 | localhost + Vercel 도메인 둘 다 등록 |
| 스코프 팽창 | "로그인 붙일까요?" 류 제안이 나오면 §2 절대규칙으로 복귀 |
| 한 번에 여러 티켓 | 반드시 하나씩. 티켓마다 빌드+커밋 |

---

## 13. 완료 판정

**v1**
- [ ] 두 API 수집 + 자치구별 커버리지 문서화
- [ ] 필터 동작 목록 + 공유 가능 URL
- [ ] 5개 구 자격요건 입력 (근거 링크 포함)
- [ ] 팀 프로필 기반 자격 판정 (테스트 통과)
- [ ] 접수 오픈 캘린더
- [ ] Vercel 배포 + 주 1회 자동 갱신

**v2**
- [ ] LIVE 구장 1곳 이상 시간표 그리드가 실제 현황 반영
- [ ] 데이터 기준시각이 모든 화면에 노출
- [ ] 커버리지 4등급이 정직하게 구분 표시
- [ ] 취소표 전환 감지 및 목록 표시
- [ ] `/status`에서 어댑터 건강 확인
- [ ] 7일 연속 무중단 수집 (성공률 95%+)

**진짜 판정 기준**
- [ ] 주말 자리 찾을 때 예약 사이트보다 이 화면을 먼저 연다
