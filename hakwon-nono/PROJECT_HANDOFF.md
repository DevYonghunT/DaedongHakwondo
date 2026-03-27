# 대동학원도 (DaedongHakwondo) — AI 에이전트 핸드오프 문서

## 1. 프로젝트 개요

**프로젝트명:** 대동학원도 (DaedongHakwondo) - 학원 지도 & 교육 인사이트 플랫폼

**목적:** 전국 학원 분포를 정부 공공 API(나이스)로 시각화하고, AI 기반 교육 인사이트를 제공하는 공공 데이터 활용 서비스

**핵심 가치:**
- 지역별·분야별·수강료별 학원 분포 시각화
- 학교 위치·예산·관심 분야 기반 AI 학원 추천
- 지역 간 교육 형평성 분석
- 교육 공공 데이터 AI 활용 공모전 출품용

**데이터 출처:**
- 나이스 교육정보 개방포털 (NEIS) — 학원/학교 API
- 학교알리미 공개 데이터
- Leaflet + OpenStreetMap (지도 시각화)
- Anthropic Claude API (AI 인사이트)

---

## 2. 기술 스택

| 영역 | 기술 |
|------|------|
| **프론트엔드** | Next.js 14 (App Router), TypeScript, React 18, Tailwind CSS, Framer Motion |
| **지도** | Leaflet 1.9.4 + React-Leaflet 5.0.0, heatmap.js 2.0.5 |
| **차트** | Recharts 3.8.0 |
| **백엔드** | Next.js API Routes (서버리스) |
| **DB** | PostgreSQL 15 (PostGIS), Docker 기반 |
| **ORM** | Prisma 7.5.0 + @prisma/adapter-pg |
| **AI** | Anthropic Claude API (claude-3-haiku) |
| **디자인** | 시맨틱 컬러 토큰, 커스텀 Tailwind 디자인 시스템, Framer Motion 애니메이션 |
| **배포** | 프론트: Vercel / DB: Mac Mini (자체 호스팅 PostgreSQL) |

---

## 3. 프로젝트 구조

```
/hakwon-nono
├── src/
│   ├── app/                          # Next.js App Router 페이지
│   │   ├── page.tsx                  # 메인 지도 뷰 (홈)
│   │   ├── layout.tsx                # 루트 레이아웃 (메타데이터, 폰트)
│   │   ├── template.tsx              # 페이지 전환 애니메이션
│   │   ├── dashboard/page.tsx        # 전국 통계 대시보드
│   │   ├── compare/page.tsx          # 지역 비교
│   │   ├── tuition/page.tsx          # 수강료 통계
│   │   ├── equity/page.tsx           # 교육 형평성 분석
│   │   ├── insights/page.tsx         # 데이터 인사이트/상관관계
│   │   └── api/                      # 백엔드 API 라우트
│   │       ├── academies/
│   │       │   ├── route.ts          # 지도 범위 내 학원 목록
│   │       │   └── [id]/route.ts     # 학원 상세
│   │       ├── schools/
│   │       │   ├── search/route.ts   # 학교 검색/자동완성
│   │       │   └── [id]/nearby/route.ts  # 학교 주변 학원
│   │       ├── districts/
│   │       │   ├── stats/route.ts    # 전국/지역 통계
│   │       │   └── compare/route.ts  # 두 지역 비교
│   │       ├── recommend/route.ts    # AI 학원 추천
│   │       ├── tuition/route.ts      # 수강료 통계
│   │       ├── equity/route.ts       # 교육 형평성 분석
│   │       ├── correlation/route.ts  # 학원밀도 vs 수강료 상관관계
│   │       └── analysis/report/route.ts  # AI 분석 리포트 생성
│   ├── components/
│   │   ├── MapView.tsx               # Leaflet 지도 (클러스터링)
│   │   ├── FilterPanel.tsx           # 분야 필터, 뷰 모드 토글
│   │   ├── RegionStats.tsx           # 하단 통계 카드
│   │   ├── SchoolSearch.tsx          # 학교 검색 자동완성
│   │   ├── SchoolDashboard.tsx       # 학교 상세 패널
│   │   ├── SchoolDetail.tsx          # 학교 상세 정보
│   │   ├── AcademyDetail.tsx         # 학원 상세 정보
│   │   ├── RecommendPanel.tsx        # AI 추천 폼
│   │   ├── AIReport.tsx              # AI 분석 리포트 뷰어
│   │   ├── Header.tsx                # 네비게이션 헤더
│   │   ├── charts/
│   │   │   ├── RealmPieChart.tsx     # 파이/도넛 차트 (분야별)
│   │   │   └── RegionBarChart.tsx    # 바 차트 (지역별)
│   │   └── ui/
│   │       ├── Card.tsx              # 기본 카드 컴포넌트
│   │       ├── Button.tsx            # 기본 버튼 컴포넌트
│   │       ├── Skeleton.tsx          # 로딩 스켈레톤
│   │       ├── Tooltip.tsx           # 툴팁
│   │       └── Toast.tsx             # 토스트 알림 프로바이더
│   ├── lib/
│   │   ├── prisma.ts                 # Prisma 클라이언트 싱글톤
│   │   ├── anthropic.ts              # Claude API 클라이언트 팩토리
│   │   ├── constants.ts              # 전역 상수 (분야 매핑, 컬러 등)
│   │   └── prompts.ts                # Claude 프롬프트 템플릿
│   ├── types/
│   │   ├── leaflet.d.ts              # Leaflet 타입 정의
│   │   └── kakao.d.ts                # (레거시) 카카오맵 타입
│   └── generated/prisma/             # 자동 생성된 Prisma 타입
├── prisma/
│   └── schema.prisma                 # DB 스키마 정의
├── tailwind.config.ts                # Tailwind 디자인 토큰
├── tsconfig.json
├── next.config.mjs
└── package.json
```

