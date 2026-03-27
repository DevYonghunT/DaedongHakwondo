# 대동학원도 (DaedongHakwondo) — 프로젝트 전체 문서

> AI 에이전트가 이 프로젝트를 이해하고 작업할 수 있도록 정리한 종합 문서입니다.

---

## 1. 프로젝트 목표

**"대한민국 사교육 지도를 만들자"**

교육 공공데이터(나이스 교육정보 개방포털)를 활용하여:
- 전국 학원 분포를 지도 위에 시각화
- AI 분석으로 사교육 현황 인사이트 제공
- 학교 주변 사교육 접근성 분석 (교육 형평성)
- 학부모에게 예산/관심 기반 학원 추천

**핵심 가치**: 사교육 정보의 투명성과 교육 형평성 향상

---

## 2. 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 14 (App Router), TypeScript, Tailwind CSS 3.4 |
| UI/애니메이션 | Framer Motion, Lucide React, React Hot Toast |
| 지도 | Leaflet 1.9.4 + OpenStreetMap + MarkerCluster + leaflet.heat |
| 차트 | Recharts 3.8.0 |
| 백엔드 | Next.js API Routes |
| ORM | Prisma 7.5.0 |
| 데이터베이스 | PostgreSQL 15 + PostGIS 3.4 (Docker) |
| AI | Claude API (Anthropic SDK 0.80.0, Haiku 모델) |
| 배포 | Vercel (프론트+API) + Mac Mini Docker (DB) |

---

## 3. 프로젝트 구조

```
hakwon-nono/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # 메인 (지도 + 필터)
│   │   ├── layout.tsx                # 루트 레이아웃
│   │   ├── template.tsx              # 페이지 트랜지션
│   │   ├── globals.css               # 글로벌 스타일
│   │   ├── dashboard/page.tsx        # 전국 현황 대시보드
│   │   ├── compare/page.tsx          # 지역 비교 분석
│   │   ├── tuition/page.tsx          # 수강료 현황
│   │   ├── equity/page.tsx           # 교육 형평성 (접근성)
│   │   ├── insights/page.tsx         # 상관관계 인사이트
│   │   └── api/                      # API 엔드포인트
│   │       ├── academies/
│   │       │   ├── route.ts          # 학원 조회 (지도 바운드)
│   │       │   └── [id]/route.ts     # 학원 상세
│   │       ├── schools/
│   │       │   ├── search/route.ts   # 학교 검색 (자동완성)
│   │       │   └── [id]/
│   │       │       ├── detail/route.ts
│   │       │       └── nearby/route.ts
│   │       ├── districts/
│   │       │   ├── stats/route.ts    # 전국/시도 통계
│   │       │   └── compare/route.ts  # 지역 비교
│   │       ├── analysis/report/route.ts  # AI 리포트
│   │       ├── recommend/route.ts    # AI 학원 추천
│   │       ├── tuition/route.ts      # 수강료 통계
│   │       ├── equity/route.ts       # 접근성 분석
│   │       └── correlation/route.ts  # 상관관계 분석
│   ├── components/
│   │   ├── MapView.tsx               # Leaflet 지도
│   │   ├── FilterPanel.tsx           # 분야 필터 + 뷰 모드
│   │   ├── RegionStats.tsx           # 지역 통계 (하단)
│   │   ├── SchoolSearch.tsx          # 학교 검색 자동완성
│   │   ├── SchoolDashboard.tsx       # 학교별 대시보드
│   │   ├── AcademyDetail.tsx         # 학원 상세 정보
│   │   ├── SchoolDetail.tsx          # 학교 상세 정보
│   │   ├── AIReport.tsx              # AI 분석 리포트
│   │   ├── RecommendPanel.tsx        # AI 학원 추천 패널
│   │   ├── Header.tsx                # 공통 헤더
│   │   ├── charts/
│   │   │   ├── RealmPieChart.tsx     # 분야별 도넛 차트
│   │   │   └── RegionBarChart.tsx    # 지역별 바 차트
│   │   └── ui/                       # 공통 UI
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Tooltip.tsx
│   │       ├── Skeleton.tsx
│   │       ├── Toast.tsx
│   │       └── index.ts
│   ├── lib/
│   │   ├── constants.ts              # 상수 (색상, 분야 매핑)
│   │   ├── prisma.ts                 # Prisma 클라이언트
│   │   ├── anthropic.ts              # Claude API 클라이언트
│   │   └── prompts.ts                # AI 프롬프트 템플릿
│   └── types/
│       ├── leaflet.d.ts
│       └── kakao.d.ts
├── prisma/schema.prisma              # DB 스키마
├── docker-compose.yml                # PostgreSQL 설정
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
└── .env.local.example
```

