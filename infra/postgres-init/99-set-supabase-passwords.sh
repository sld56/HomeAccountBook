#!/bin/bash
# supabase/postgres 이미지는 시스템 역할만 만들고 비밀번호는 비워둠.
# 이 스크립트가 모든 시스템 역할에 POSTGRES_PASSWORD를 일괄 할당.
#
# 마운트 위치: /docker-entrypoint-initdb.d/99-set-supabase-passwords.sh
# (사전 init scripts와 migrations 폴더가 다 끝난 뒤에 알파벳 순으로 실행됨)

set -e

echo "=== Supabase 시스템 역할 비밀번호 설정 ==="

for role in \
  authenticator \
  supabase_admin \
  supabase_auth_admin \
  supabase_storage_admin \
  supabase_replication_admin \
  supabase_read_only_user \
  supabase_functions_admin \
  pgbouncer
do
  if psql -v ON_ERROR_STOP=0 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
      -c "ALTER USER \"$role\" WITH PASSWORD '$POSTGRES_PASSWORD'" 2>/dev/null; then
    echo "  ✓ $role"
  else
    echo "  - skipped (역할 없음): $role"
  fi
done

echo "=== 완료 ==="