---

## 4. 데이터베이스 스키마

**Prisma 모델 (4개 테이블):**

### Academy (`academies`)
- ID, 학원명, 유형, 분야(realm), 교습과정/과목, 정원, 수강료, 주소, 좌표(lat/lng), 등록상태, 설립/폐원일, 원본 API 응답
- 인덱스: latitude/longitude (지리공간), realm (필터링)
- 유니크 제약: acaAsnum + atptOfcdcScCode (교육청 코드)

### School (`schools`)
- ID, 학교명, 학교 종류(초/중/고), 주소, 좌표, 남녀공학 여부, 설립 유형, 고교 유형
- 인덱스: latitude/longitude
- 유니크 제약: sdSchulCode + atptOfcdcScCode

### DistrictStats (`district_stats`)
- 행정구역별·분야별 집계 통계 (사전 계산된 데이터)
- 시도, 시군구, 동, 분야, 학원수, 평균수강료, 총정원

### AiReport (`ai_reports`)
- AI 분석 리포트 캐시
- 지역키, 리포트 내용(JSON), 데이터 스냅샷, 생성/만료 시간
- TTL 기반 만료 (기본 7일)

---

## 5. 페이지별 기능 상세

### 5.1 홈 / 지도 뷰 (`/`)

**구현 목적:** 사용자가 직관적으로 전국 학원 분포를 탐색하고, 학교 기준으로 주변 학원을 찾을 수 있는 메인 인터페이스

**핵심 기능:**
- Leaflet 인터랙티브 지도 (서울 중심, 줌 레벨 8)
- **마커 뷰:** 분야별 색상 코딩된 클러스터 마커
- **히트맵 뷰:** heatmap.js 기반 밀도 시각화
- **실시간 필터링:** 학습/입시, 예체능, 외국어 등 분야별 필터
- **동적 데이터 로딩:** 지도 뷰포트 범위 기반 학원 fetch (Haversine 거리)
- **학교 검색:** 학교명 검색 → 주변 학원 표시
- **반경 조절:** 1~5km 반경 원형 표시
- **사이드 패널:** 데스크탑 420px 슬라이드인 / 모바일 바텀시트 모달
- **AI 추천:** Claude API 기반 학원 조합 추천
- **로딩 상태:** 300ms 디바운스 로딩 인디케이터

**데이터 흐름:**
1. 지도 이동/줌 → `onBoundsChanged` 이벤트
2. `/api/academies?swLat=...&neLat=...&swLng=...&neLng=...&realm=...&limit=5000` fetch
3. 마커 표시 + 통계 계산
4. 마커 클릭 → `/api/academies/[id]` 로드
5. 학교 검색 → `/api/schools/search?q=...`
6. 학교 선택 → `/api/schools/[id]/nearby?radius=...`

**사용 컴포넌트:**
MapView, FilterPanel, RegionStats, SchoolSearch, SchoolDashboard, SchoolDetail, AcademyDetail, RecommendPanel

---

### 5.2 전국 대시보드 (`/dashboard`)

**구현 목적:** 전국 학원 현황을 한눈에 파악할 수 있는 통계 대시보드

**핵심 기능:**
- 빅넘버 카드: 전체 학원수, 전체 학교수, 분야수, 시도수 (Framer Motion 카운트업 애니메이션 1.2초)
- 시도별 학원수 바 차트 (내림차순 정렬, 17색 팔레트)
- 분야별 분포 도넛 차트 + 범례
- 학원 밀도 Top 10 테이블 (인라인 프로그레스바)

**데이터:** `GET /api/districts/stats`

---

### 5.3 지역 비교 (`/compare`)

