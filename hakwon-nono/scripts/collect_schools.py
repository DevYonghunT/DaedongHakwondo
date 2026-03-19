#!/usr/bin/env python3
"""
학원노노 - 학교 데이터 수집 및 지오코딩 스크립트
NEIS Open API에서 전국 17개 교육청의 학교 기본 정보를 수집하고,
Kakao Local API를 사용하여 좌표를 추가합니다.
"""

import json
import os
import sys
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

# 프로젝트 루트 기준 .env.local 로드
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env.local")

# API 설정
NEIS_API_KEY = os.getenv("NEIS_API_KEY")
KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY")

NEIS_API_ENDPOINT = "https://open.neis.go.kr/hub/schoolInfo"
KAKAO_GEOCODE_URL = "https://dapi.kakao.com/v2/local/search/address.json"

# 데이터 경로
DATA_DIR = PROJECT_ROOT / "data"
RAW_OUTPUT_FILE = DATA_DIR / "schools_raw.jsonl"
GEOCODED_OUTPUT_FILE = DATA_DIR / "schools_geocoded.jsonl"

# 전국 17개 교육청 코드
EDUCATION_OFFICES = {
    "B10": "서울특별시교육청",
    "C10": "부산광역시교육청",
    "D10": "대구광역시교육청",
    "E10": "인천광역시교육청",
    "F10": "광주광역시교육청",
    "G10": "대전광역시교육청",
    "H10": "울산광역시교육청",
    "I10": "세종특별자치시교육청",
    "J10": "경기도교육청",
    "K10": "강원특별자치도교육청",
    "L10": "충청북도교육청",
    "M10": "충청남도교육청",
    "N10": "전북특별자치도교육청",
    "O10": "전라남도교육청",
    "P10": "경상북도교육청",
    "Q10": "경상남도교육청",
    "R10": "제주특별자치도교육청",
}

# 추출할 필드 목록
FIELDS_TO_EXTRACT = [
    "ATPT_OFCDC_SC_CODE",  # 교육청코드
    "SD_SCHUL_CODE",       # 학교코드
    "SCHUL_NM",            # 학교명
    "SCHUL_KND_SC_NM",     # 학교종류명 (초등학교, 중학교, 고등학교 등)
    "ORG_RDNMA",           # 도로명주소
    "COEDU_SC_NM",         # 남녀공학구분
    "FOND_SC_NM",          # 설립구분 (공립, 사립 등)
    "HS_SC_NM",            # 고등학교구분 (일반고, 특목고, 특성화고 등)
]

# 설정값
MAX_RETRIES = 3
SLEEP_INTERVAL = 0.5
PAGE_SIZE = 1000
GEOCODE_RATE_INTERVAL = 0.1  # 초당 10건


