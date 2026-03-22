#!/usr/bin/env python3
"""
대동학원도 - 학원 주소 지오코딩 스크립트
Naver Cloud Platform Geocoding API를 사용하여 학원/학교 주소를 위도/경도 좌표로 변환합니다.
"""

import json
import os
import sys
import time
from typing import Optional
import requests
from pathlib import Path
from dotenv import load_dotenv

# 프로젝트 루트 기준 .env.local 로드
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env.local")

# Naver Cloud Platform Geocoding API 설정
NAVER_CLIENT_ID = os.getenv("NAVER_CLIENT_ID")
NAVER_CLIENT_SECRET = os.getenv("NAVER_CLIENT_SECRET")
NAVER_GEOCODE_URL = "https://maps.apigw.ntruss.com/map-geocode/v2/geocode"

# 데이터 경로
DATA_DIR = PROJECT_ROOT / "data"
INPUT_FILE = DATA_DIR / "academies_raw.jsonl"
OUTPUT_FILE = DATA_DIR / "academies_geocoded.jsonl"
FAILURE_FILE = DATA_DIR / "geocode_failures.jsonl"

# 속도 제한: 초당 최대 10건
RATE_LIMIT = 10
RATE_INTERVAL = 1.0 / RATE_LIMIT  # 0.1초


def load_geocoded_keys() -> set:
    """이미 지오코딩 완료된 레코드의 키(학원지정번호+교육청코드)를 반환합니다."""
    keys = set()
    if not OUTPUT_FILE.exists():
        return keys

    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            try:
                record = json.loads(line.strip())
                key = f"{record.get('ATPT_OFCDC_SC_CODE', '')}_{record.get('ACA_ASNUM', '')}"
                keys.add(key)
            except json.JSONDecodeError:
                continue

    return keys


def load_failed_keys() -> set:
    """이미 실패로 기록된 레코드의 키를 반환합니다."""
    keys = set()
    if not FAILURE_FILE.exists():
        return keys

    with open(FAILURE_FILE, "r", encoding="utf-8") as f:
        for line in f:
            try:
                record = json.loads(line.strip())
                key = f"{record.get('ATPT_OFCDC_SC_CODE', '')}_{record.get('ACA_ASNUM', '')}"
                keys.add(key)
            except json.JSONDecodeError:
                continue

    return keys


def geocode_address(address: str) -> Optional[dict]:
    """
    Naver Cloud Platform Geocoding API를 사용하여 주소를 지오코딩합니다.
    성공 시 {"latitude": float, "longitude": float} 반환, 실패 시 None
    """
    if not address or not address.strip():
        return None

    headers = {
        "X-NCP-APIGW-API-KEY-ID": NAVER_CLIENT_ID,
        "X-NCP-APIGW-API-KEY": NAVER_CLIENT_SECRET,
    }
    params = {
        "query": address,
    }

    try:
        response = requests.get(NAVER_GEOCODE_URL, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        addresses = data.get("addresses", [])
        if not addresses:
            return None

        # 첫 번째 결과 사용
        addr = addresses[0]
        return {
            "latitude": float(addr.get("y", 0)),
            "longitude": float(addr.get("x", 0)),
        }

    except requests.exceptions.RequestException as e:
        print(f"  [API 오류] {address}: {e}")
        return None
    except (ValueError, KeyError) as e:
        print(f"  [파싱 오류] {address}: {e}")
        return None


def build_address(record: dict) -> str:
    """레코드에서 도로명주소를 조합합니다."""
    road_addr = (record.get("FA_RDNMA") or "").strip()
    road_detail = (record.get("FA_RDNDA") or "").strip()

    if road_addr and road_detail:
        return f"{road_addr} {road_detail}"
    elif road_addr:
        return road_addr
    else:
        return ""


def main():
    """메인 실행 함수"""
    # API 키 확인
    if not NAVER_CLIENT_ID or not NAVER_CLIENT_SECRET:
        print("[오류] NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 설정되지 않았습니다.")
        print("프로젝트 루트의 .env.local 파일에 NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 설정해주세요.")
        sys.exit(1)

    # 입력 파일 확인
    if not INPUT_FILE.exists():
        print(f"[오류] 입력 파일이 없습니다: {INPUT_FILE}")
        print("먼저 collect_academies.py를 실행하여 학원 데이터를 수집해주세요.")
        sys.exit(1)

    # 이미 처리된 레코드 확인 (이어하기)
    geocoded_keys = load_geocoded_keys()
    failed_keys = load_failed_keys()
    processed_keys = geocoded_keys | failed_keys

    if processed_keys:
        print(f"[이어하기] 이미 처리된 레코드: {len(geocoded_keys)}건 성공, {len(failed_keys)}건 실패")

    # 입력 데이터 로드
    records = []
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            try:
                record = json.loads(line.strip())
                records.append(record)
            except json.JSONDecodeError:
                continue

    total_records = len(records)
    print(f"\n===== 학원 주소 지오코딩 시작 =====")
    print(f"전체 레코드: {total_records}건\n")

    # 통계
    success_count = len(geocoded_keys)
    fail_count = len(failed_keys)
    skip_count = 0

    # 출력 파일 열기 (이어쓰기 모드)
    with open(OUTPUT_FILE, "a", encoding="utf-8") as out_f, \
         open(FAILURE_FILE, "a", encoding="utf-8") as fail_f:

        for idx, record in enumerate(records, 1):
            # 고유 키 생성
            key = f"{record.get('ATPT_OFCDC_SC_CODE', '')}_{record.get('ACA_ASNUM', '')}"

            # 이미 처리된 레코드 건너뛰기
            if key in processed_keys:
                skip_count += 1
                continue

            # 주소 조합
            address = build_address(record)

            if not address:
                # 주소가 없는 경우 실패로 기록
                failure_record = {**record, "failure_reason": "주소 없음"}
                fail_f.write(json.dumps(failure_record, ensure_ascii=False) + "\n")
                fail_count += 1
                continue

            # 지오코딩 실행
            result = geocode_address(address)

            if result:
                # 성공: 원본 데이터에 좌표 추가
                geocoded_record = {**record, **result}
                out_f.write(json.dumps(geocoded_record, ensure_ascii=False) + "\n")
                success_count += 1
            else:
                # 실패 기록
                failure_record = {**record, "failure_reason": "지오코딩 실패", "address_used": address}
                fail_f.write(json.dumps(failure_record, ensure_ascii=False) + "\n")
                fail_count += 1

            # 진행 상황 출력 (1000건마다)
            processed = success_count + fail_count
            if processed % 1000 == 0:
                print(f"  진행: {processed}/{total_records} (성공: {success_count}, 실패: {fail_count})")
                out_f.flush()
                fail_f.flush()

            # 속도 제한 (초당 10건)
            time.sleep(RATE_INTERVAL)

    # 최종 결과 출력
    total_processed = success_count + fail_count
    success_rate = (success_count / total_processed * 100) if total_processed > 0 else 0

    print(f"\n===== 지오코딩 완료 =====")
    print(f"전체 레코드: {total_records}건")
    print(f"건너뛴 레코드 (이미 처리됨): {skip_count}건")
    print(f"성공: {success_count}건")
    print(f"실패: {fail_count}건")
    print(f"성공률: {success_rate:.1f}%")
    print(f"결과 파일: {OUTPUT_FILE}")
    print(f"실패 파일: {FAILURE_FILE}")


if __name__ == "__main__":
    main()