**구현 목적:** 두 지역의 교육 인프라를 직접 비교하여 지역 간 격차를 시각적으로 확인

**핵심 기능:**
- 시도 → 시군구 2단계 드롭다운 (지역 1 & 2)
- 파이 차트: 각 지역의 분야별 분포
- 바 차트: 분야별 학원 수 비교
- 통계 카드: 총 학원수, 평균 수강료, 평균 정원
- AI 생성 비교 분석 텍스트

**데이터:** `GET /api/districts/stats?sido=...&type=sigungu_list`, `GET /api/districts/compare?region1=...&region2=...`

---

### 5.4 수강료 통계 (`/tuition`)

**구현 목적:** 분야별·지역별 수강료 패턴을 분석하여 학부모 의사결정 지원

**핵심 기능:**
- 사이드바: 시도 선택 + 그룹핑(시도/시군구)
- 분야별 평균 수강료 바 차트 (지역별 그룹핑)
- 지역별 수강료 비교 차트
- 전국 평균 수강료 인디케이터
- 최소 3개 학원 이상 지역만 필터

**데이터:** `GET /api/tuition?groupBy=sido|sigungu&sido=...`

---

### 5.5 교육 형평성 분석 (`/equity`)

**구현 목적:** 학교 기준 학원 접근성을 분석하여 교육 사각지대를 식별

**핵심 기능:**
- 시도 선택 + 반경(0.5~5km) 설정
- **접근성 등급 분류:**
  - 사각지대: <5개 학원
  - 부족: 5~9개
  - 보통: 10~19개
  - 충분: 20~49개
  - 매우 충분: 50개+
- 학교 테이블 (접근성 배지 + 주변 학원수)
- 접근성 분포 히스토그램

**데이터:** `GET /api/equity?sido=...&radius=...` (PostgreSQL Haversine 거리 계산)

---

### 5.6 데이터 인사이트 (`/insights`)

**구현 목적:** 학원 밀도와 수강료의 상관관계 등 데이터 기반 교육 인사이트 제공

**핵심 기능:**
- 학원 밀도 vs 수강료 상관관계 산점도
- 학교당 학원 비율 바 차트 (HAVING count >= 10)
- 통계 분석 인사이트
- 분야 다양성 지표

**데이터:** `GET /api/correlation`

---

## 6. AI 기능 상세

### Claude API 연동 (`src/lib/anthropic.ts`)
- **인증:** `CLAUDE_API_KEY` 또는 `ANTHROPIC_API_KEY` 환경변수
- **모델:** claude-3-haiku-20240307 (비용 효율적, 빠른 응답)
- **Max Tokens:** 2000/요청

### AI 학원 추천 (`/api/recommend`)
- **입력:** 학교 정보, 예산, 관심 분야, 주변 학원 목록
- **출력:** 마크다운 형식 추천문 — 지역 교육 인프라 분석, 예산 맞춤 2~4개 학원 조합, 비용 절감 전략, 교육 형평성 고려사항

### AI 분석 리포트 (`/api/analysis/report`)
- 지역 기반 구조화된 JSON 리포트 (요약, 분야 분석, 제안)

---

## 7. 디자인 시스템

### 컬러 토큰 (시맨틱)

| 토큰 | 컬러 | 용도 |
|------|-------|------|
| Primary 500 | #F43F5E (로즈) | 메인 브랜드 |
| Primary 600 | #E11D48 | 호버 상태 |
| Accent 500 | #3B82F6 (블루) | CTA, 차트 |
| Success | #22C55E (그린) | 성공 상태 |
| Warning | #F59E0B (앰버) | 경고 상태 |
| Error | #EF4444 (레드) | 에러 상태 |

### 학원 분야별 컬러

| 분야 | 컬러 |
|------|-------|
| 학습/입시 | #2563EB (블루) |
| 예체능 | #9333EA (퍼플) |
| 외국어 | #EC4899 (핑크) |
| 직업/자격 | #EA580C (오렌지) |
| 종합학원 | #0D9488 (틸) |
| 독서실 | #CA8A04 (옐로) |
| 코딩/IT | #0891B2 (시안) |
| 사고력/논술 | #16A34A (그린) |
| 특수교육 | #DC2626 (레드) |

### 타이포그래피
- **폰트:** Pretendard (CDN)
- Display: 2.25rem bold / Heading-lg: 1.5rem bold / Heading: 1.25rem semibold / Body: 0.875rem / Caption: 0.75rem

### 애니메이션
- slide-in-right: 0.25s / slide-up: 0.35s / fade-in: 0.15s / shimmer: 2s infinite / count-up: 0.4s

---

## 8. 학원 분야 재분류 매핑