---

## 4. 데이터베이스 스키마

### Academy (학원) — 127,229건
```
id                String    PK, UUID
atptOfcdcScCode   String    시도교육청코드
atptOfcdcScNm     String    시도교육청명
acaAsnum          String    학원지정번호
academyNm         String    학원명
academyType       String?   학원/교습소/개인과외
realmScNm         String?   분야명 (원본)
leOrdNm           String?   교습계열명
leCrseNm          String?   교습과정명
leSubjectNm       String?   교습과목명
capacity          Int?      정원
tuitionFee        Int?      수강료 (월, 원)
address           String?   주소
latitude          Float?    위도
longitude         Float?    경도
regStatus         String?   등록상태
establishedDate   String?   설립일
closedDate        String?   휴원일
rawData           Json?     원본 API 응답
updatedAt         DateTime

인덱스: [latitude, longitude], [realmScNm], [atptOfcdcScCode]
유니크: [acaAsnum, atptOfcdcScCode]
```

### School (학교) — 11,353건
```
id                String    PK, UUID
atptOfcdcScCode   String    시도교육청코드
sdSchulCode       String    표준학교코드
schoolNm          String    학교명
schoolKind        String?   초/중/고
address           String?   주소
latitude          Float?    위도
longitude         Float?    경도
coeduScNm         String?   남녀공학구분
fondScNm          String?   설립구분
hsScNm            String?   고등학교 구분

인덱스: [latitude, longitude]
유니크: [sdSchulCode, atptOfcdcScCode]
```

### DistrictStats (행정구역 집계)
```
id                String    PK, UUID
sido              String    시도
sigungu           String    시군구
dong              String?   읍면동
realm             String?   분야
academyCount      Int       학원 수
avgTuition        Int?      평균 수강료
totalCapacity     Int?      총 정원
updatedAt         DateTime

유니크: [sido, sigungu, dong, realm]
```

### AiReport (AI 분석 캐시)
```
id                String    PK, UUID
regionKey         String    지역 식별자 (유니크)
reportContent     String    리포트 JSON
dataSnapshot      Json?     분석 데이터
createdAt         DateTime
expiresAt         DateTime  만료일 (7일)
```

---

## 5. 페이지별 기능 상세

### 5.1 메인 페이지 (`/`) — 학원 지도

**목적**: 지도에서 학원 분포를 직관적으로 탐색

**기능**:
- Leaflet + OpenStreetMap 지도
- 지도 드래그 시 바운드(SW/NE 좌표) 기반 학원 조회
- 분야별 필터 (10개 그룹, 다중 선택)
- 뷰 모드: 마커 모드 / 히트맵 모드
- 마커 클러스터링 (MarkerCluster, 최대 5,000개)
- 히트맵: intensity 기반 색상 (파랑→빨강)
- 학원 클릭 시 상세 정보 팝업
- 하단 지역 통계 (현재 화면 학원 수 + 분야 비율)
- 학교 검색: 자동완성으로 학교 선택 → 반경 원 표시 + 주변 학원 분석
- AI 추천 패널: 학교/예산/관심분야/반경 입력 → Claude가 추천

### 5.2 전국 현황 대시보드 (`/dashboard`)

**목적**: 전국 사교육 현황을 한눈에 파악

