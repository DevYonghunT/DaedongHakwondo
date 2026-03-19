#!/usr/bin/env python3
"""
학원노노 - 데이터베이스 적재 스크립트
지오코딩된 학원/학교 데이터를 PostgreSQL에 적재하고,
지역별 통계를 집계합니다.
"""

import json
import os
import re
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# 프로젝트 루트 기준 .env.local 로드
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env.local")

# 데이터베이스 설정
DATABASE_URL = os.getenv("DATABASE_URL")

# 데이터 경로
DATA_DIR = PROJECT_ROOT / "data"
ACADEMIES_FILE = DATA_DIR / "academies_geocoded.jsonl"
SCHOOLS_FILE = DATA_DIR / "schools_geocoded.jsonl"

# 배치 크기
BATCH_SIZE = 1000


def create_tables(cursor):
    """필요한 테이블을 생성합니다 (없는 경우에만)."""

    # 학원 테이블
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS academies (
            id SERIAL PRIMARY KEY,
            atpt_ofcdc_sc_code VARCHAR(10) NOT NULL,       -- 교육청코드
            atpt_ofcdc_sc_nm VARCHAR(50),                   -- 교육청명
            aca_insti_sc_nm VARCHAR(50),                    -- 학원/교습소 구분
            aca_asnum VARCHAR(20) NOT NULL,                 -- 학원지정번호
            aca_nm VARCHAR(200),                            -- 학원명
            realm_sc_nm VARCHAR(50),                        -- 분야명
            le_ord_nm VARCHAR(50),                          -- 교습계열명
            le_crse_nm VARCHAR(100),                        -- 교습과정명
            estbl_ymd VARCHAR(10),                          -- 설립일자
            reg_sttus_nm VARCHAR(20),                       -- 등록상태명
            caa_begin_ymd VARCHAR(10),                      -- 개원일자
            caa_end_ymd VARCHAR(10),                        -- 폐원일자
            psnby_thcc_cntnt TEXT,                          -- 인당수강료내용
            fa_rdnma VARCHAR(200),                          -- 도로명주소
            fa_rdnda VARCHAR(200),                          -- 도로명상세주소
            le_crse_list_nm TEXT,                           -- 교습과정목록명
            latitude DOUBLE PRECISION,                      -- 위도
            longitude DOUBLE PRECISION,                     -- 경도
            sido VARCHAR(50),                               -- 시도
            sigungu VARCHAR(50),                            -- 시군구
            dong VARCHAR(50),                               -- 읍면동
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(aca_asnum, atpt_ofcdc_sc_code)
        );
    """)

    # 학교 테이블
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schools (
            id SERIAL PRIMARY KEY,
            atpt_ofcdc_sc_code VARCHAR(10) NOT NULL,       -- 교육청코드
            sd_schul_code VARCHAR(20) NOT NULL,             -- 학교코드
            schul_nm VARCHAR(100),                          -- 학교명
            schul_knd_sc_nm VARCHAR(20),                    -- 학교종류명
            org_rdnma VARCHAR(200),                         -- 도로명주소
            coedu_sc_nm VARCHAR(20),                        -- 남녀공학구분
            fond_sc_nm VARCHAR(20),                         -- 설립구분
            hs_sc_nm VARCHAR(50),                           -- 고등학교구분
            latitude DOUBLE PRECISION,                      -- 위도
            longitude DOUBLE PRECISION,                     -- 경도
            sido VARCHAR(50),                               -- 시도
            sigungu VARCHAR(50),                            -- 시군구
            dong VARCHAR(50),                               -- 읍면동
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(sd_schul_code, atpt_ofcdc_sc_code)
        );
    """)

    # 지역별 통계 테이블
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS district_stats (
            id SERIAL PRIMARY KEY,
            sido VARCHAR(50) NOT NULL,                     -- 시도
            sigungu VARCHAR(50),                            -- 시군구
            dong VARCHAR(50),                               -- 읍면동
            realm_sc_nm VARCHAR(50),                        -- 학원 분야명
            academy_count INTEGER DEFAULT 0,                -- 학원 수
            avg_tuition NUMERIC(12, 2),                     -- 평균 수강료
            total_capacity INTEGER DEFAULT 0,               -- 총 정원
            school_count INTEGER DEFAULT 0,                 -- 학교 수
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(sido, sigungu, dong, realm_sc_nm)
        );
    """)

    # 인덱스 생성
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_academies_region
        ON academies(sido, sigungu, dong);
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_academies_realm
        ON academies(realm_sc_nm);
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_academies_location
        ON academies(latitude, longitude);
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_schools_region
        ON schools(sido, sigungu, dong);
    """)
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_schools_location
        ON schools(latitude, longitude);
    """)


def parse_address(address: str) -> dict:
    """
    도로명주소에서 시도, 시군구, 읍면동을 파싱합니다.
    예: "서울특별시 강남구 테헤란로 123" -> {"sido": "서울특별시", "sigungu": "강남구", "dong": ""}
    """
    result = {"sido": "", "sigungu": "", "dong": ""}

    if not address:
        return result

    parts = address.strip().split()
    if len(parts) >= 1:
        result["sido"] = parts[0]
    if len(parts) >= 2:
        result["sigungu"] = parts[1]
    if len(parts) >= 3:
        # 읍/면/동/가/로 등을 판별
        third = parts[2]
        # 읍면동이 아닌 도로명인 경우도 있으므로 패턴 확인
        if re.search(r"(읍|면|동|가|리)$", third):
            result["dong"] = third

    return result


def parse_tuition(tuition_str: str) -> float | None:
    """수강료 문자열에서 숫자를 추출합니다."""
    if not tuition_str:
        return None

    # 숫자만 추출 (쉼표 제거)
    numbers = re.findall(r"[\d,]+", tuition_str)
    if numbers:
        try:
            return float(numbers[0].replace(",", ""))
        except ValueError:
            return None
    return None


def parse_capacity(tuition_str: str) -> int | None:
    """수강료 내용에서 정원 정보를 추출합니다."""
    if not tuition_str:
        return None

    # "정원" 뒤의 숫자를 찾음
    match = re.search(r"(\d+)\s*명", tuition_str)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return None
    return None


def load_academies(cursor) -> int:
    """학원 데이터를 PostgreSQL에 적재합니다."""
    if not ACADEMIES_FILE.exists():
        print(f"[경고] 학원 데이터 파일이 없습니다: {ACADEMIES_FILE}")
        return 0

    print("[적재 중] 학원 데이터...")

    records = []
    with open(ACADEMIES_FILE, "r", encoding="utf-8") as f:
        for line in f:
            try:
                records.append(json.loads(line.strip()))
            except json.JSONDecodeError:
                continue

    total = len(records)
    loaded = 0

    # 배치 단위로 UPSERT
    for batch_start in range(0, total, BATCH_SIZE):
        batch = records[batch_start:batch_start + BATCH_SIZE]
        values = []

        for record in batch:
            # 주소에서 시도/시군구/동 파싱
            full_address = f"{record.get('FA_RDNMA', '')} {record.get('FA_RDNDA', '')}".strip()
            address_parts = parse_address(record.get("FA_RDNMA", ""))

            values.append((
                record.get("ATPT_OFCDC_SC_CODE", ""),
                record.get("ATPT_OFCDC_SC_NM", ""),
                record.get("ACA_INSTI_SC_NM", ""),
                record.get("ACA_ASNUM", ""),
                record.get("ACA_NM", ""),
                record.get("REALM_SC_NM", ""),
                record.get("LE_ORD_NM", ""),
                record.get("LE_CRSE_NM", ""),
                record.get("ESTBL_YMD", ""),
                record.get("REG_STTUS_NM", ""),
                record.get("CAA_BEGIN_YMD", ""),
                record.get("CAA_END_YMD", ""),
                record.get("PSNBY_THCC_CNTNT", ""),
                record.get("FA_RDNMA", ""),
                record.get("FA_RDNDA", ""),
                record.get("LE_CRSE_LIST_NM", ""),
                record.get("latitude"),
                record.get("longitude"),
                address_parts["sido"],
                address_parts["sigungu"],
                address_parts["dong"],
            ))

        # UPSERT: 학원지정번호 + 교육청코드 기준
        sql = """
            INSERT INTO academies (
                atpt_ofcdc_sc_code, atpt_ofcdc_sc_nm, aca_insti_sc_nm,
                aca_asnum, aca_nm, realm_sc_nm, le_ord_nm, le_crse_nm,
                estbl_ymd, reg_sttus_nm, caa_begin_ymd, caa_end_ymd,
                psnby_thcc_cntnt, fa_rdnma, fa_rdnda, le_crse_list_nm,
                latitude, longitude, sido, sigungu, dong
            ) VALUES %s
            ON CONFLICT (aca_asnum, atpt_ofcdc_sc_code) DO UPDATE SET
                atpt_ofcdc_sc_nm = EXCLUDED.atpt_ofcdc_sc_nm,
                aca_insti_sc_nm = EXCLUDED.aca_insti_sc_nm,
                aca_nm = EXCLUDED.aca_nm,
                realm_sc_nm = EXCLUDED.realm_sc_nm,
                le_ord_nm = EXCLUDED.le_ord_nm,
                le_crse_nm = EXCLUDED.le_crse_nm,
                estbl_ymd = EXCLUDED.estbl_ymd,
                reg_sttus_nm = EXCLUDED.reg_sttus_nm,
                caa_begin_ymd = EXCLUDED.caa_begin_ymd,
                caa_end_ymd = EXCLUDED.caa_end_ymd,
                psnby_thcc_cntnt = EXCLUDED.psnby_thcc_cntnt,
                fa_rdnma = EXCLUDED.fa_rdnma,
                fa_rdnda = EXCLUDED.fa_rdnda,
                le_crse_list_nm = EXCLUDED.le_crse_list_nm,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                sido = EXCLUDED.sido,
                sigungu = EXCLUDED.sigungu,
                dong = EXCLUDED.dong,
                updated_at = NOW()
        """

        execute_values(cursor, sql, values)
        loaded += len(batch)

        if loaded % 5000 == 0 or loaded == total:
            print(f"  진행: {loaded}/{total}건")

    return loaded


def load_schools(cursor) -> int:
    """학교 데이터를 PostgreSQL에 적재합니다."""
    if not SCHOOLS_FILE.exists():
        print(f"[경고] 학교 데이터 파일이 없습니다: {SCHOOLS_FILE}")
        return 0

    print("[적재 중] 학교 데이터...")

    records = []
    with open(SCHOOLS_FILE, "r", encoding="utf-8") as f:
        for line in f:
            try:
                records.append(json.loads(line.strip()))
            except json.JSONDecodeError:
                continue

    total = len(records)
    loaded = 0

    for batch_start in range(0, total, BATCH_SIZE):
        batch = records[batch_start:batch_start + BATCH_SIZE]
        values = []

        for record in batch:
            address_parts = parse_address(record.get("ORG_RDNMA", ""))

            values.append((
                record.get("ATPT_OFCDC_SC_CODE", ""),
                record.get("SD_SCHUL_CODE", ""),
                record.get("SCHUL_NM", ""),
                record.get("SCHUL_KND_SC_NM", ""),
                record.get("ORG_RDNMA", ""),
                record.get("COEDU_SC_NM", ""),
                record.get("FOND_SC_NM", ""),
                record.get("HS_SC_NM", ""),
                record.get("latitude"),
                record.get("longitude"),
                address_parts["sido"],
                address_parts["sigungu"],
                address_parts["dong"],
            ))

        # UPSERT: 학교코드 + 교육청코드 기준
        sql = """
            INSERT INTO schools (
                atpt_ofcdc_sc_code, sd_schul_code, schul_nm,
                schul_knd_sc_nm, org_rdnma, coedu_sc_nm,
                fond_sc_nm, hs_sc_nm,
                latitude, longitude, sido, sigungu, dong
            ) VALUES %s
            ON CONFLICT (sd_schul_code, atpt_ofcdc_sc_code) DO UPDATE SET
                schul_nm = EXCLUDED.schul_nm,
                schul_knd_sc_nm = EXCLUDED.schul_knd_sc_nm,
                org_rdnma = EXCLUDED.org_rdnma,
                coedu_sc_nm = EXCLUDED.coedu_sc_nm,
                fond_sc_nm = EXCLUDED.fond_sc_nm,
                hs_sc_nm = EXCLUDED.hs_sc_nm,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                sido = EXCLUDED.sido,
                sigungu = EXCLUDED.sigungu,
                dong = EXCLUDED.dong,
                updated_at = NOW()
        """

        execute_values(cursor, sql, values)
        loaded += len(batch)

        if loaded % 5000 == 0 or loaded == total:
            print(f"  진행: {loaded}/{total}건")

    return loaded


def aggregate_district_stats(cursor):
    """
    지역별 통계를 집계하여 district_stats 테이블에 적재합니다.
    - 시도/시군구/동 기준으로 학원 분야별 학원 수, 평균 수강료, 총 정원 계산
    - 학교 수 별도 집계
    """
    print("[집계 중] 지역별 통계...")

    # 기존 통계 초기화
    cursor.execute("DELETE FROM district_stats;")

    # 학원 통계 집계
    # PSNBY_THCC_CNTNT 에서 수강료를 파싱하는 것은 복잡하므로,
    # 데이터베이스 레벨에서 가능한 범위 내에서 집계
    cursor.execute("""
        INSERT INTO district_stats (sido, sigungu, dong, realm_sc_nm, academy_count, school_count)
        SELECT
            COALESCE(NULLIF(sido, ''), '미분류') as sido,
            COALESCE(NULLIF(sigungu, ''), '미분류') as sigungu,
            COALESCE(NULLIF(dong, ''), '미분류') as dong,
            COALESCE(NULLIF(realm_sc_nm, ''), '미분류') as realm_sc_nm,
            COUNT(*) as academy_count,
            0 as school_count
        FROM academies
        WHERE reg_sttus_nm != '폐원' OR reg_sttus_nm IS NULL
        GROUP BY sido, sigungu, dong, realm_sc_nm
        ON CONFLICT (sido, sigungu, dong, realm_sc_nm) DO UPDATE SET
            academy_count = EXCLUDED.academy_count,
            updated_at = NOW();
    """)

    # 학교 수 업데이트 (시도/시군구/동 기준, realm_sc_nm은 '미분류'로 통합)
    cursor.execute("""
        WITH school_counts AS (
            SELECT
                COALESCE(NULLIF(sido, ''), '미분류') as sido,
                COALESCE(NULLIF(sigungu, ''), '미분류') as sigungu,
                COALESCE(NULLIF(dong, ''), '미분류') as dong,
                COUNT(*) as cnt
            FROM schools
            GROUP BY sido, sigungu, dong
        )
        UPDATE district_stats ds
        SET
            school_count = sc.cnt,
            updated_at = NOW()
        FROM school_counts sc
        WHERE ds.sido = sc.sido
          AND ds.sigungu = sc.sigungu
          AND ds.dong = sc.dong;
    """)

    # 수강료 평균 업데이트 (숫자 추출 가능한 범위에서)
    # PostgreSQL에서 정규식으로 수강료 숫자 추출 시도
    cursor.execute("""
        WITH tuition_stats AS (
            SELECT
                COALESCE(NULLIF(sido, ''), '미분류') as sido,
                COALESCE(NULLIF(sigungu, ''), '미분류') as sigungu,
                COALESCE(NULLIF(dong, ''), '미분류') as dong,
                COALESCE(NULLIF(realm_sc_nm, ''), '미분류') as realm_sc_nm,
                AVG(
                    CASE
                        WHEN psnby_thcc_cntnt ~ '\\d'
                        THEN NULLIF(REGEXP_REPLACE(
                            SUBSTRING(psnby_thcc_cntnt FROM '([0-9,]+)'),
                            ',', '', 'g'
                        ), '')::NUMERIC
                        ELSE NULL
                    END
                ) as avg_tuition
            FROM academies
            WHERE reg_sttus_nm != '폐원' OR reg_sttus_nm IS NULL
            GROUP BY sido, sigungu, dong, realm_sc_nm
        )
        UPDATE district_stats ds
        SET
            avg_tuition = ts.avg_tuition,
            updated_at = NOW()
        FROM tuition_stats ts
        WHERE ds.sido = ts.sido
          AND ds.sigungu = ts.sigungu
          AND ds.dong = ts.dong
          AND ds.realm_sc_nm = ts.realm_sc_nm
          AND ts.avg_tuition IS NOT NULL;
    """)

    # 통계 건수 확인
    cursor.execute("SELECT COUNT(*) FROM district_stats;")
    stats_count = cursor.fetchone()[0]
    print(f"  => district_stats: {stats_count}건 집계 완료")


def print_summary(cursor):
    """테이블별 요약 정보를 출력합니다."""
    print("\n===== 데이터 적재 요약 =====\n")

    # 학원 통계
    cursor.execute("SELECT COUNT(*) FROM academies;")
    academy_total = cursor.fetchone()[0]

    cursor.execute("""
        SELECT atpt_ofcdc_sc_nm, COUNT(*)
        FROM academies
        GROUP BY atpt_ofcdc_sc_nm
        ORDER BY COUNT(*) DESC;
    """)
    print(f"[학원] 전체: {academy_total}건")
    for row in cursor.fetchall():
        print(f"  - {row[0]}: {row[1]}건")

    # 학교 통계
    cursor.execute("SELECT COUNT(*) FROM schools;")
    school_total = cursor.fetchone()[0]

    cursor.execute("""
        SELECT schul_knd_sc_nm, COUNT(*)
        FROM schools
        GROUP BY schul_knd_sc_nm
        ORDER BY COUNT(*) DESC;
    """)
    print(f"\n[학교] 전체: {school_total}건")
    for row in cursor.fetchall():
        print(f"  - {row[0]}: {row[1]}건")

    # 지역 통계
    cursor.execute("SELECT COUNT(*) FROM district_stats;")
    stats_total = cursor.fetchone()[0]

    cursor.execute("""
        SELECT sido, SUM(academy_count) as total_academies, MAX(school_count) as total_schools
        FROM district_stats
        GROUP BY sido
        ORDER BY total_academies DESC
        LIMIT 10;
    """)
    print(f"\n[지역 통계] 전체: {stats_total}건")
    print("  (상위 10개 시도)")
    for row in cursor.fetchall():
        print(f"  - {row[0]}: 학원 {row[1]}건, 학교 {row[2]}건")


def main():
    """메인 실행 함수"""
    # DB 연결 정보 확인
    if not DATABASE_URL:
        print("[오류] DATABASE_URL이 설정되지 않았습니다.")
        print("프로젝트 루트의 .env.local 파일에 DATABASE_URL을 설정해주세요.")
        print("예: DATABASE_URL=postgresql://user:password@localhost:5432/hakwon_nono")
        sys.exit(1)

    # 데이터 파일 존재 확인
    if not ACADEMIES_FILE.exists() and not SCHOOLS_FILE.exists():
        print("[오류] 적재할 데이터 파일이 없습니다.")
        print("먼저 collect_academies.py, geocode_academies.py, collect_schools.py를 실행해주세요.")
        sys.exit(1)

    print("===== 데이터베이스 적재 시작 =====\n")

    try:
        # PostgreSQL 연결
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False
        cursor = conn.cursor()

        # 테이블 생성
        print("[준비] 테이블 생성/확인...")
        create_tables(cursor)
        conn.commit()

        # 학원 데이터 적재
        academy_count = load_academies(cursor)
        conn.commit()
        print(f"  => 학원 {academy_count}건 적재 완료\n")

        # 학교 데이터 적재
        school_count = load_schools(cursor)
        conn.commit()
        print(f"  => 학교 {school_count}건 적재 완료\n")

        # 지역별 통계 집계
        aggregate_district_stats(cursor)
        conn.commit()

        # 요약 출력
        print_summary(cursor)

        cursor.close()
        conn.close()

        print("\n===== 데이터베이스 적재 완료 =====")

    except psycopg2.Error as e:
        print(f"\n[DB 오류] {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[오류] {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
