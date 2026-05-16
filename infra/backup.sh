#!/usr/bin/env bash
# 매일 03:00 cron에서 실행:  0 3 * * * /usr/local/bin/gagyebu-backup
# 1. pg_dump으로 Postgres 덤프
# 2. age로 암호화
# 3. 로컬 외장 HDD에 복사 + (선택) Backblaze B2 업로드
# 4. 보존 정책: 일별 7, 주별 4, 월별 12

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env}"
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"

: "${BACKUP_DIR:?BACKUP_DIR not set}"
: "${BACKUP_AGE_RECIPIENT:?BACKUP_AGE_RECIPIENT not set}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD not set}"

DATE=$(date +%Y%m%d-%H%M%S)
DAILY_DIR="$BACKUP_DIR/daily"
WEEKLY_DIR="$BACKUP_DIR/weekly"
MONTHLY_DIR="$BACKUP_DIR/monthly"
mkdir -p "$DAILY_DIR" "$WEEKLY_DIR" "$MONTHLY_DIR"

OUT="$DAILY_DIR/gagyebu-$DATE.pgdump.age"

echo "[$DATE] 백업 시작 → $OUT"

# 1. pg_dump → 압축 (custom format) → age 암호화
docker compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T postgres \
  pg_dump -U postgres -Fc -Z 9 postgres \
  | age -r "$BACKUP_AGE_RECIPIENT" -o "$OUT"

SIZE=$(stat -c%s "$OUT")
echo "[$DATE] 덤프 완료: $(numfmt --to=iec "$SIZE")"

# 2. 주별/월별 사본 (월요일 = 주별 / 1일 = 월별)
WEEKDAY=$(date +%u)
DAY_OF_MONTH=$(date +%d)
if [[ "$WEEKDAY" == "1" ]]; then
  cp "$OUT" "$WEEKLY_DIR/"
  echo "[$DATE] 주별 사본 저장"
fi
if [[ "$DAY_OF_MONTH" == "01" ]]; then
  cp "$OUT" "$MONTHLY_DIR/"
  echo "[$DATE] 월별 사본 저장"
fi

# 3. 보존 정책: 일별 7개, 주별 4개, 월별 12개
find "$DAILY_DIR" -name "*.pgdump.age" -mtime +7 -delete
find "$WEEKLY_DIR" -name "*.pgdump.age" -mtime +28 -delete
find "$MONTHLY_DIR" -name "*.pgdump.age" -mtime +365 -delete

# 4. (선택) Backblaze B2 업로드 — b2 CLI 설치 필요
if command -v b2 >/dev/null 2>&1 && [[ -n "${B2_BUCKET:-}" ]]; then
  if [[ "$WEEKDAY" == "1" ]]; then  # 주 1회만 업로드 (대역폭 절약)
    b2 authorize-account "${B2_KEY_ID}" "${B2_APPLICATION_KEY}" >/dev/null
    b2 file upload "${B2_BUCKET}" "$OUT" "weekly/$(basename "$OUT")" >/dev/null
    echo "[$DATE] B2 업로드 완료"
  fi
fi

echo "[$DATE] 백업 성공"