DB 원본 → 사용자 친화적 그룹:
```
'입시.검정 및 보습' → '학습/입시'
'예능(대)' + '기예(대)' → '예체능'
'외국어' + '국제화' → '외국어'
'직업기술' → '직업/자격'
'정보' → '코딩/IT'
... 총 12개 → 10개 그룹, 무지개색 배정
```

---

## 9. 성능 최적화

1. **React.memo** — FilterPanel, RegionStats (불필요한 리렌더 방지)
2. **디바운싱** — 지도 bounds 변경 300ms, 학교 검색 300ms, 로딩 표시 300ms
3. **클러스터 렌더링** — Leaflet MarkerCluster로 DOM 노드 감소
4. **DB 인덱스** — lat/lng (지리공간), realm (필터), 교육청코드
5. **페이지네이션** — 학원 최대 5000개/요청, 검색 최대 20개
6. **사전 집계** — district_stats 테이블 (대시보드 쿼리 최적화)
7. **조건부 로딩** — 히트맵 플러그인은 모드 전환 시에만 로드

---

## 10. API 라우트 레퍼런스

| 메서드 | 엔드포인트 | 설명 | 주요 파라미터 |
|--------|-----------|------|-------------|
| GET | `/api/academies` | 범위 내 학원 목록 | swLat, swLng, neLat, neLng, realm, limit |
| GET | `/api/academies/[id]` | 학원 상세 | id |
| POST | `/api/recommend` | AI 학원 추천 | schoolId, budget, interests, radius |
| GET | `/api/schools/search` | 학교 자동완성 | q (최소 2자) |
| GET | `/api/schools/[id]/nearby` | 학교 주변 학원 | id, radius |
| GET | `/api/districts/stats` | 전국/지역 통계 | sido, type |
| GET | `/api/districts/compare` | 두 지역 비교 | region1, region2 |
| GET | `/api/tuition` | 수강료 통계 | groupBy, sido |
| GET | `/api/equity` | 교육 형평성 | sido, radius |
| GET | `/api/correlation` | 밀도-수강료 상관관계 | - |
| POST | `/api/analysis/report` | AI 분석 리포트 | regionKey |

---

## 11. 환경 변수

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
NEIS_API_KEY=<나이스 Open API 키>
CLAUDE_API_KEY=<Claude API 키> (또는 ANTHROPIC_API_KEY)
NAVER_CLIENT_ID=<네이버 클라우드 API ID> (지오코딩용)
NAVER_CLIENT_SECRET=<네이버 클라우드 시크릿>
```

---

## 12. 사용자 워크플로우

### 워크플로우 1: 지도로 학원 탐색
홈 → 지도 이동/줌 → 마커 자동 로드 → 분야 필터 → 마커 클릭 → 학원 상세

### 워크플로우 2: 학교 주변 학원 찾기
홈 → 학교 검색 → 학교 마커 + 반경 원 → 반경 조절 → SchoolDashboard에서 주변 학원 확인

### 워크플로우 3: AI 추천 받기
학교 선택 → AI 추천 클릭 → 예산/관심분야 설정 → 반경 조절 → Claude 추천문 + 학원 리스트

### 워크플로우 4: 지역 교육 데이터 분석
대시보드(전국 개요) → 비교(지역 대비) → 수강료(분야/지역별) → 형평성(접근성) → 인사이트(상관관계)

---

## 13. 모바일 반응형

| 요소 | 데스크탑 (lg+) | 모바일 (<md) |
|------|---------------|-------------|
| 헤더 | 가로 네비게이션 | 햄버거 메뉴 |
| 사이드 패널 | 420px 슬라이드인 | 바텀시트 모달 (75vh) |
| 하단 통계 | 전체 표시 | 일부 숨김 |
| 차트 | ResponsiveContainer 자동 | 동일 |
| 필터 버튼 | 줄바꿈 | 가로 스크롤 |

---

## 14. 남은 이슈 (재개 시 확인)

- [ ] 모바일 하단 탭바 미구현
- [ ] 일부 페이지(tuition, equity, insights)에서 공통 컴포넌트(Button/Card) 미적용
- [ ] compare/page.tsx에 빈 VS 구분선 dead code 잔존
- [ ] 테스트 코드 없음 (Jest/Vitest 미설정)
- [ ] 데이터 실시간 동기화 미구현 (정적 데이터)
- [ ] 사용자 인증/개인화 없음
- [ ] 다국어 미지원

---

## 15. 실행 방법

```bash
# 개발 서버
npm run dev    # localhost:3000

# 빌드
npm run build

# 프로덕션
npm run start

# DB 마이그레이션
npx prisma migrate dev
npx prisma generate
```

---

*이 문서는 AI 에이전트가 프로젝트를 이해하고 개발을 이어갈 수 있도록 코드 분석 기반으로 작성되었습니다.*
*작성일: 2026-03-25 | 작성: Photon (팀 인탱글 리뷰어)*