**기능**:
- 시도별 학원 수 바 차트
- 분야별 분포 도넛 차트
- Top 10 학원 밀집 지역 (시군구 단위)
- 전국 총 학원 수, 학교 수 요약

### 5.3 지역 비교 (`/compare`)

**목적**: 두 지역의 사교육 환경을 비교 분석

**기능**:
- 시도 → 시군구 2단계 선택 (2개 지역)
- 학원 총 수, 분야별 분포, 평균 수강료 비교
- 분야별 도넛 차트, 지역별 바 차트
- Claude AI 비교 인사이트 생성

### 5.4 수강료 현황 (`/tuition`)

**목적**: 지역/분야별 수강료 실태 파악

**기능**:
- 시도별 또는 시군구별 수강료 통계
- 분야별 평균/최소/최대 수강료
- 전국 평균 대비 비교
- 바 차트: 지역별 평균 수강료

### 5.5 교육 형평성 (`/equity`)

**목적**: 학교 주변 사교육 접근성 사각지대 파악

**기능**:
- 학교별 반경 내 학원 개수 카운팅 (Haversine 공식)
- 접근성 등급 판정:
  - 사각지대: 0~4개
  - 부족: 5~9개
  - 보통: 10~19개
  - 충분: 20~49개
  - 매우 충분: 50개 이상
- 등급별 분포 차트
- 시도별 + 반경별 필터

### 5.6 데이터 인사이트 (`/insights`)

**목적**: 사교육 데이터 간 상관관계 발견

**기능**:
- 학원 밀집도 vs 수강료 산점도
- 학교당 평균 학원 개수 바 차트
- 분야 다양성 분석 (distinct 분야 수)

---

## 6. API 엔드포인트 명세

### 학원 관련

| 메서드 | 경로 | 파라미터 | 설명 |
|--------|------|----------|------|
| GET | `/api/academies` | swLat, swLng, neLat, neLng, realm?, limit? | 지도 바운드 내 학원 조회 (기본 500, 최대 10,000) |
| GET | `/api/academies/[id]` | - | 학원 상세 정보 |

### 학교 관련

| 메서드 | 경로 | 파라미터 | 설명 |
|--------|------|----------|------|
| GET | `/api/schools/search` | q (2자 이상) | 학교명 자동완성 검색 |
| GET | `/api/schools/[id]/detail` | - | 학교 상세 정보 |
| GET | `/api/schools/[id]/nearby` | radius? (기본 2km) | 학교 주변 학원 통계 + 시도 평균 비교 |

### 통계/분석

| 메서드 | 경로 | 파라미터 | 설명 |
|--------|------|----------|------|
| GET | `/api/districts/stats` | sido?, type? | 전국 통계 또는 시도별 시군구 목록 |
| GET | `/api/districts/compare` | region1, region2 | 두 지역 비교 통계 |
| GET | `/api/tuition` | groupBy?, sido? | 수강료 통계 |
| GET | `/api/equity` | sido?, radius? | 학교별 접근성 분석 |
| GET | `/api/correlation` | - | 밀집도 vs 수강료 상관관계 |

### AI 기능

| 메서드 | 경로 | 바디 | 설명 |
|--------|------|------|------|
| POST | `/api/analysis/report` | regionKey | AI 리포트 (7일 캐시) |
| POST | `/api/recommend` | schoolId, budget, interests[], radius | AI 학원 추천 |

---

## 7. 학원 분야 분류 체계

DB 원본명(나이스 API)을 사용자 친화적 10개 그룹으로 매핑:

| 그룹명 | DB 원본명 | 색상 |
|--------|-----------|------|
| 학습/입시 | 입시.검정 및 보습 | #2563EB (파랑) |
| 예체능 | 예능(대), 기예(대) | #9333EA (보라) |
| 외국어 | 외국어, 국제화 | #EC4899 (핑크) |
| 직업/자격 | 직업기술 | #EA580C (주황) |
| 종합학원 | 종합(대) | #0D9488 (청록) |
| 독서실 | 독서실 | #CA8A04 (노랑) |
| 기타 | 기타, 분류 없음 | #78716C (갈색) |
| 코딩/IT | 정보 | #0891B2 (시안) |
| 사고력/논술 | 사고력/교양, 인문사회(대) | #16A34A (초록) |
| 특수교육 | 특수교육(대) | #DC2626 (빨강) |

