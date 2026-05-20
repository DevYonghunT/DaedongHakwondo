# 대동학원도 2.0: 우리 학교 주변 배움지도

교육 공공데이터를 사용해 가까운 학원, 학원비 부담, 오가는 길, 무료 배움터 빈틈을 학교·동네 단위로 편안하게 보여주는 Next.js MVP입니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 열면 서비스가 동작합니다.

## 데이터

- 현재 화면은 `src/lib/generated-dump-data.ts`가 있으면 기존 대동학원도 덤프에서 추출한 공공 학교·학원 데이터를 우선 사용하고, 없을 때만 `src/lib/sample-data.ts`의 검증용 샘플 데이터를 사용합니다.
- 기존 덤프를 다시 반영하려면 `npm run import:dump`를 실행합니다. 기본 경로는 `/Users/kim-yonghun/Development/DaedongHakwondo/hakwon-nono/setup/hakwonnono.dump`이며, 다른 파일은 `HAKWONNONO_DUMP=/path/to/file.dump npm run import:dump`로 지정합니다.
- 실제 NEIS 수집은 `NEIS_API_KEY`를 `.env.local`에 넣고 `npm run collect:neis`를 실행합니다.
- 운영 DB는 `docker compose up -d`로 PostGIS를 띄우고 `db/schema.sql`을 적용합니다.

## 주요 API

- `GET /api/map/safety-net`
- `GET /api/schools/:id/safety-net`
- `GET /api/academies/:id/trust-card`
- `POST /api/parent-plan`
- `POST /api/policy-simulations`
- `POST /api/ai/report`
- `GET /api/data-quality`

## 설계 원칙

- 학원 품질, 합격률, 리뷰는 공공데이터에 없으므로 평가하지 않습니다.
- 정확한 집주소는 저장하지 않고, 클라이언트 입력 좌표는 250m 격자로 둔화할 수 있게 설계합니다.
- AI 리포트는 근거 지표와 데이터 한계를 함께 반환합니다.
