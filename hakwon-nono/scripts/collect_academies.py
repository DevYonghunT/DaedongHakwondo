#!/usr/bin/env python3
"""
대동학원도 - 학원 데이터 수집 스크립트
NEIS(나이스) Open API에서 전국 17개 교육청의 학원 정보를 수집합니다.
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

# NEIS API 설정
NEIS_API_KEY = os.getenv("NEIS_API_KEY")
API_ENDPOINT = "https://open.neis.go.kr/hub/acaInsTiInfo"

# 데이터 저장 경로
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_FILE = DATA_DIR / "academies_raw.jsonl"

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
    "ATPT_OFCDC_SC_NM",    # 교육청명
    "ACA_INSTI_SC_NM",     # 학원/교습소 구분
    "ACA_ASNUM",           # 학원지정번호
    "ACA_NM",              # 학원명
    "REALM_SC_NM",         # 분야명 (예: 교과교습학원)
    "LE_ORD_NM",           # 교습계열명
    "LE_CRSE_NM",          # 교습과정명
    "ESTBL_YMD",           # 설립일자
    "REG_STTUS_NM",        # 등록상태명
    "CAA_BEGIN_YMD",       # 개원일자
    "CAA_END_YMD",         # 폐원일자
    "PSNBY_THCC_CNTNT",   # 인당수강료내용
    "FA_RDNMA",            # 도로명주소
    "FA_RDNDA",            # 도로명상세주소
    "LE_CRSE_LIST_NM",    # 교습과정목록명
]

# 최대 재시도 횟수
MAX_RETRIES = 3
# API 호출 간 대기 시간 (초)
SLEEP_INTERVAL = 0.5
# 페이지 크기
PAGE_SIZE = 1000


def get_collected_offices() -> set:
    """이미 수집 완료된 교육청 코드를 반환합니다 (이어하기 기능)."""
    collected = set()
    if not OUTPUT_FILE.exists():
        return collected

    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
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
    """NEIS API에서 한 페이지의 데이터를 가져옵니다. 실패 시 최대 3회 재시도합니다."""
    params = {
        "KEY": NEIS_API_KEY,
        "Type": "json",
        "pIndex": page_index,
        "pSize": PAGE_SIZE,
        "ATPT_OFCDC_SC_CODE": office_code,
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = requests.get(API_ENDPOINT, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"  [오류] 시도 {attempt}/{MAX_RETRIES} - {office_code} 페이지 {page_index}: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(2 * attempt)  # 점진적 대기
            else:
                raise


def extract_fields(record: dict) -> dict:
    """레코드에서 필요한 필드만 추출합니다."""
    return {field: record.get(field, "") for field in FIELDS_TO_EXTRACT}


def collect_office_data(office_code: str, office_name: str, output_file) -> int:
    """하나의 교육청에 대한 전체 학원 데이터를 수집합니다."""
    page_index = 1
    total_count = 0

    while True:
        try:
            data = fetch_page(office_code, page_index)
        except Exception as e:
            print(f"  [실패] {office_name}({office_code}) 페이지 {page_index} 수집 실패: {e}")
            break

        # NEIS API 응답 구조 확인
        # 성공: {"acaInsTiInfo": [{"head": [...]}, {"row": [...]}]}
        # 데이터 없음: 키가 존재하지 않거나 RESULT 코드가 INFO-200
        if "acaInsTiInfo" not in data:
            # 에러 응답 또는 데이터 없음 확인
            if "RESULT" in data:
                result_code = data["RESULT"].get("CODE", "")
                if result_code == "INFO-200":
                    # 해당 페이지에 더 이상 데이터 없음
                    break
                else:
                    print(f"  [오류] API 응답: {data['RESULT'].get('MESSAGE', '알 수 없는 오류')}")
                    break
            break

        try:
            head_info = data["acaInsTiInfo"][0]["head"]
            rows = data["acaInsTiInfo"][1]["row"]
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

        # 다음 페이지로
        if len(rows) < PAGE_SIZE:
            break

        page_index += 1
        time.sleep(SLEEP_INTERVAL)

    return total_count


def main():
    """메인 실행 함수"""
    # API 키 확인
    if not NEIS_API_KEY:
        print("[오류] NEIS_API_KEY가 설정되지 않았습니다.")
        print("프로젝트 루트의 .env.local 파일에 NEIS_API_KEY를 설정해주세요.")
        sys.exit(1)

    # 데이터 디렉토리 생성
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # 이미 수집된 교육청 확인 (이어하기)
    collected_offices = get_collected_offices()
    if collected_offices:
        print(f"[이어하기] 이미 수집 완료된 교육청: {len(collected_offices)}개")
        for code in collected_offices:
            name = EDUCATION_OFFICES.get(code, "알 수 없음")
            print(f"  - {name}({code})")

    # 수집 시작
    print("\n===== 학원 데이터 수집 시작 =====\n")
    grand_total = 0

    # 이어쓰기 모드 (기존 파일에 추가)
    with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
        for office_code, office_name in EDUCATION_OFFICES.items():
            # 이미 수집된 교육청은 건너뛰기
            if office_code in collected_offices:
                print(f"[건너뛰기] {office_name}({office_code}) - 이미 수집 완료")
                continue

            print(f"[수집 중] {office_name}({office_code})")
            count = collect_office_data(office_code, office_name, f)
            f.flush()  # 즉시 디스크에 기록
            grand_total += count
            print(f"  => {count}건 수집 완료\n")

    # 전체 요약
    print("===== 수집 완료 =====")
    print(f"신규 수집: {grand_total}건")
    print(f"저장 위치: {OUTPUT_FILE}")

    # 전체 파일의 총 레코드 수 확인
    if OUTPUT_FILE.exists():
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            total_lines = sum(1 for _ in f)
        print(f"파일 전체 레코드 수: {total_lines}건")


if __name__ == "__main__":
    main()
