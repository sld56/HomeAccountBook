#!/bin/bash
# /docker-entrypoint-initdb.d/init-scripts/99-set-roles-passwords.sh
#
# Supabase 이미지의 init-scripts/ 디렉토리 안에서 실행됨 (supautils protection 켜지기 전).
# 시스템 역할들이 이미 생성된 다음(00-* 스크립트가 생성), 알파벳 순으로 마지막에 실행되어
# POSTGRES_PASSWORD를 일괄 할당.

set -e

echo "=== 시스템 역할 비밀번호 설정 (init 단계) ==="

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  ALTER USER authenticator WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER USER supabase_admin WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER USER supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER USER supabase_storage_admin WITH PASSWORD '$POSTGRES_PASSWORD';
EOSQL

# 옵션: 이 이미지 버전에 따라 추가로 존재할 수 있는 역할들
for role in supabase_replication_admin supabase_read_only_user supabase_functions_admin pgbouncer; do
  psql -v ON_ERROR_STOP=0 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "ALTER USER \"$role\" WITH PASSWORD '$POSTGRES_PASSWORD'" 2>/dev/null \
    && echo "  ✓ $role" \
    || echo "  - 없음(skip): $role"
done

echo "=== 비밀번호 설정 완료 ==="
