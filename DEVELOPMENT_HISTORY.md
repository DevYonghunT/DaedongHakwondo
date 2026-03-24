# 대동학원도 개발 히스토리

## 프로젝트 개요
교육 공공데이터를 활용한 전국 학원/교습소 분포 시각화 및 분석 서비스.
제8회 교육 공공데이터 AI활용대회 출품작.

---

## Phase 1: 데이터 수집 및 지오코딩

### 학원 데이터 지오코딩
- **대상**: 전국 학원/교습소 205,553건 (NEIS 교육정보 개방포털)
- **방법**: Naver Cloud Geocoding API 사용
- **소요 시간**: 약 5~6시간 (백그라운드 실행)
- **결과**: 204,968건 성공 (99.7%), 585건 실패
- 초당 약 10건 처리, 1시간 단위로 진행 상황 모니터링

### 학교 데이터 수집 + 지오코딩
- **대상**: 전국 학교 11,367건 (NEIS API)
- **스크립트**: `scripts/collect_schools.py`
- **결과**: 11,272건 성공 (99.2%), 95건 실패
- 학원 대비 적은 데이터로 약 40분 소요

---

## Phase 2: 인프라 구축

### PostgreSQL + PostGIS 설정
- Docker 미설치 상태에서 Homebrew PostgreSQL@15로 전환
- PostGIS 확장 설치 (`CREATE EXTENSION postgis`)
- `hakwonnono` 데이터베이스 및 역할 생성
- Prisma ORM 연동 (`DATABASE_URL` 설정)

### DB 로딩
- `scripts/load_to_db.py`로 지오코딩된 데이터를 PostgreSQL에 적재
- academies 테이블: 204,968건
- schools 테이블: 11,272건

---

## Phase 3: 카카오맵 → Leaflet/OpenStreetMap 전환

### 문제
- 카카오맵 SDK 로딩 실패 (`ERR_BLOCKED_BY_ORB`)
- `http://` → `https://` 변경 후에도 브라우저에서 계속 차단

### 해결
- Leaflet + OpenStreetMap으로 완전 교체
- `react-leaflet` 대신 순수 Leaflet API로 구현 (SSR 호환)
- Leaflet.markercluster로 클러스터링 구현
- leaflet-heat로 히트맵 모드 구현

---

## Phase 4: 학원 분야 재분류

### 문제
- "기타(대)" 분류에 너무 많은 학원이 포함
- "국제화"와 "외국어" 분류 중복

### 재분류 결과

| 변경 | 내용 |
|------|------|
| 국제화 → 외국어 | 7,947건 통합 |
| 기예(대) → 예능(대) | 2,124건 통합 |
| 기타(대) 예능 계열 → 예능(대) | 567건 (연극, 서예, 만화 등) |
| 기타(대) IT 계열 → 정보 | 425건 (컴퓨터, 로봇, 소프트웨어 등) |
| 기타(대) 직업 계열 → 직업기술 | 141건 (이미용, 항공승무원 등) |
| 기타(대) 사고력 → 사고력/교양 | 533건 (바둑, 속독, 주산 등) |
| 나머지 기타 → 기타 | 1,447건 |

### 최종 분류 체계
1. 입시.검정 및 보습 (71,646건)
2. 예능(대) (35,567건)
3. 외국어 (7,948건)
4. 직업기술 (3,837건)
5. 종합(대) (3,622건)
6. 독서실 (2,028건)
7. 기타 (1,447건)
8. 정보 (587건)
9. 사고력/교양 (533건)
10. 특수교육(대) (11건)

---

## Phase 5: 핵심 기능 구현

### 5-1. 수강료 물가 지수 (`/tuition`)
- 지역별/분야별 수강료 비교 분석
- 히트맵 테이블로 시각화
- API: `GET /api/tuition`

### 5-2. 사교육 접근성 격차 분석 (`/equity`)
- 학교별 반경(1/2/3km) 내 학원 수 계산 (Haversine 공식)
- 접근성 지수: 사각지대(0~4개), 부족(5~9개), 보통(10~19개), 충분(20+개)
- 시도별 필터링, 분포 차트, 사각지대 학교 목록
- API: `GET /api/equity?sido=서울특별시&radius=2`

### 5-3. AI 맞춤 학원 추천 (`RecommendPanel`)
- 예산/관심 분야 입력 → Claude Haiku API로 최적 조합 추천
- 학교 주변 실제 학원 데이터 기반 추천
- API: `POST /api/recommend`

### 5-4. 데이터 인사이트 (`/insights`)
- 학원 밀집도 순위 (학교당 학원 수)
- 학원 수 vs 수강료 산점도 (지역별 상관관계)
- 분야 다양성 분석 (상위/하위 지역)
- API: `GET /api/correlation`

### 5-5. 학원 상세정보 패널 (`AcademyDetail`)
- 학원 마커 클릭 시 슬라이드 인 패널
- 학원명, 분야, 교습과목, 수강료, 주소 등 상세 정보
- API: `GET /api/academies/[id]`

### 5-6. 학교 상세정보 (`SchoolDetail`)
- 학교알리미 API 연동 (급식, 학생수 등)
- 학교 마커는 학원 마커와 구분되는 아이콘 사용
- API: `GET /api/schools/[id]/detail`

---

## Phase 6: UI/UX 리디자인

