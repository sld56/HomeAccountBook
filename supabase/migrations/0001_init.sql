-- 우리집 가계부 — 초기 스키마
-- 의존 확장: pgcrypto (gen_random_uuid), citext

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

----------------------------------------------------------------
-- 1. 가족(워크스페이스) + 멤버
----------------------------------------------------------------
CREATE TABLE public.households (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT
);

CREATE TABLE public.household_members (
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('owner','member')),
  display_name text NOT NULL CHECK (length(display_name) BETWEEN 1 AND 20),
  short        text NOT NULL CHECK (length(short) BETWEEN 1 AND 2),
  color_key    text NOT NULL CHECK (color_key IN ('appa','eomma','deahyun','jiwon')),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);

CREATE INDEX household_members_user_idx ON public.household_members(user_id);

----------------------------------------------------------------
-- 2. 초대 (24h TTL, 1회용)
----------------------------------------------------------------
CREATE TABLE public.invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  invited_by    uuid NOT NULL REFERENCES auth.users(id),
  email         citext,
  token_hash    bytea NOT NULL,
  role          text NOT NULL CHECK (role IN ('owner','member')) DEFAULT 'member',
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  consumed_at   timestamptz,
  consumed_by   uuid REFERENCES auth.users(id),
  revoked_at    timestamptz,
  CHECK (expires_at <= created_at + interval '24 hours'),
  CHECK (expires_at > created_at)
);

CREATE INDEX invitations_token_active_idx
  ON public.invitations (token_hash)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;
CREATE INDEX invitations_household_idx ON public.invitations(household_id);

----------------------------------------------------------------
-- 3. 도메인 테이블 (모두 household_id 필수)
----------------------------------------------------------------

CREATE TABLE public.accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  label         text NOT NULL CHECK (length(label) BETWEEN 1 AND 30),
  type          text NOT NULL CHECK (type IN ('입출금','적금','카드','현금')),
  bank          text NOT NULL CHECK (length(bank) BETWEEN 1 AND 20),
  balance       bigint NOT NULL DEFAULT 0,
  color         text NOT NULL,
  card_limit    bigint,
  created_by    uuid NOT NULL REFERENCES auth.users(id),
  updated_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX accounts_household_idx ON public.accounts(household_id);

CREATE TABLE public.transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  date          date NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('in','out')),
  amount        bigint NOT NULL CHECK (amount > 0),
  cat           text NOT NULL CHECK (cat IN (
    'food','transport','medical','utility','leisure','shopping','edu','other',
    'salary','pension','side'
  )),
  title         text NOT NULL CHECK (length(title) BETWEEN 1 AND 40),
  memo          text CHECK (memo IS NULL OR length(memo) <= 140),
  member_id     uuid REFERENCES auth.users(id),
  account_id    uuid REFERENCES public.accounts(id),
  created_by    uuid NOT NULL REFERENCES auth.users(id),
  updated_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_household_date_idx ON public.transactions(household_id, date DESC);
CREATE INDEX transactions_household_member_idx ON public.transactions(household_id, member_id);
CREATE INDEX transactions_household_cat_idx ON public.transactions(household_id, cat);

CREATE TABLE public.budgets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  cat           text NOT NULL,
  budget_limit  bigint NOT NULL CHECK (budget_limit >= 0),
  ym            text CHECK (ym IS NULL OR ym ~ '^\d{4}-\d{2}$'),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, cat, ym)
);

CREATE TABLE public.goals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title         text NOT NULL CHECK (length(title) BETWEEN 1 AND 30),
  saved         bigint NOT NULL DEFAULT 0 CHECK (saved >= 0),
  target        bigint NOT NULL CHECK (target > 0),
  monthly       bigint NOT NULL DEFAULT 0 CHECK (monthly >= 0),
  color         text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX goals_household_idx ON public.goals(household_id);

CREATE TABLE public.upcoming (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  label         text NOT NULL CHECK (length(label) BETWEEN 1 AND 30),
  due_date      date NOT NULL,
  amount        bigint NOT NULL CHECK (amount > 0),
  cat           text NOT NULL,
  autopay       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX upcoming_household_idx ON public.upcoming(household_id);

----------------------------------------------------------------
-- 4. 감사 로그 (append-only)
----------------------------------------------------------------
CREATE TABLE public.audit_log (
  id            bigserial PRIMARY KEY,
  household_id  uuid REFERENCES public.households(id) ON DELETE SET NULL,
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action        text NOT NULL,
  target_table  text,
  target_id     text,
  diff          jsonb,
  ip_hash       bytea,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_household_time_idx ON public.audit_log(household_id, created_at DESC);

----------------------------------------------------------------
-- 5. 트리거 — updated_at 자동 갱신
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

CREATE TRIGGER trg_accounts_touch BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_transactions_touch BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_budgets_touch BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_goals_touch BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
