# 학원노노 — Claude Code 단계별 프롬프트 가이드

> 제8회 교육 공공데이터 AI활용대회 출품용 프로젝트
> 나이스 학원교습소 API 기반 사교육 시각화 & AI 분석 서비스

---

## 사전 준비

### CLAUDE.md 프로젝트 설정

> 프로젝트 루트에 CLAUDE.md 파일을 먼저 만들어서 Claude Code가 프로젝트 컨텍스트를 이해하도록 합니다.

```
다음 내용으로 CLAUDE.md 파일을 생성해줘:

# 학원노노 (HakwonNono)

## 프로젝트 개요
"호갱노노"처럼 교육 공공데이터를 지도 위에 시각화하는 웹서비스.
나이스 학원교습소 API 데이터를 활용해 지역별 학원 분포를 보여주고,
AI 분석으로 사교육 현황 인사이트를 제공한다.

## 기술 스택
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Map: Kakao Map SDK
- Backend: Next.js API Routes
- DB: Supabase (PostgreSQL)
- AI: Claude API (Anthropic)
- Deploy: Vercel

## 주요 데이터 소스
- 나이스 교육정보 개방포털 Open API (open.neis.go.kr)
  - 학원교습소정보 API
  - 학교기본정보 API
- 학교알리미 공개용데이터 (schoolinfo.go.kr)
  - 방과후학교 운영 현황
- 카카오맵 Geocoding API

## 환경 변수
- NEIS_API_KEY: 나이스 Open API 인증키
- KAKAO_REST_API_KEY: 카카오 REST API 키
- KAKAO_JS_APP_KEY: 카카오 JavaScript 앱 키
- SUPABASE_URL: Supabase 프로젝트 URL
- SUPABASE_ANON_KEY: Supabase 익명 키
- ANTHROPIC_API_KEY: Claude API 키

## 코딩 컨벤션
- 한국어 주석 사용
- API 응답은 TypeScript 인터페이스로 타입 정의
- 에러 핸들링은 try-catch + 사용자 친화적 메시지
- 컴포넌트는 함수형 + hooks 패턴
```

---

## Phase 0: 프로젝트 초기 설정 및 데이터 파이프라인

### Step 0-1. 프로젝트 초기화

```
Next.js 14 프로젝트를 생성해줘. App Router 사용하고, TypeScript + Tailwind CSS 설정.
프로젝트명은 hakwon-nono.

추가로 필요한 패키지:
- @supabase/supabase-js (DB)
- @anthropic-ai/sdk (AI 분석)
- recharts (차트)

src/lib/ 폴더에 supabase.ts, anthropic.ts 클라이언트 설정 파일도 만들어줘.
환경 변수는 .env.local.example 파일로 템플릿을 제공해.
```

### Step 0-2. Supabase 데이터베이스 스키마 설계

```
Supabase에서 사용할 데이터베이스 스키마를 설계하고 SQL migration 파일을 만들어줘.

필요한 테이블:

1. academies (학원 정보)
   - id: uuid (PK)
   - atpt_ofcdc_sc_code: text (시도교육청코드)
   - atpt_ofcdc_sc_nm: text (시도교육청명)
   - academy_nm: text (학원명)
   - academy_type: text (학원/교습소/개인과외 구분)
   - realm_sc_nm: text (분야명 - 입시·검정, 국제화, 예능, 체육 등)
   - le_crse_nm: text (교습계열명)
   - le_subject_nm: text (교습과목명)
   - capacity: integer (정원)
   - tuition_fee: integer (수강료, 공개된 경우)
   - address: text (주소)
   - latitude: double precision
   - longitude: double precision
   - reg_status: text (등록상태)
   - established_date: date (설립일)
   - closed_date: date (휴원일, 해당 시)
   - raw_data: jsonb (원본 API 응답)
   - updated_at: timestamptz

2. schools (학교 기본정보)
   - id: uuid (PK)
   - atpt_ofcdc_sc_code: text (시도교육청코드)
   - sd_schul_code: text (표준학교코드)
   - school_nm: text (학교명)
   - school_kind: text (초/중/고)
   - address: text (주소)
   - latitude: double precision
   - longitude: double precision
   - coedu_sc_nm: text (남녀공학구분)
   - fond_sc_nm: text (설립구분 - 국립/공립/사립)

3. district_stats (행정구역별 집계 - 미리 계산)
   - id: uuid (PK)
   - sido: text (시도)
   - sigungu: text (시군구)
   - dong: text (읍면동)
   - realm: text (분야)
   - academy_count: integer
   - avg_tuition: integer
   - total_capacity: integer
   - updated_at: timestamptz

4. ai_reports (AI 분석 리포트 캐시)
   - id: uuid (PK)
   - region_key: text (지역 식별자, unique)
   - report_content: text
   - data_snapshot: jsonb (분석에 사용된 데이터)
   - created_at: timestamptz
   - expires_at: timestamptz

인덱스:
- academies: (latitude, longitude) GiST 인덱스, realm_sc_nm, atpt_ofcdc_sc_code
- schools: (latitude, longitude) GiST 인덱스
- district_stats: (sido, sigungu, dong)

RLS(Row Level Security)는 일단 비활성화 (공공데이터라 인증 불필요).
```

