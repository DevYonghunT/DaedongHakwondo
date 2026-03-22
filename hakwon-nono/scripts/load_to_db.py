#!/usr/bin/env python3
"""
대동학원도 - 데이터베이스 적재 스크립트
지오코딩된 학원/학교 데이터를 PostgreSQL(Prisma 스키마)에 적재하고,
지역별 통계를 집계합니다.
"""

import json
import os
import re
import sys
import uuid
from typing import Optional
from pathlib import Path

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# 프로젝트 루트 기준 .env.local 로드
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env.local")

# 데이터베이스 설정 (Prisma용 ?schema= 파라미터 제거)
DATABASE_URL = os.getenv("DATABASE_URL", "")
DATABASE_URL = re.sub(r"\?schema=\w+", "", DATABASE_URL)

# 데이터 경로
DATA_DIR = PROJECT_ROOT / "data"
ACADEMIES_FILE = DATA_DIR / "academies_geocoded.jsonl"
SCHOOLS_FILE = DATA_DIR / "schools_geocoded.jsonl"

# 배치 크기
BATCH_SIZE = 1000


def parse_address(address: str) -> dict:
    """도로명주소에서 시도, 시군구를 파싱합니다."""
    result = {"sido": "", "sigungu": ""}
    if not address:
        return result
    parts = address.strip().split()
    if len(parts) >= 1:
        result["sido"] = parts[0]
    if len(parts) >= 2:
        result["sigungu"] = parts[1]
    return result


def parse_tuition(tuition_str: str) -> Optional[int]:
    """수강료 문자열에서 숫자를 추출합니다."""
    if not tuition_str:
        return None
    numbers = re.findall(r"[\d,]+", tuition_str)
    if numbers:
        try:
            return int(float(numbers[0].replace(",", "")))
        except ValueError:
            return None
    return None


def parse_capacity(tuition_str: str) -> Optional[int]:
    """수강료 내용에서 정원 정보를 추출합니다."""
    if not tuition_str:
        return None
    match = re.search(r"(\d+)\s*명", tuition_str)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return None
    return None


