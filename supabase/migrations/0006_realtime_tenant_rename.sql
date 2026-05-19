-- Realtime v2 multi-tenant: SEED_SELF_HOST=true가 만든 default tenant의 external_id는
-- 'realtime-dev'인데, supabase-js 클라이언트는 'realtime'을 보냄 → TenantNotFound 403.
-- FK 순환을 피하기 위해 새 row를 추가하고 old를 정리하는 방식으로 rename.

BEGIN;

-- 1) 새 tenant 추가 (id는 새로, 나머지는 기존 값 복사)
INSERT INTO _realtime.tenants (
  id, name, external_id, jwt_secret, jwt_jwks, postgres_cdc_default,
  max_concurrent_users, max_events_per_second, max_bytes_per_second,
  max_channels_per_client, max_joins_per_second, suspend,
  notify_private_alpha, inserted_at, updated_at
)
SELECT gen_random_uuid(), 'realtime', 'realtime', jwt_secret, jwt_jwks,
       postgres_cdc_default, max_concurrent_users, max_events_per_second,
       max_bytes_per_second, max_channels_per_client, max_joins_per_second,
       suspend, notify_private_alpha, now(), now()
  FROM _realtime.tenants
 WHERE external_id = 'realtime-dev'
   AND NOT EXISTS (SELECT 1 FROM _realtime.tenants WHERE external_id = 'realtime');

-- 2) 새 extensions 추가 (postgres_cdc_rls 등 tenant 설정 복사)
INSERT INTO _realtime.extensions (id, type, settings, tenant_external_id, inserted_at, updated_at)
SELECT gen_random_uuid(), type, settings, 'realtime', now(), now()
  FROM _realtime.extensions
 WHERE tenant_external_id = 'realtime-dev'
   AND NOT EXISTS (
     SELECT 1 FROM _realtime.extensions e2
      WHERE e2.tenant_external_id = 'realtime' AND e2.type = _realtime.extensions.type
   );

-- 3) old extensions, tenant 삭제 (FK 순서)
DELETE FROM _realtime.extensions WHERE tenant_external_id = 'realtime-dev';
DELETE FROM _realtime.tenants WHERE external_id = 'realtime-dev';

COMMIT;