### Step 0-3. 나이스 API 데이터 수집 스크립트

```
나이스 교육정보 개방포털의 학원교습소정보 API에서 전국 학원 데이터를 수집하는
Python 스크립트를 만들어줘. scripts/collect_academies.py 경로에.

API 엔드포인트: https://open.neis.go.kr/hub/acaInsTiInfo
인증키는 환경변수 NEIS_API_KEY에서 읽어.

요구사항:
1. 17개 시도교육청 코드별로 순차 호출 (한 번에 전부 못 가져오니까)
   - 시도교육청 코드: B10(서울), C10(부산), D10(대구), E10(인천), F10(광주),
     G10(대전), H10(울산), I10(세종), J10(경기), K10(강원),
     L10(충북), M10(충남), N10(전북), O10(전남), P10(경북),
     Q10(경남), R10(제주)
2. pIndex(페이지)를 증가시키며 pSize=1000으로 전체 데이터 수집
3. 응답 형식은 JSON으로 요청 (Type=json)
4. API 호출 간 0.5초 sleep (서버 부하 방지)
5. 수집한 데이터를 JSON Lines 형식으로 data/academies_raw.jsonl에 저장
6. 진행 상황을 로깅 (교육청별 수집 건수 출력)
7. 이미 수집한 교육청은 스킵하는 resume 기능
8. 에러 발생 시 3회 retry

API 호출 예시:
GET https://open.neis.go.kr/hub/acaInsTiInfo?KEY={key}&Type=json&pIndex=1&pSize=1000&ATPT_OFCDC_SC_CODE=B10

응답 구조에서 필요한 필드:
- ATPT_OFCDC_SC_CODE, ATPT_OFCDC_SC_NM (시도교육청)
- ACA_INSTI_SC_NM (학원종류 - 학원/교습소/개인과외교습자)
- ACA_ASNUM (학원지정번호)
- ACA_NM (학원명)
- REALM_SC_NM (분야명)
- LE_ORD_NM (교습계열명)
- LE_CRSE_NM (교습과정명)
- ESTBL_YMD (설립일)
- REG_STTUS_NM (등록상태)
- CAA_BEGIN_YMD, CAA_END_YMD (휴원 시작/종료)
- PSNBY_THCC_CNTNT (정원 정보)
- FA_RDNMA (도로명주소)
- FA_RDNDA (도로명상세주소)
```

### Step 0-4. 주소 → 좌표 변환 (Geocoding)

```
수집한 학원 데이터의 주소를 위도/경도 좌표로 변환하는 스크립트를 만들어줘.
scripts/geocode_academies.py 경로에.

카카오 로컬 REST API 사용:
GET https://dapi.kakao.com/v2/local/search/address.json?query={주소}
Authorization: KakaoAK {REST_API_KEY}

요구사항:
1. data/academies_raw.jsonl에서 읽어서 처리
2. 도로명주소(FA_RDNMA + FA_RDNDA)를 우선 사용, 없으면 지번주소
3. Geocoding 결과를 academies_geocoded.jsonl로 저장
4. 카카오 API는 초당 10건 제한이 있으므로 rate limiting 적용
5. 이미 변환한 건은 스킵 (resume 기능)
6. 변환 실패한 건은 별도 파일(geocode_failures.jsonl)에 기록
7. 변환 성공률을 최종 출력

결과 파일에는 원본 데이터 + latitude, longitude 필드를 추가해서 저장.
```

### Step 0-5. 학교 기본정보 수집

