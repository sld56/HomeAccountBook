-- 두 가지 치명적 결함 수정:
--
-- 1) invitations.token_hash: Uint8Array를 supabase-js가 PostgreSQL bytea로
--    못 보내고 JSON.stringify해서 {"0":178,"1":129,...} 형태로 저장됨.
--    SHA-256 비교가 절대 매칭 안 되어 모든 초대가 무한 404 invite not found.
--    해결: 컬럼 타입을 text(hex)로 변경. createInvite/acceptInvite 양쪽에서
--    hex string 사용 (Edge Function 코드 변경과 짝).
--
-- 2) Realtime publication 부재: supabase_realtime publication이 없어 어떤
--    테이블 변경도 클라이언트 구독으로 전달 안 됨. 가족 가계부의 핵심인
--    "다른 PC 변경이 즉시 보임"이 작동하지 않았음. publication 생성.

----------------------------------------------------------------
-- 1. invitations.token_hash bytea → text
----------------------------------------------------------------
-- 기존 잘못 저장된 hash들은 어차피 매칭 불가 — 미사용 초대 모두 revoke.
UPDATE public.invitations
   SET revoked_at = now()
 WHERE consumed_at IS NULL AND revoked_at IS NULL;

-- 인덱스 먼저 제거 (컬럼 타입 변경에 방해)
DROP INDEX IF EXISTS invitations_token_active_idx;

-- bytea → text. 기존 잘못 저장된 값은 인코딩해도 의미 없지만 데이터 손실 방지.
ALTER TABLE public.invitations
  ALTER COLUMN token_hash TYPE text
  USING encode(token_hash, 'hex');

-- 인덱스 재생성
CREATE INDEX invitations_token_active_idx
  ON public.invitations (token_hash)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

----------------------------------------------------------------
-- 2. Realtime publication
----------------------------------------------------------------
-- DROP IF EXISTS 후 재생성 (멱등)
DROP PUBLICATION IF EXISTS supabase_realtime;

CREATE PUBLICATION supabase_realtime FOR TABLE
  public.transactions,
  public.accounts,
  public.budgets,
  public.goals,
  public.upcoming,
  public.household_members,
  public.invitations;

-- Realtime 구독 권한 (이미 GRANT ALL이지만 명시적으로 한 번 더)
GRANT SELECT ON public.transactions TO authenticated;
GRANT SELECT ON public.accounts TO authenticated;
GRANT SELECT ON public.budgets TO authenticated;
GRANT SELECT ON public.goals TO authenticated;
GRANT SELECT ON public.upcoming TO authenticated;
GRANT SELECT ON public.household_members TO authenticated;
GRANT SELECT ON public.invitations TO authenticated;
