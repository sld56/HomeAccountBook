-- budgets UNIQUE 제약을 NULLS NOT DISTINCT로 변경
-- 기존: UNIQUE (household_id, cat, ym) — PostgreSQL 기본 NULLS DISTINCT라
--       ym=NULL인 두 행이 충돌하지 않아 같은 카테고리 범용 예산이 중복으로
--       들어가는 버그. onConflict 절도 매칭 실패해 매번 새 row 생성.
-- 변경: NULLS NOT DISTINCT (PostgreSQL 15+) — ym=NULL 두 행을 동일 키로 취급.

-- 1) 기존 중복 정리 (id 기준 가장 오래된 행만 보존, 나머지 삭제)
DELETE FROM public.budgets a
USING public.budgets b
WHERE a.id > b.id
  AND a.household_id = b.household_id
  AND a.cat = b.cat
  AND a.ym IS NOT DISTINCT FROM b.ym;

-- 2) 기존 제약 제거 후 NULLS NOT DISTINCT로 재생성
ALTER TABLE public.budgets
  DROP CONSTRAINT IF EXISTS budgets_household_id_cat_ym_key;

ALTER TABLE public.budgets
  ADD CONSTRAINT budgets_household_id_cat_ym_key
  UNIQUE NULLS NOT DISTINCT (household_id, cat, ym);
