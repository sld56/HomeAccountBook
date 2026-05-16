-- RLS 정책 — 보안의 핵심 방어선
-- 원칙:
-- 1. 모든 도메인 테이블 RLS ENABLE
-- 2. my_households() 헬퍼로 본인 가족 ID 집합 결정
-- 3. household_members 직접 변경은 모두 DENY (Edge Function 서비스 키만 가능)

----------------------------------------------------------------
-- 0. 헬퍼 함수
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_households()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_owner(h_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_members
    WHERE household_id = h_id
      AND user_id = auth.uid()
      AND role = 'owner'
  )
$$;

----------------------------------------------------------------
-- 1. households
----------------------------------------------------------------
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

CREATE POLICY h_select ON public.households FOR SELECT
  USING (id IN (SELECT public.my_households()));

CREATE POLICY h_insert ON public.households FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY h_update ON public.households FOR UPDATE
  USING (public.is_owner(id))
  WITH CHECK (public.is_owner(id));

CREATE POLICY h_delete ON public.households FOR DELETE
  USING (public.is_owner(id));

----------------------------------------------------------------
-- 2. household_members  — SELECT만 허용, 그 외는 Edge Function만
----------------------------------------------------------------
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY hm_select ON public.household_members FOR SELECT
  USING (household_id IN (SELECT public.my_households()));

-- INSERT/UPDATE/DELETE 정책 없음 → 일반 사용자는 차단
-- service_role(BYPASSRLS)을 가진 Edge Function만 수정 가능

----------------------------------------------------------------
-- 3. invitations — owner만 발급/취소, 토큰 hash 노출 안 됨
----------------------------------------------------------------
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- SELECT: 같은 가족 owner만 (member에게는 안 보임)
CREATE POLICY inv_select ON public.invitations FOR SELECT
  USING (public.is_owner(household_id));

-- INSERT/UPDATE/DELETE는 Edge Function만 (service_role)

----------------------------------------------------------------
-- 4. accounts
----------------------------------------------------------------
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY acc_select ON public.accounts FOR SELECT
  USING (household_id IN (SELECT public.my_households()));

CREATE POLICY acc_insert ON public.accounts FOR INSERT
  WITH CHECK (
    household_id IN (SELECT public.my_households())
    AND created_by = auth.uid()
  );

CREATE POLICY acc_update ON public.accounts FOR UPDATE
  USING (household_id IN (SELECT public.my_households()))
  WITH CHECK (household_id IN (SELECT public.my_households()));

CREATE POLICY acc_delete ON public.accounts FOR DELETE
  USING (household_id IN (SELECT public.my_households()));

----------------------------------------------------------------
-- 5. transactions
----------------------------------------------------------------
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tx_select ON public.transactions FOR SELECT
  USING (household_id IN (SELECT public.my_households()));

CREATE POLICY tx_insert ON public.transactions FOR INSERT
  WITH CHECK (
    household_id IN (SELECT public.my_households())
    AND created_by = auth.uid()
  );

CREATE POLICY tx_update ON public.transactions FOR UPDATE
  USING (household_id IN (SELECT public.my_households()))
  WITH CHECK (household_id IN (SELECT public.my_households()));

CREATE POLICY tx_delete ON public.transactions FOR DELETE
  USING (household_id IN (SELECT public.my_households()));

----------------------------------------------------------------
-- 6. budgets / goals / upcoming  (동일 패턴)
----------------------------------------------------------------
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY bg_select ON public.budgets FOR SELECT
  USING (household_id IN (SELECT public.my_households()));
CREATE POLICY bg_insert ON public.budgets FOR INSERT
  WITH CHECK (household_id IN (SELECT public.my_households()));
CREATE POLICY bg_update ON public.budgets FOR UPDATE
  USING (household_id IN (SELECT public.my_households()))
  WITH CHECK (household_id IN (SELECT public.my_households()));
CREATE POLICY bg_delete ON public.budgets FOR DELETE
  USING (household_id IN (SELECT public.my_households()));

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY gl_select ON public.goals FOR SELECT
  USING (household_id IN (SELECT public.my_households()));
CREATE POLICY gl_insert ON public.goals FOR INSERT
  WITH CHECK (household_id IN (SELECT public.my_households()));
CREATE POLICY gl_update ON public.goals FOR UPDATE
  USING (household_id IN (SELECT public.my_households()))
  WITH CHECK (household_id IN (SELECT public.my_households()));
CREATE POLICY gl_delete ON public.goals FOR DELETE
  USING (household_id IN (SELECT public.my_households()));

ALTER TABLE public.upcoming ENABLE ROW LEVEL SECURITY;
CREATE POLICY up_select ON public.upcoming FOR SELECT
  USING (household_id IN (SELECT public.my_households()));
CREATE POLICY up_insert ON public.upcoming FOR INSERT
  WITH CHECK (household_id IN (SELECT public.my_households()));
CREATE POLICY up_update ON public.upcoming FOR UPDATE
  USING (household_id IN (SELECT public.my_households()))
  WITH CHECK (household_id IN (SELECT public.my_households()));
CREATE POLICY up_delete ON public.upcoming FOR DELETE
  USING (household_id IN (SELECT public.my_households()));

----------------------------------------------------------------
-- 7. audit_log — SELECT만 허용 (본인 가족), INSERT는 Edge Function
----------------------------------------------------------------
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY al_select ON public.audit_log FOR SELECT
  USING (household_id IN (SELECT public.my_households()));

-- INSERT/UPDATE/DELETE는 service_role만 (정책 없으면 차단됨)

----------------------------------------------------------------
-- 8. 익명/비인증 사용자 차단 — 모든 정책이 auth.uid()에 의존
----------------------------------------------------------------
-- anon 역할에는 별도 권한 부여하지 않음. 인증된 사용자만 통과.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- anon은 아무것도 못함 (RLS USING/WITH CHECK가 auth.uid() IS NULL 시 false)
