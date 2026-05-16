#!/usr/bin/env bash
# 백업 파일에서 복구
# 사용법: ./restore.sh <백업파일.pgdump.age> [age-키파일]

set -euo pipefail

BACKUP_FILE="${1:?백업 파일을 지정하세요}"
AGE_KEY="${2:-$HOME/.age/backup.key}"

[[ -f "$BACKUP_FILE" ]] || { echo "파일을 찾을 수 없음: $BACKUP_FILE"; exit 1; }
[[ -f "$AGE_KEY" ]] || { echo "age 키 파일을 찾을 수 없음: $AGE_KEY"; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env}"
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"

echo "⚠️  현재 postgres 데이터를 덮어씁니다. 계속할까요? (yes/no)"
read -r CONFIRM
[[ "$CONFIRM" == "yes" ]] || { echo "취소됨"; exit 0; }

TMP_DUMP=$(mktemp --suffix=.pgdump)
trap 'rm -f "$TMP_DUMP"' EXIT

# 1. 복호화
age -d -i "$AGE_KEY" "$BACKUP_FILE" > "$TMP_DUMP"

# 2. 기존 DB drop & recreate
docker compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres \
  psql -U postgres -d postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 3. pg_restore
docker compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres \
  pg_restore -U postgres -d postgres --clean --if-exists < "$TMP_DUMP"

echo "✅ 복구 완료"
echo "📌 GoTrue 재시작 권장: docker compose restart gotrue postgrest"