```
나이스 학교기본정보 API에서 전국 초/중/고 학교 데이터를 수집하는 스크립트를 만들어줘.
scripts/collect_schools.py 경로에.

API 엔드포인트: https://open.neis.go.kr/hub/schoolInfo
요청 파라미터: KEY, Type=json, pIndex, pSize=1000, ATPT_OFCDC_SC_CODE

필요한 필드:
- ATPT_OFCDC_SC_CODE (시도교육청코드)
- SD_SCHUL_CODE (표준학교코드)
- SCHUL_NM (학교명)
- SCHUL_KND_SC_NM (학교종류 - 초등학교/중학교/고등학교)
- ORG_RDNMA (도로명주소)
- COEDU_SC_NM (남녀공학구분)
- FOND_SC_NM (설립구분)
- HS_SC_NM (고등학교 구분 - 일반고/특목고/자율고 등)

학원과 동일하게 시도교육청별로 수집하고, Geocoding도 수행해서
data/schools_geocoded.jsonl로 저장해줘.
```

### Step 0-6. DB 적재 스크립트

```
Geocoding 완료된 학원/학교 데이터를 Supabase에 적재하는 스크립트를 만들어줘.
scripts/load_to_supabase.py 경로에.

요구사항:
1. academies_geocoded.jsonl → academies 테이블
2. schools_geocoded.jsonl → schools 테이블
3. 적재 후 district_stats 테이블 집계 쿼리 실행
   - 시도/시군구/읍면동별로 분야별 학원 수, 평균 수강료, 총 정원 집계
   - 주소에서 시도/시군구/동을 파싱해야 함
4. 배치 insert (1000건씩)
5. upsert 모드로 중복 방지 (academy_nm + address 조합으로)
6. 적재 결과 요약 출력 (총 건수, 테이블별 건수)
```

---

## Phase 1: 대회 출품용 MVP 웹서비스

### Step 1-1. 카카오맵 기본 셋업

```
카카오맵 SDK를 Next.js에 통합해줘.

1. src/components/KakaoMap.tsx 컴포넌트 생성
   - 카카오맵 JavaScript SDK를 동적으로 로드 (Script 컴포넌트 사용)
   - 초기 중심좌표: 서울시청 (37.5665, 126.9780), 줌레벨 8
   - 지도 컨테이너는 화면 전체 높이 (100vh - 헤더높이)
   - 줌 컨트롤, 지도 타입 컨트롤 포함

2. src/app/page.tsx 메인 페이지에 지도 렌더링
   - 상단에 간단한 헤더 (서비스명 "학원노노", 로고)
   - 지도가 메인 화면을 차지

3. 카카오맵 타입 정의
   - src/types/kakao.d.ts 파일에 kakao.maps 관련 타입 선언

환경 변수 NEXT_PUBLIC_KAKAO_JS_APP_KEY를 사용해.
```

### Step 1-2. 학원 마커 클러스터링

```
카카오맵 위에 학원 데이터를 클러스터 마커로 표시하는 기능을 만들어줘.

1. API Route 생성: src/app/api/academies/route.ts
   - Supabase에서 학원 데이터를 조회
   - 쿼리 파라미터: bounds (지도 영역), realm (분야 필터), limit
   - 지도 영역(남서/북동 좌표) 내의 학원만 반환
   - 줌레벨이 낮을 때(광역 뷰)는 district_stats 집계 데이터 반환
   - 줌레벨이 높을 때(상세 뷰)는 개별 학원 데이터 반환

2. 카카오맵 MarkerClusterer 적용
   - kakao.maps.MarkerClusterer를 사용해서 클러스터링
   - 줌레벨에 따라 클러스터 아이콘 크기/색상 변경
   - 클러스터 클릭 시 해당 영역으로 줌인

3. 개별 마커 클릭 시 인포윈도우 표시
   - 학원명, 분야, 교습과목, 정원, 수강료(있는 경우)
   - 디자인은 깔끔한 카드 스타일

4. 지도 이동/줌 변경 시 데이터 다시 로드 (debounce 300ms)

호갱노노처럼 줌아웃하면 동 단위 원형 마커(학원 수 표시),
줌인하면 개별 학원 핀이 보이는 UX로 만들어줘.
```

### Step 1-3. 분야별 필터 UI