def load_academies(cursor) -> int:
    """학원 데이터를 Prisma 스키마 기준으로 적재합니다."""
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

    # 학원지정번호+교육청코드 기준 중복 제거 (마지막 레코드 유지)
    seen = {}
    for record in records:
        key = (record.get("ACA_ASNUM", ""), record.get("ATPT_OFCDC_SC_CODE", ""))
        seen[key] = record
    records = list(seen.values())

    total = len(records)
    loaded = 0

    for batch_start in range(0, total, BATCH_SIZE):
        batch = records[batch_start:batch_start + BATCH_SIZE]
        values = []

        for record in batch:
            address = record.get("FA_RDNMA", "")
            address_detail = record.get("FA_RDNDA", "")
            full_address = f"{address} {address_detail}".strip()
            tuition_str = record.get("PSNBY_THCC_CNTNT", "")

            values.append((
                str(uuid.uuid4()),                                # id
                record.get("ATPT_OFCDC_SC_CODE", ""),             # atpt_ofcdc_sc_code
                record.get("ATPT_OFCDC_SC_NM", ""),               # atpt_ofcdc_sc_nm
                record.get("ACA_ASNUM", ""),                      # aca_asnum
                record.get("ACA_NM", ""),                         # academy_nm
                record.get("ACA_INSTI_SC_NM", ""),                # academy_type
                record.get("REALM_SC_NM", ""),                    # realm_sc_nm
                record.get("LE_ORD_NM", ""),                      # le_ord_nm
                record.get("LE_CRSE_NM", ""),                     # le_crse_nm
                record.get("LE_CRSE_LIST_NM", ""),                # le_subject_nm
                parse_capacity(tuition_str),                      # capacity
                parse_tuition(tuition_str),                       # tuition_fee
                full_address or None,                             # address
                record.get("latitude"),                           # latitude
                record.get("longitude"),                          # longitude
                record.get("REG_STTUS_NM", ""),                  # reg_status
                record.get("ESTBL_YMD", "") or None,              # established_date
                record.get("CAA_END_YMD", "") or None,            # closed_date
                json.dumps(record, ensure_ascii=False),           # raw_data
            ))

        sql = """
            INSERT INTO academies (
                id, atpt_ofcdc_sc_code, atpt_ofcdc_sc_nm, aca_asnum,
                academy_nm, academy_type, realm_sc_nm, le_ord_nm,
                le_crse_nm, le_subject_nm, capacity, tuition_fee,
                address, latitude, longitude, reg_status,
                established_date, closed_date, raw_data
            ) VALUES %s
            ON CONFLICT (aca_asnum, atpt_ofcdc_sc_code) DO UPDATE SET
                atpt_ofcdc_sc_nm = EXCLUDED.atpt_ofcdc_sc_nm,
                academy_nm = EXCLUDED.academy_nm,
                academy_type = EXCLUDED.academy_type,
                realm_sc_nm = EXCLUDED.realm_sc_nm,
                le_ord_nm = EXCLUDED.le_ord_nm,
                le_crse_nm = EXCLUDED.le_crse_nm,
                le_subject_nm = EXCLUDED.le_subject_nm,
                capacity = EXCLUDED.capacity,
                tuition_fee = EXCLUDED.tuition_fee,
                address = EXCLUDED.address,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                reg_status = EXCLUDED.reg_status,
                established_date = EXCLUDED.established_date,
                closed_date = EXCLUDED.closed_date,
                raw_data = EXCLUDED.raw_data,
                updated_at = NOW()
        """

        execute_values(cursor, sql, values)
        loaded += len(batch)

        if loaded % 10000 == 0 or loaded == total:
            print(f"  진행: {loaded}/{total}건")

    return loaded


def load_schools(cursor) -> int:
    """학교 데이터를 Prisma 스키마 기준으로 적재합니다."""
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

    # 학교코드+교육청코드 기준 중복 제거
    seen = {}
    for record in records:
        key = (record.get("SD_SCHUL_CODE", ""), record.get("ATPT_OFCDC_SC_CODE", ""))
        seen[key] = record
    records = list(seen.values())

    total = len(records)
    loaded = 0

    for batch_start in range(0, total, BATCH_SIZE):
        batch = records[batch_start:batch_start + BATCH_SIZE]
        values = []

        for record in batch:
            values.append((
                str(uuid.uuid4()),                                # id
                record.get("ATPT_OFCDC_SC_CODE", ""),             # atpt_ofcdc_sc_code
                record.get("SD_SCHUL_CODE", ""),                  # sd_schul_code
                record.get("SCHUL_NM", ""),                       # school_nm
                record.get("SCHUL_KND_SC_NM", ""),                # school_kind
                record.get("ORG_RDNMA", "") or None,              # address
                record.get("latitude"),                           # latitude
                record.get("longitude"),                          # longitude
                record.get("COEDU_SC_NM", "") or None,            # coedu_sc_nm
                record.get("FOND_SC_NM", "") or None,             # fond_sc_nm
                record.get("HS_SC_NM", "") or None,               # hs_sc_nm
            ))

        sql = """
            INSERT INTO schools (
                id, atpt_ofcdc_sc_code, sd_schul_code, school_nm,
                school_kind, address, latitude, longitude,
                coedu_sc_nm, fond_sc_nm, hs_sc_nm
            ) VALUES %s
            ON CONFLICT (sd_schul_code, atpt_ofcdc_sc_code) DO UPDATE SET
                school_nm = EXCLUDED.school_nm,
                school_kind = EXCLUDED.school_kind,
                address = EXCLUDED.address,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                coedu_sc_nm = EXCLUDED.coedu_sc_nm,
                fond_sc_nm = EXCLUDED.fond_sc_nm,
                hs_sc_nm = EXCLUDED.hs_sc_nm
        """

        execute_values(cursor, sql, values)
        loaded += len(batch)

        if loaded % 5000 == 0 or loaded == total:
            print(f"  진행: {loaded}/{total}건")

    return loaded


