# ground-pass

서울 공공 축구·풋살장 통합 조회. 개인 유틸 프로젝트(비수익).

자세한 배경·규칙·설계는 [`CLAUDE.md`](./CLAUDE.md) 참고. 이 문서는 로컬 실행법과 데이터 편집 가이드만 다룬다.

## 절대 하지 않는 것

- 예약 대행·자동 신청·결제·로그인 기능 없음
- 정책·자격요건 데이터는 근거 링크(`sourceUrl`) + 확인일(`verifiedAt`) 없이 추가하지 않음
- 빈 데이터를 "예약 가능"으로 표시하지 않음 (모르면 "미조사"로 표기)

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # 아래 "API 키 발급" 참고해 값 채우기
npm run dev                  # http://localhost:3000
```

### API 키 발급

| 변수 | 발급처 | 비고 |
|---|---|---|
| `DATA_GO_KR_SERVICE_KEY` | [data.go.kr](https://www.data.go.kr) → "행정안전부_공공개방자원 체육시설 목록" 또는 전국공공시설개방정보표준데이터 활용신청 | Encoding 키를 그대로 사용 (이미 `%`로 URL 인코딩된 값). `URLSearchParams`로 재조립하면 이중 인코딩되니 주의 |
| `SEOUL_OPEN_DATA_API_KEY` | [data.seoul.go.kr](https://data.seoul.go.kr) → 인증키 신청 | OA-2266 "서울시 체육시설 공공서비스예약 정보" Open API 탭에서 서비스명(`ListPublicReservationSport`) 확인 가능 |

`.env.local`은 git에 커밋되지 않는다(`.gitignore`).

## 데이터 파이프라인

```bash
npm run fetch:facility   # 전국공공시설개방정보 → data/raw/facility-open-api.json
npm run fetch:seoul      # 서울 yeyak(OA-2266) → data/raw/seoul-yeyak-sport.json
npm run build:dataset    # 위 두 원본 + data/manual/*.yaml → data/venues.json
```

`data/raw/`는 스캔 원본이라 용량이 크고 재생성 가능해서 git에 안 올림(gitignore). `data/venues.json`은 화면이 실제로 읽는 최종 산출물이라 커밋됨.

GitHub Actions(`.github/workflows/collect.yml`)가 매주 월요일 자동으로 이 세 스크립트를 돌리고, `data/venues.json`이 바뀌면 자동 커밋한다. Actions 탭에서 "Run workflow"로 수동 실행도 가능.

**Actions에 필요한 Repository secrets** (Settings → Secrets and variables → Actions):
- `DATA_GO_KR_SERVICE_KEY`
- `SEOUL_OPEN_DATA_API_KEY`

## data/manual/*.yaml 편집 가이드

두 파일 다 **venueId를 키로 쓴다.** venueId는 `data/venues.json`에서 해당 구장의 `id` 필드 값을 그대로 복사.

### policies.yaml — 자격요건

```yaml
venue-xxxxxxxxxx: # 주석으로 구장명 남기기 (사람이 알아보기용)
  residency:
    required: true          # 거주/재직 제한 있는지
    district: 구로구         # required가 true일 때만 의미 있음
    minRatioPercent: 80      # 비율 기준. minCount(인원수 기준)와 둘 중 하나만
    note: "원문에서 그대로 옮긴 근거 문구"
  requiresRegisteredTeam: true
  allocation: 추첨            # 선착순 | 추첨 | 혼합 | 미확인
  openRule: "예약시스템은 매월 15일 13:00 오픈"   # 선택. 사람이 읽는 자유 텍스트
  penalty: "선택. 페널티 요약"
  sourceUrl: https://yeyak.seoul.go.kr/...    # 필수
  verifiedAt: "2026-08-20"                     # 필수, YYYY-MM-DD
```

`sourceUrl`·`verifiedAt` 둘 중 하나라도 빠지면 `build-dataset.ts`가 경고 로그를 찍고 그 항목을 통째로 무시한다. **추측으로 채우지 말 것** — 반드시 실제 예약 페이지·구청 공고 원문을 확인하고 그 URL을 넣는다.

### open-schedule.yaml — 접수 오픈 반복 일정

```yaml
venue-xxxxxxxxxx:
  rule:
    type: MONTHLY_DAY   # 매월 특정 날짜
    day: 15
    time: "13:00"
  # 또는
  # rule:
  #   type: MONTHLY_NTH_WEEKDAY   # 매월 N째주 요일
  #   nth: 2        # 1~5
  #   weekday: 3    # 0=일 ~ 6=토
  #   time: "10:00"
  note: "익월분 예약 오픈 등, 화면에 보여줄 설명"
  sourceUrl: https://...
  verifiedAt: "2026-08-20"
```

**패턴이 확실하지 않으면(관측 1회뿐 등) rule을 억지로 만들지 않는다.** 틀린 반복규칙은 "오픈 안 했는데 열렸다"고 잘못 알려주는 게 아무 정보도 없는 것보다 위험하다 — 확신 없는 건 `data/manual/open-schedule.yaml`에 주석으로만 남기고 캘린더에는 안 띄운다.

## 테스트

```bash
npm run test    # vitest — normalize/filterVenues/eligibility/openSchedule/calendarGrid 순수함수 전부
npm run lint
npx tsc --noEmit
```

## 배포

Vercel에 리포를 연결하면 push마다 자동 배포된다(설정 파일 별도 불필요, Next.js 기본 지원). Actions가 커밋한 `data/venues.json` 갱신도 그대로 재배포를 트리거한다.

## 디렉토리 구조

```
scripts/            공공데이터 수집·병합 스크립트
data/raw/            원본 API 응답 스냅샷 (gitignore)
data/manual/          정책·오픈일정 수동 입력 YAML
data/venues.json      최종 산출물 (화면이 읽는 파일)
src/lib/              정규화·필터·자격판정·캘린더 등 순수 로직 (+테스트)
src/components/        UI 컴포넌트
src/app/                Next.js App Router 페이지
```

자세한 타입·비즈니스 규칙·티켓 진행 상황은 [`CLAUDE.md`](./CLAUDE.md) 참고.
