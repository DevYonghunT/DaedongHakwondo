#!/bin/bash
set -e

echo "========================================="
echo "  대동학원도 - 맥미니 개발환경 셋업"
echo "========================================="

# 프로젝트 루트 확인
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"
echo "[1/6] 프로젝트 디렉토리: $PROJECT_DIR"

# Node.js 의존성 설치
echo "[2/6] npm 의존성 설치..."
npm install --legacy-peer-deps

# PostgreSQL 설치 확인 및 설치
echo "[3/6] PostgreSQL 확인..."
if ! command -v psql &> /dev/null; then
    echo "  PostgreSQL 미설치. Homebrew로 설치합니다..."
    brew install postgresql@17
    brew services start postgresql@17
    sleep 3
else
    echo "  PostgreSQL 이미 설치됨: $(psql --version)"
    # 서비스 실행 확인
    brew services list | grep postgresql || brew services start postgresql@17
fi

# PostGIS 설치
echo "[4/6] PostGIS 확인..."
if ! brew list postgis &> /dev/null 2>&1; then
    echo "  PostGIS 설치 중..."
    brew install postgis
else
    echo "  PostGIS 이미 설치됨"
fi

# DB 생성 및 복원
echo "[5/6] 데이터베이스 설정..."
DB_NAME="hakwonnono"
DB_USER="hakwonnono"

# 사용자 생성 (이미 존재하면 무시)
psql -U $(whoami) -d postgres -c "CREATE ROLE $DB_USER WITH LOGIN;" 2>/dev/null || echo "  역할 '$DB_USER' 이미 존재"

# DB 생성 (이미 존재하면 무시)
createdb -U $(whoami) "$DB_NAME" -O "$DB_USER" 2>/dev/null || echo "  DB '$DB_NAME' 이미 존재"

# PostGIS 확장 설치
psql -U $(whoami) -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS postgis;" 2>/dev/null

# DB 덤프 복원
DUMP_FILE="$SCRIPT_DIR/hakwonnono.dump"
if [ -f "$DUMP_FILE" ]; then
    echo "  DB 덤프 복원 중... ($DUMP_FILE)"
    pg_restore -U $(whoami) -d "$DB_NAME" --no-owner --no-privileges --clean --if-exists "$DUMP_FILE" 2>/dev/null || true
    echo "  DB 복원 완료!"
else
    echo "  ⚠️  DB 덤프 파일이 없습니다: $DUMP_FILE"
    echo "  데이터 수집 스크립트를 실행해야 합니다."
fi

# .env.local 설정
echo "[6/6] 환경변수 설정..."
ENV_BACKUP="$SCRIPT_DIR/env.local.backup"
if [ -f "$ENV_BACKUP" ] && [ ! -f "$PROJECT_DIR/.env.local" ]; then
    cp "$ENV_BACKUP" "$PROJECT_DIR/.env.local"
    echo "  .env.local 복사 완료"
else
    if [ -f "$PROJECT_DIR/.env.local" ]; then
        echo "  .env.local 이미 존재"
    else
        echo "  ⚠️  env.local.backup 파일이 없습니다. 수동으로 .env.local을 생성하세요."
    fi
fi

# Prisma 클라이언트 생성
echo "  Prisma 클라이언트 생성..."
npx prisma generate

# DB 데이터 확인
echo ""
echo "========================================="
echo "  셋업 완료! 데이터 확인:"
echo "========================================="
psql -U $(whoami) -d "$DB_NAME" -c "SELECT '학원' as 테이블, COUNT(*) as 건수 FROM academies UNION ALL SELECT '학교', COUNT(*) FROM schools;" 2>/dev/null || echo "  (DB 데이터 확인 실패)"

echo ""
echo "다음 명령어로 개발 서버를 시작하세요:"
echo "  cd $PROJECT_DIR && npm run dev"
echo ""
