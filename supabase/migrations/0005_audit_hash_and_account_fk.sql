-- 1) audit_log.ip_hash: token_hash와 동일한 bytea + Uint8Array 직렬화 버그
--    Edge Function이 매 요청마다 ip_hash를 Uint8Array로 보내 JSON으로
--    직렬화되어 저장 → 감사 로그가 silently 깨짐. text(hex)로 변경.
ALTER TABLE public.audit_log
  ALTER COLUMN ip_hash TYPE text
  USING CASE WHEN ip_hash IS NULL THEN NULL ELSE encode(ip_hash, 'hex') END;

-- 2) transactions.account_id 가 ON DELETE 절 없음 (default NO ACTION)
--    → 거래가 있는 계좌 삭제 시 FK 제약 위반으로 silently 실패.
--    "거래 기록은 남습니다" 정책에 맞게 SET NULL로 변경.
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_account_id_fkey;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- 3) transactions.member_id 도 동일 — 멤버 삭제 시 거래 기록 보존
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_member_id_fkey;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES auth.users(id) ON DELETE SET NULL;