### Airbnb 스타일 메인 지도 페이지
- 화이트 배경, 부드러운 그림자, 둥근 카드 UI
- 필터를 상단에 가로로 나열 (Airbnb 검색 필터 스타일)
- 사이드패널 슬라이드 인 방식

### 디자인 원칙 (CLAUDE.md)
- 폰트: Pretendard (본문), Outfit (헤딩)
- 색상: Navy (#1e293b), White (#f8fafc), Gold (#f59e0b)
- 간격: 8px 그리드 시스템
- 라운딩: 8px (카드), 12px (모달), 9999px (버튼)
- 레퍼런스: Airbnb (지도), Mixpanel (대시보드), 토스 (모바일), Linear (사이드패널)

---

## Phase 7: 버그 수정

### 학교 선택 시 지도 확대/축소 안되는 버그
- **원인**: `selectedSchoolPosition`이 매 렌더마다 새 객체 생성 → useEffect 반복 실행 → `setView` 반복 호출
- **수정**:
  1. `useMemo`로 `schoolPosition` 안정화
  2. `lastSchoolPosRef`로 같은 위치면 `setView` 스킵

### AI API 모델 404 에러
- **원인**: `claude-3-5-haiku-20241022` 모델 ID가 유효하지 않음
- **수정**: `claude-3-haiku-20240307`로 변경

### .next 캐시 깨짐
- **증상**: `Cannot find module './948.js'` 에러
- **수정**: `.next` 폴더 삭제 후 서버 재시작

---

## 기술 스택

| 카테고리 | 기술 |
|----------|------|
| 프론트엔드 | Next.js 14, React 18, TypeScript, Tailwind CSS |
| 지도 | Leaflet, OpenStreetMap, leaflet.markercluster, leaflet-heat |
| 차트 | Recharts |
| 백엔드 | Next.js API Routes |
| DB | PostgreSQL 15 + PostGIS |
| ORM | Prisma |
| AI | Claude API (claude-3-haiku-20240307) |
| 외부 API | NEIS 교육정보 개방포털, 학교알리미, Naver Cloud Geocoding |
| 배포 | Vercel (예정) |

---

## 프로젝트 구조

```
hakwon-nono/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 메인 지도 페이지
│   │   ├── dashboard/page.tsx    # 전국 현황 대시보드
│   │   ├── compare/page.tsx      # 지역 비교
│   │   ├── tuition/page.tsx      # 수강료 물가 지수
│   │   ├── equity/page.tsx       # 접근성 격차 분석
│   │   ├── insights/page.tsx     # 데이터 인사이트
│   │   └── api/
│   │       ├── academies/        # 학원 목록/상세
│   │       ├── schools/          # 학교 검색/상세
│   │       ├── districts/        # 지역 통계/비교
│   │       ├── tuition/          # 수강료 통계
│   │       ├── equity/           # 접근성 지수
│   │       ├── recommend/        # AI 학원 추천
│   │       ├── correlation/      # 상관관계 분석
│   │       └── analysis/report/  # AI 분석 리포트
│   ├── components/
│   │   ├── MapView.tsx           # Leaflet 지도
│   │   ├── FilterPanel.tsx       # 필터 패널
│   │   ├── AcademyDetail.tsx     # 학원 상세
│   │   ├── SchoolSearch.tsx      # 학교 검색
│   │   ├── SchoolDashboard.tsx   # 학교 대시보드
│   │   ├── SchoolDetail.tsx      # 학교 상세
│   │   ├── RegionStats.tsx       # 지역 통계
│   │   ├── RecommendPanel.tsx    # AI 추천 패널
│   │   └── AIReport.tsx          # AI 리포트
│   └── lib/
│       ├── prisma.ts             # Prisma 클라이언트
│       ├── anthropic.ts          # Claude API 클라이언트
│       └── constants.ts          # 상수 (시도 코드 등)
├── scripts/
│   ├── geocode_academies.py      # 학원 지오코딩
│   ├── collect_schools.py        # 학교 수집 + 지오코딩
│   └── load_to_db.py             # DB 적재
├── data/
│   ├── academies_geocoded.jsonl  # 학원 지오코딩 결과 (204,968건)
│   ├── schools_geocoded.jsonl    # 학교 지오코딩 결과 (11,272건)
│   └── geocode_failures.jsonl    # 실패 기록
└── prisma/
    └── schema.prisma             # DB 스키마
```

---

## 커밋 히스토리

| 커밋 | 내용 |
|------|------|
| `f3a9477` | Airbnb 스타일 리디자인, AI 모델 수정, 학교 선택 줌 버그 수정 |
| `b6db288` | 수강료 분석, 접근성 격차, AI 추천, 데이터 인사이트 등 핵심 기능 추가 |
| `f1044ae` | 카카오맵→Leaflet/OSM 전환, 히트맵 구현, AI 리포트 수정 |
| `42ececf` | kartoza/postgis 환경변수명 수정 |
| `b3922ac` | Prisma가 .env.local에서 DATABASE_URL 읽도록 수정 |
| `e0958f3` | ARM64 지원 PostGIS 이미지로 변경 |

---

## 데이터 현황

| 데이터 | 건수 | 출처 |
|--------|------|------|
| 학원/교습소 | 204,968건 | NEIS 교육정보 개방포털 |
| 학교 | 11,272건 | NEIS 교육정보 개방포털 |
| 지오코딩 성공률 (학원) | 99.7% | Naver Cloud Geocoding |
| 지오코딩 성공률 (학교) | 99.2% | Naver Cloud Geocoding |