def aggregate_district_stats(cursor):
    """지역별 통계를 집계하여 district_stats 테이블에 적재합니다."""
    print("[집계 중] 지역별 통계...")

    # 기존 통계 초기화
    cursor.execute("DELETE FROM district_stats;")

    # 주소에서 시도/시군구 추출 후 분야별 집계
    cursor.execute("""
        INSERT INTO district_stats (id, sido, sigungu, dong, realm, academy_count, avg_tuition, total_capacity)
        SELECT
            gen_random_uuid()::text,
            COALESCE(NULLIF(SPLIT_PART(address, ' ', 1), ''), '미분류'),
            COALESCE(NULLIF(SPLIT_PART(address, ' ', 2), ''), '미분류'),
            NULL,
            COALESCE(NULLIF(realm_sc_nm, ''), '미분류'),
            COUNT(*),
            AVG(tuition_fee)::integer,
            SUM(capacity)
        FROM academies
        WHERE reg_status IS NULL OR reg_status != '폐원'
        GROUP BY SPLIT_PART(address, ' ', 1), SPLIT_PART(address, ' ', 2), realm_sc_nm
        ON CONFLICT (sido, sigungu, dong, realm) DO UPDATE SET
            academy_count = EXCLUDED.academy_count,
            avg_tuition = EXCLUDED.avg_tuition,
            total_capacity = EXCLUDED.total_capacity,
            updated_at = NOW();
    """)

    cursor.execute("SELECT COUNT(*) FROM district_stats;")
    stats_count = cursor.fetchone()[0]
    print(f"  => district_stats: {stats_count}건 집계 완료")


def print_summary(cursor):
    """테이블별 요약 정보를 출력합니다."""
    print("\n===== 데이터 적재 요약 =====\n")

    cursor.execute("SELECT COUNT(*) FROM academies;")
    academy_total = cursor.fetchone()[0]
    cursor.execute("""
        SELECT atpt_ofcdc_sc_nm, COUNT(*)
        FROM academies GROUP BY atpt_ofcdc_sc_nm ORDER BY COUNT(*) DESC;
    """)
    print(f"[학원] 전체: {academy_total}건")
    for row in cursor.fetchall():
        print(f"  - {row[0]}: {row[1]}건")

    cursor.execute("SELECT COUNT(*) FROM schools;")
    school_total = cursor.fetchone()[0]
    cursor.execute("""
        SELECT school_kind, COUNT(*)
        FROM schools GROUP BY school_kind ORDER BY COUNT(*) DESC;
    """)
    print(f"\n[학교] 전체: {school_total}건")
    for row in cursor.fetchall():
        print(f"  - {row[0]}: {row[1]}건")

    cursor.execute("SELECT COUNT(*) FROM district_stats;")
    stats_total = cursor.fetchone()[0]
    cursor.execute("""
        SELECT sido, SUM(academy_count) as total_academies
        FROM district_stats GROUP BY sido ORDER BY total_academies DESC LIMIT 10;
    """)
    print(f"\n[지역 통계] 전체: {stats_total}건")
    print("  (상위 10개 시도)")
    for row in cursor.fetchall():
        print(f"  - {row[0]}: 학원 {row[1]}건")


def main():
    if not DATABASE_URL:
        print("[오류] DATABASE_URL이 설정되지 않았습니다.")
        sys.exit(1)

    if not ACADEMIES_FILE.exists() and not SCHOOLS_FILE.exists():
        print("[오류] 적재할 데이터 파일이 없습니다.")
        sys.exit(1)

    print("===== 데이터베이스 적재 시작 =====\n")

    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False
        cursor = conn.cursor()

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
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
