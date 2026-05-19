-- 가족 초대 토큰의 만료 시간을 24시간 → 7일로 연장.
-- 사용자 보고: "초대 링크 보내고 미니 PC 껐다가 키면 만료됨"
-- 가족이 휴가/주말 등으로 며칠 후 메일을 봐도 합류 가능하도록.
-- 4인 가족 사적 사용이라 보안 위험 미미 (토큰은 여전히 1회용 + hash 저장).

ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_check;

ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_check
  CHECK (expires_at <= created_at + interval '7 days');