---

## 8. AI 기능 상세

### AI 리포트 (`/api/analysis/report`)
- Claude Haiku 모델 사용
- 지역 사교육 현황 분석 + 방과후 프로그램 제안
- 7일 캐시 (AiReport 테이블)
- 프롬프트: `src/lib/prompts.ts`

### AI 학원 추천 (`/api/recommend`)
- 입력: 학교, 월 예산(만원), 관심 분야, 반경
- Haversine 공식으로 주변 학원 필터링 후 Claude에게 분석 요청
- 출력: 추천 텍스트 + 학원 카드 목록
- 프롬프트: 예산 내 조합 추천 + 사교육비 절감 방안 + 형평성 관점

---

## 9. 디자인 시스템

### 색상 토큰
- **Primary (Rose)**: 브랜드 메인 — `#F43F5E` (Airbnb 벤치마킹)
- **Secondary (Slate)**: 중립 톤
- **Accent (Blue)**: 강조 — `#2563EB`
- **Semantic**: success(초록), warning(주황), error(빨강)

### 타이포그래피
- 폰트: Pretendard (Variable)
- 스케일: display(36px) → caption(12px)

### 애니메이션 (Framer Motion)
- 페이지 전환: slide-in-right/slide-up
- 로딩: shimmer 스켈레톤
- 카드 호버: scale + shadow
- 숫자: count-up

### UI 컴포넌트
- Button (크기/변형/상태)
- Card (패딩/애니메이션)
- Tooltip (호버)
- Skeleton (로딩 상태)
- Toast (알림)

---

## 10. 환경 변수

```bash
DATABASE_URL="postgresql://hakwonnono:hakwonnono@localhost:5433/hakwonnono?schema=public"
NEIS_API_KEY=나이스_교육정보_API_키
NEXT_PUBLIC_KAKAO_JS_APP_KEY=카카오_JS_앱키 (미사용)
NAVER_CLIENT_ID=네이버_클라우드_ID
NAVER_CLIENT_SECRET=네이버_클라우드_시크릿
ANTHROPIC_API_KEY=클로드_API_키
```

---

## 11. 실행 방법

```bash
# DB 실행
docker-compose up -d

# 의존성 설치
npm install

# Prisma 클라이언트 생성
npx prisma generate

# 개발 서버
npm run dev

# 빌드
npm run build

# 프로덕션
npm start
```

---

## 12. 완료된 작업 이력

1. 디자인 시스템 구축 (Framer Motion, lucide-react, 디자인 토큰)
2. 에어비앤비 벤치마킹 UI/UX 고도화
3. 공통 NavBar + 페이지 전환 애니메이션
4. 학원 분야 재분류 (12→10개, 무지개색 배정)
5. 학교별 방과후 활동 추천 (시도 평균 절대 개수 기반 비교)
6. AI 추천 프롬프트 공공 목적 개편
7. XSS 방지, API 거리 계산 통일 등 보안/정확도 수정
8. DB 데이터 복원 (학원 127,229건, 학교 11,353건)

---

## 13. 데이터 출처

- **학원 데이터**: 나이스 교육정보 개방포털 (open.neis.go.kr)
- **학교 데이터**: 학교알리미 공개용데이터 (schoolinfo.go.kr)
- **지오코딩**: 네이버 클라우드 플랫폼 Geocoding API
- **지도 타일**: OpenStreetMap

---

## 14. 현재 상태

**2026-03-24 기준 일시 중단**. 대장님(힉스 보존) 재개 지시 대기 중.

백업 브랜치: `backup/pre-design-upgrade-20260324`
GitHub: `https://github.com/DevYonghunT/DaedongHakwondo.git`