```
지도 위에 학원 분야별 필터 패널을 만들어줘.

1. src/components/FilterPanel.tsx
   - 지도 좌측 상단에 오버레이되는 필터 패널
   - 토글 버튼으로 열기/닫기
   - 분야 필터 (체크박스 또는 토글):
     ☑ 전체
     ☐ 입시·검정 및 보습
     ☐ 국제화
     ☐ 예능 (음악, 미술, 무용)
     ☐ 체육
     ☐ 외국어
     ☐ 직업기술
     ☐ 기타
   - 선택한 분야에 따라 지도 마커 필터링
   - 각 분야별 다른 색상 마커 (입시=파랑, 예능=보라, 체육=초록 등)

2. src/components/RegionStats.tsx
   - 지도 우측 하단에 현재 보이는 영역의 간단 통계
   - "현재 영역: 학원 1,234개 | 입시 45% | 예능 23% | 체육 12%"
   - 지도 이동 시 실시간 업데이트

3. 필터 상태는 URL 쿼리 파라미터로 관리 (공유 가능하도록)
```

### Step 1-4. 히트맵 뷰 모드

```
학원 밀집도를 히트맵으로 보여주는 뷰 모드를 추가해줘.

1. 지도 우측 상단에 뷰 모드 토글: [마커] [히트맵]

2. 히트맵 모드:
   - 학원 좌표 데이터를 기반으로 밀집도 히트맵 렌더링
   - 분야 필터 적용 시 해당 분야만으로 히트맵 생성
   - 색상: 파랑(저밀도) → 노랑 → 빨강(고밀도)

3. 카카오맵에는 기본 히트맵이 없으므로 두 가지 방식 중 선택:
   방법A: canvas overlay로 직접 히트맵 그리기 (heatmap.js 라이브러리)
   방법B: 동 단위 폴리곤에 밀집도 색상 입히기 (choropleth)

   → 방법A로 구현해줘. heatmap.js를 카카오맵 위에 오버레이하는 방식으로.

4. 호갱노노의 시세 히트맵처럼 직관적으로 "여기 학원이 많구나" 
   한눈에 파악되는 UX.
```

### Step 1-5. 학교 주변 분석 (학교 대시보드)

```
특정 학교를 선택하면 주변 사교육 현황을 분석하는 대시보드를 만들어줘.

1. 학교 검색 기능: src/components/SchoolSearch.tsx
   - 지도 상단 검색바에서 학교명 검색 (자동완성)
   - API Route: src/app/api/schools/search/route.ts
   - Supabase에서 LIKE 검색

2. 학교 선택 시 분석 패널: src/components/SchoolDashboard.tsx
   - 지도 우측에 사이드 패널로 열림 (호갱노노의 아파트 상세처럼)
   - 선택한 학교를 중심으로 반경 1km/2km/3km 원 표시
   - 반경 내 학원 통계:
     a) 분야별 학원 수 (도넛 차트 - recharts)
     b) 분야별 비율 vs 해당 시도 평균 비교 (바 차트)
     c) 평균 수강료 (공개 데이터 있는 경우)
     d) 최근 1년 신규 등록/폐원 학원 수 (있으면)

3. "방과후 프로그램 제안" 섹션
   - 주변에 부족한 분야를 자동 탐지
   - 예: "이 학교 반경 2km 내 코딩/SW 학원이 2개로 적습니다.
         방과후 프로그램으로 코딩 강좌를 개설하면 수요가 있을 수 있습니다."
   - 이 부분은 Step 1-7의 AI 분석과 연결

4. API Route: src/app/api/schools/[id]/nearby/route.ts
   - PostGIS의 ST_DWithin 또는 직접 거리 계산으로
     반경 내 학원 조회 및 통계 집계
```

### Step 1-6. 지역 비교 뷰

```
시군구 단위로 사교육 현황을 비교하는 페이지를 만들어줘.

1. 페이지: src/app/compare/page.tsx
   - 드롭다운으로 시도 → 시군구 두 곳 선택
   - 나란히 비교하는 레이아웃

2. 비교 항목 (recharts 차트):
   - 총 학원 수
   - 학생 1000명당 학원 수 (학교알리미 학생수 데이터 활용 가능 시)
   - 분야별 비율 비교 (레이더 차트)
   - 평균 수강료 비교 (있는 경우)
   - 학원 밀집 상위 동 TOP5

3. API Route: src/app/api/districts/compare/route.ts
   - district_stats 테이블에서 두 지역 데이터 조회

4. 간단한 인사이트 텍스트 자동 생성
   - "송파구는 강남구 대비 입시학원 비율이 12%p 낮고,
     예능학원 비율이 8%p 높습니다."
```

### Step 1-7. AI 분석 리포트 생성

