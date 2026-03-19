# 학원노노 (HakwonNono)

## 프로젝트 개요
"호갱노노"처럼 교육 공공데이터를 지도 위에 시각화하는 웹서비스.
나이스 학원교습소 API 데이터를 활용해 지역별 학원 분포를 보여주고,
AI 분석으로 사교육 현황 인사이트를 제공한다.

## 기술 스택
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Map: Kakao Map SDK
- Backend: Next.js API Routes
- DB: PostgreSQL 15 (Docker, PostGIS)
- ORM: Prisma
- AI: Claude API (Anthropic)
- Charts: Recharts
- Deploy: Vercel (프론트) + Mac Mini (DB)

## 주요 데이터 소스
- 나이스 교육정보 개방포털 Open API (open.neis.go.kr)
  - 학원교습소정보 API
  - 학교기본정보 API
- 학교알리미 공개용데이터 (schoolinfo.go.kr)
- 카카오맵 Geocoding API

## 환경 변수
- DATABASE_URL: PostgreSQL 연결 문자열
- NEIS_API_KEY: 나이스 Open API 인증키
- NEXT_PUBLIC_KAKAO_JS_APP_KEY: 카카오 JavaScript 앱 키
- KAKAO_REST_API_KEY: 카카오 REST API 키
- ANTHROPIC_API_KEY: Claude API 키

## 코딩 컨벤션
- 한국어 주석 사용
- API 응답은 TypeScript 인터페이스로 타입 정의
- 에러 핸들링은 try-catch + 사용자 친화적 메시지
- 컴포넌트는 함수형 + hooks 패턴