def get_collected_offices() -> set:
    """이미 수집 완료된 교육청 코드를 반환합니다."""
    collected = set()
    if not RAW_OUTPUT_FILE.exists():
        return collected

    with open(RAW_OUTPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            try:
                record = json.loads(line.strip())
                code = record.get("ATPT_OFCDC_SC_CODE")
                if code:
                    collected.add(code)
            except json.JSONDecodeError:
                continue

    return collected


def fetch_page(office_code: str, page_index: int) -> dict:
    """NEIS API에서 한 페이지의 학교 데이터를 가져옵니다."""
    params = {
        "KEY": NEIS_API_KEY,
        "Type": "json",
        "pIndex": page_index,
        "pSize": PAGE_SIZE,
        "ATPT_OFCDC_SC_CODE": office_code,
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = requests.get(NEIS_API_ENDPOINT, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"  [오류] 시도 {attempt}/{MAX_RETRIES} - {office_code} 페이지 {page_index}: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(2 * attempt)
            else:
                raise


def extract_fields(record: dict) -> dict:
    """레코드에서 필요한 필드만 추출합니다."""
    return {field: record.get(field, "") for field in FIELDS_TO_EXTRACT}


def collect_office_schools(office_code: str, office_name: str, output_file) -> int:
    """하나의 교육청에 대한 전체 학교 데이터를 수집합니다."""
    page_index = 1
    total_count = 0

    while True:
        try:
            data = fetch_page(office_code, page_index)
        except Exception as e:
            print(f"  [실패] {office_name}({office_code}) 페이지 {page_index} 수집 실패: {e}")
            break

        # NEIS API 응답 구조 확인
        if "schoolInfo" not in data:
            if "RESULT" in data:
                result_code = data["RESULT"].get("CODE", "")
                if result_code == "INFO-200":
                    break  # 더 이상 데이터 없음
                else:
                    print(f"  [오류] API 응답: {data['RESULT'].get('MESSAGE', '알 수 없는 오류')}")
                    break
            break

        try:
            head_info = data["schoolInfo"][0]["head"]
            rows = data["schoolInfo"][1]["row"]
        except (IndexError, KeyError) as e:
            print(f"  [오류] 응답 파싱 실패 (페이지 {page_index}): {e}")
            break

        # 전체 건수 확인 (첫 페이지에서만)
        if page_index == 1:
            for item in head_info:
                if "list_total_count" in item:
                    total_expected = item["list_total_count"]
                    print(f"  전체 {total_expected}건 예상")
                    break

        # 데이터 저장
        for record in rows:
            extracted = extract_fields(record)
            output_file.write(json.dumps(extracted, ensure_ascii=False) + "\n")
            total_count += 1

        # 다음 페이지
        if len(rows) < PAGE_SIZE:
            break

        page_index += 1
        time.sleep(SLEEP_INTERVAL)

    return total_count


def geocode_address(address: str) -> dict | None:
    """Kakao Local API를 사용하여 주소를 지오코딩합니다."""
    if not address or not address.strip():
        return None

    headers = {
        "Authorization": f"KakaoAK {KAKAO_REST_API_KEY}",
    }
    params = {
        "query": address,
    }

    try:
        response = requests.get(KAKAO_GEOCODE_URL, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        documents = data.get("documents", [])
        if not documents:
            return None

        doc = documents[0]
        return {
            "latitude": float(doc.get("y", 0)),
            "longitude": float(doc.get("x", 0)),
        }

    except requests.exceptions.RequestException as e:
        print(f"  [API 오류] {address}: {e}")
        return None
    except (ValueError, KeyError) as e:
        print(f"  [파싱 오류] {address}: {e}")
        return None


def load_geocoded_keys() -> set:
    """이미 지오코딩 완료된 학교의 키(학교코드+교육청코드)를 반환합니다."""
    keys = set()
    if not GEOCODED_OUTPUT_FILE.exists():
        return keys

    with open(GEOCODED_OUTPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            try:
                record = json.loads(line.strip())
                key = f"{record.get('ATPT_OFCDC_SC_CODE', '')}_{record.get('SD_SCHUL_CODE', '')}"
                keys.add(key)
            except json.JSONDecodeError:
                continue

    return keys


def geocode_schools():
    """수집된 학교 데이터에 좌표를 추가합니다."""
    if not KAKAO_REST_API_KEY:
        print("[경고] KAKAO_REST_API_KEY가 설정되지 않았습니다. 지오코딩을 건너뜁니다.")
        return

    if not RAW_OUTPUT_FILE.exists():
        print("[오류] 학교 원본 데이터가 없습니다.")
        return

    # 이미 처리된 레코드 확인
    geocoded_keys = load_geocoded_keys()
    if geocoded_keys:
        print(f"[이어하기] 이미 지오코딩 완료: {len(geocoded_keys)}건")

    # 원본 데이터 로드
    records = []
    with open(RAW_OUTPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            try:
                records.append(json.loads(line.strip()))
            except json.JSONDecodeError:
                continue

    total = len(records)
    print(f"\n===== 학교 주소 지오코딩 시작 =====")
    print(f"전체 레코드: {total}건\n")

    success_count = len(geocoded_keys)
    fail_count = 0
    skip_count = 0

    with open(GEOCODED_OUTPUT_FILE, "a", encoding="utf-8") as out_f:
        for idx, record in enumerate(records, 1):
            key = f"{record.get('ATPT_OFCDC_SC_CODE', '')}_{record.get('SD_SCHUL_CODE', '')}"

            # 이미 처리된 레코드 건너뛰기
            if key in geocoded_keys:
                skip_count += 1
                continue

            address = (record.get("ORG_RDNMA") or "").strip()

            if not address:
                # 주소 없으면 좌표 없이 저장
                geocoded_record = {**record, "latitude": None, "longitude": None}
                out_f.write(json.dumps(geocoded_record, ensure_ascii=False) + "\n")
                fail_count += 1
                continue

            result = geocode_address(address)

            if result:
                geocoded_record = {**record, **result}
                out_f.write(json.dumps(geocoded_record, ensure_ascii=False) + "\n")
                success_count += 1
            else:
                geocoded_record = {**record, "latitude": None, "longitude": None}
                out_f.write(json.dumps(geocoded_record, ensure_ascii=False) + "\n")
                fail_count += 1

            # 진행 상황 출력 (500건마다)
            processed = success_count + fail_count
            if processed % 500 == 0:
                print(f"  진행: {processed}/{total} (성공: {success_count}, 실패: {fail_count})")
                out_f.flush()

            time.sleep(GEOCODE_RATE_INTERVAL)

    # 결과 출력
    total_processed = success_count + fail_count
    success_rate = (success_count / total_processed * 100) if total_processed > 0 else 0
    print(f"\n===== 학교 지오코딩 완료 =====")
    print(f"성공: {success_count}건, 실패: {fail_count}건")
    print(f"성공률: {success_rate:.1f}%")
    print(f"결과 파일: {GEOCODED_OUTPUT_FILE}")


def main():
    """메인 실행 함수"""
    # API 키 확인
    if not NEIS_API_KEY:
        print("[오류] NEIS_API_KEY가 설정되지 않았습니다.")
        print("프로젝트 루트의 .env.local 파일에 NEIS_API_KEY를 설정해주세요.")
        sys.exit(1)

    # 데이터 디렉토리 생성
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # === 1단계: 학교 데이터 수집 ===
    collected_offices = get_collected_offices()
    if collected_offices:
        print(f"[이어하기] 이미 수집 완료된 교육청: {len(collected_offices)}개")

    print("\n===== 학교 데이터 수집 시작 =====\n")
    grand_total = 0

    with open(RAW_OUTPUT_FILE, "a", encoding="utf-8") as f:
        for office_code, office_name in EDUCATION_OFFICES.items():
            if office_code in collected_offices:
                print(f"[건너뛰기] {office_name}({office_code}) - 이미 수집 완료")
                continue

            print(f"[수집 중] {office_name}({office_code})")
            count = collect_office_schools(office_code, office_name, f)
            f.flush()
            grand_total += count
            print(f"  => {count}건 수집 완료\n")

    # 수집 요약
    print("===== 수집 완료 =====")
    print(f"신규 수집: {grand_total}건")
    print(f"저장 위치: {RAW_OUTPUT_FILE}")

    if RAW_OUTPUT_FILE.exists():
        with open(RAW_OUTPUT_FILE, "r", encoding="utf-8") as f:
            total_lines = sum(1 for _ in f)
        print(f"파일 전체 레코드 수: {total_lines}건")

    # === 2단계: 지오코딩 ===
    geocode_schools()


if __name__ == "__main__":
    main()