```
Claude API를 활용해 지역별 사교육 현황 AI 분석 리포트를 생성하는 기능을 만들어줘.
이 기능이 대회 심사에서 "AI 활용도" 점수의 핵심이야.

1. API Route: src/app/api/analysis/report/route.ts
   - POST 요청으로 region (시도/시군구) 받음
   - Supabase에서 해당 지역 데이터 조회:
     a) 분야별 학원 수/비율
     b) 수강료 분포 (있는 경우)
     c) 인근 학교 수 및 학생 규모 추정
     d) 해당 시도 평균 대비 비교
   - 이 데이터를 Claude API에 전달해 분석 리포트 생성
   - 생성된 리포트를 ai_reports 테이블에 캐싱 (24시간)

2. Claude API 프롬프트 설계 (src/lib/prompts.ts):

```typescript
export const REGION_ANALYSIS_PROMPT = `
당신은 교육 데이터 분석 전문가입니다.
아래 지역의 학원 현황 데이터를 분석하여 교사와 학부모를 위한 인사이트 리포트를 작성해주세요.

## 분석 대상 지역
{region_name}

## 데이터
{data_json}

## 리포트 작성 지침
1. **사교육 현황 요약**: 해당 지역의 학원 분포 특성을 3-4문장으로 요약
2. **분야별 분석**: 각 분야(입시, 예능, 체육 등)의 비율을 시도 평균과 비교 분석
3. **학교 관점 제안**: 방과후 프로그램 기획 시 참고할 수 있는 제안 3가지
   - 주변에 부족한 분야의 방과후 프로그램 개설 제안
   - 과밀 분야의 경우 차별화 전략 제안
4. **학부모 관점 정보**: 이 지역에서 학원을 선택할 때 참고할 만한 정보
5. **데이터 한계 안내**: 공개된 데이터 기준이며 실제와 차이가 있을 수 있음을 명시

JSON 형식으로 응답해주세요:
{
  "summary": "...",
  "realm_analysis": [
    { "realm": "입시·검정 및 보습", "ratio": 0.45, "avg_ratio": 0.38, "insight": "..." }
  ],
  "school_suggestions": ["...", "...", "..."],
  "parent_info": "...",
  "data_note": "..."
}
`;
```

3. AI 리포트 표시 컴포넌트: src/components/AIReport.tsx
   - 로딩 중 스켈레톤 UI
   - 리포트 내용을 카드 형태로 보기 좋게 렌더링
   - "AI가 분석한 리포트입니다" 안내 배지
   - 학교 대시보드와 지역 비교 페이지 모두에서 사용

4. 대회 제출 시 중요:
   - AI 분석 과정(프롬프트, 모델, 데이터 전처리)을 기획서에 명시해야 함
   - 어떤 데이터를 AI에 넣었고 어떤 결과가 나왔는지 투명하게 기술
```

### Step 1-8. 반응형 UI 및 디자인 마무리

```
전체 서비스의 UI/UX를 마무리해줘. 모바일에서도 잘 보여야 해.

1. 레이아웃 구조:
   - 데스크톱: 전체화면 지도 + 좌측 필터 + 우측 사이드패널
   - 모바일: 지도 전체화면 + 하단 시트(bottom sheet)로 정보 표시

2. 디자인 시스템 (src/styles/):
   - 컬러 팔레트: 
     Primary: #2563EB (파란색 계열 - 신뢰감)
     Secondary: #10B981 (초록 - 교육)
     Accent: #F59E0B (노랑 - 강조)
     Background: #F8FAFC
   - 분야별 색상:
     입시·보습: #3B82F6
     예능: #8B5CF6
     체육: #10B981
     외국어: #F59E0B
     국제화: #EC4899
     직업기술: #6366F1
     기타: #6B7280

3. 랜딩 섹션 (지도 위 첫 화면):
   - "학원노노" 로고 + 한 줄 소개
   - "나이스 교육 공공데이터로 우리 동네 학원을 한눈에"
   - 검색바: 학교명 또는 지역명 검색
   - 검색하면 해당 위치로 지도 이동

4. 하단 정보 바:
   - "교육 공공데이터 활용 | 나이스 교육정보 개방포털 | 제8회 교육 공공데이터 AI활용대회 출품작"
   - 데이터 출처 및 라이선스 명시 (대회 필수 요건)

5. SEO 및 메타태그 설정
```

### Step 1-9. 데이터 시각화 강화

```
대회 기획서 캡처용으로 인상적인 데이터 시각화를 추가해줘.

1. 전국 사교육 현황 대시보드 페이지: src/app/dashboard/page.tsx
   - 전국 학원 총 수 (큰 숫자 카드)
   - 시도별 학원 수 바 차트
   - 분야별 전국 비율 도넛 차트
   - 학원 밀집도 TOP10 시군구
   - 월별 신규 등록/폐원 추이 (데이터 있으면)

2. recharts 기반 차트 컴포넌트들:
   - src/components/charts/RealmPieChart.tsx
   - src/components/charts/RegionBarChart.tsx
   - src/components/charts/TrendLineChart.tsx

3. 차트는 반응형이고, 호버 시 툴팁 표시.
   색상은 분야별 지정 색상 사용.
```

---

## Phase 1 보조: 대회 기획서 제작 지원

### Step 1-10. 기획서 데이터 추출

```
대회 기획서(PPT/PDF) 작성에 필요한 핵심 데이터를 추출하는 스크립트를 만들어줘.
scripts/extract_stats.py 경로에.

추출할 데이터:
1. 전국 학원 총 수
2. 시도별 학원 수 TOP5
3. 분야별 학원 비율 (전국)
4. 수강료 공개율 및 평균 수강료
5. 학원 밀집도 최고/최저 지역
6. 서울 송파구(덕수고 소재지) 주변 상세 통계

결과를 JSON과 마크다운 테이블 형식으로 출력해줘.
기획서에 들어갈 인포그래픽 수치로 활용할 거야.
```

---

## Phase 2 (대회 이후): 커뮤니티 기능 — 참고용 프롬프트

> 아래는 대회 이후 확장 시 사용할 프롬프트입니다.
> 대회 기획서의 "로드맵" 슬라이드에서 언급만 하면 됩니다.

### Step 2-1. 사용자 인증

```
카카오 로그인 기반 사용자 인증을 추가해줘.
Supabase Auth의 OAuth provider로 카카오를 연결.
로그인 후 사용자 프로필(닉네임, 관심 지역)을 설정할 수 있도록.
```

### Step 2-2. 학원 리뷰/평점 시스템

```
학원별 페이지에 학부모 리뷰와 평점을 남길 수 있는 기능을 만들어줘.

- 학원별 상세 페이지 (src/app/academy/[id]/page.tsx)
- 별점 (1~5), 텍스트 리뷰, 태그(수업 좋음/시설 좋음/가격 적정 등)
- AI 리뷰 요약 (Claude로 긍정/부정 키워드 추출)
- 신고 기능, 비속어 필터
```

### Step 2-3. 지역 커뮤니티 (타래)

```
호갱노노의 입주민 게시판처럼, 동 단위 학부모 커뮤니티를 만들어줘.

- 동별 게시판 (타래 형식)
- 학원 추천/비추천 스레드
- 방과후 정보 공유
- 익명/실명 선택 가능
```

---

## Phase 3 (장기): 플랫폼화 — 참고용 프롬프트

### Step 3-1. 학원 매니저 대시보드

```
학원 운영자가 직접 자기 학원 정보를 수정/보완할 수 있는 대시보드를 만들어줘.

- 학원 인증 (사업자등록번호 확인)
- 상세 정보 입력: 사진, 커리큘럼, 강사 소개, 수강료
- 학부모 리뷰 응답 기능
- 조회수/관심 통계
```

### Step 3-2. 프리미엄 프로필 및 광고

```
학원 프리미엄 프로필과 지역 타겟팅 광고 시스템을 설계해줘.

- 무료: 기본 공공데이터 정보만 표시
- 프리미엄: 사진, 상세 커리큘럼, 강사 소개, 상단 노출
- 광고: 특정 동/지역 학부모에게 배너 노출
- 결제: 토스페이먼츠 연동
```

---

## 배포 및 운영

### Deploy 프롬프트

```
이 프로젝트를 Vercel에 배포할 수 있도록 설정해줘.

1. vercel.json 설정
2. 환경 변수 목록 정리 (Vercel에 설정할 것들)
3. Supabase 연결 확인
4. 카카오맵 도메인 허용 설정 안내
5. 빌드 최적화:
   - Image 최적화
   - API Route 캐싱 전략
   - 정적 페이지 ISR 설정

배포 URL을 대회 기획서에 포함할 거야.
심사위원이 직접 접속해서 사용해볼 수 있어야 해.
```

### 데이터 갱신 자동화

```
나이스 API 데이터를 주기적으로 갱신하는 cron job을 설정해줘.

1. Vercel Cron 또는 GitHub Actions로 주 1회 실행
2. scripts/collect_academies.py → geocode → load 순서로 실행
3. 변경분만 업데이트 (upsert)
4. 갱신 완료 시 district_stats 재집계
5. 실행 로그를 Supabase에 기록
```
