import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Tile } from '@/components/ui/Tile';
import {
  CATEGORIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '@/data/categories';
import { useAccounts } from '@/stores/accountStore';
import { useMembers } from '@/stores/memberStore';
import { useTransactions } from '@/stores/transactionStore';
import { transactionSchema } from './TransactionSchema';
import type { Transaction, TransactionKind, CategoryId } from '@/types/domain';

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: Transaction;
  /** 새 거래 추가 시 사용할 기본 날짜 (YYYY-MM-DD). 미지정 시 오늘. */
  defaultDate?: string;
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DRAFT_KEY = 'gagyebu-tx-draft';

type Draft = {
  kind: TransactionKind;
  amount: string;
  cat: CategoryId | '';
  title: string;
  memo: string;
  member: string;
  account: string;
  date: string;
};

function readDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    // 빈 draft (모든 필드 기본값)는 의미 없음 — null 취급
    if (!d || (!d.amount && !d.title && !d.cat && !d.memo)) return null;
    return d as Draft;
  } catch {
    return null;
  }
}

export function TransactionForm({ open, onClose, initial, defaultDate }: Props) {
  const members = useMembers((s) => s.members);
  const add = useTransactions((s) => s.add);
  const update = useTransactions((s) => s.update);
  const remove = useTransactions((s) => s.remove);

  const accounts = useAccounts((s) => s.accounts);
  const [kind, setKind] = useState<TransactionKind>(initial?.kind ?? 'out');
  const [amount, setAmount] = useState<string>(initial ? String(initial.amount) : '');
  const [cat, setCat] = useState<CategoryId | ''>(initial?.cat ?? '');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [member, setMember] = useState(initial?.member ?? members[0]?.id ?? '');
  const [account, setAccount] = useState(initial?.account ?? accounts[0]?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? todayStr());
  const [errors, setErrors] = useState<Record<string, string>>({});
  // 새 추가 모드에서 모달이 열리는 순간 draft 존재 여부 스냅샷.
  // 자동 복원하지 않고 사용자가 "이어쓰기" 클릭해야 적용 → 혼란 방지.
  const [pendingDraft, setPendingDraft] = useState<Draft | null>(null);

  // 모달이 열리거나 편집 대상이 바뀔 때마다 상태 초기화. 깨끗한 폼으로 시작하되,
  // 새 추가 모드에서 직전에 작성하다 만 draft가 있으면 헤더 배너로 알림.
  useEffect(() => {
    if (!open) return;
    if (initial) {
      // 편집 모드 — initial 값으로 동기화, draft는 무시
      setKind(initial.kind);
      setAmount(String(initial.amount));
      setCat(initial.cat);
      setTitle(initial.title);
      setMemo(initial.memo ?? '');
      setMember(initial.member);
      setAccount(initial.account);
      setDate(initial.date);
      setPendingDraft(null);
    } else {
      // 새 추가 — 기본값으로 시작. draft가 있으면 배너로만 알림 (자동 복원 X).
      setKind('out');
      setAmount('');
      setCat('');
      setTitle('');
      setMemo('');
      setMember(members[0]?.id ?? '');
      setAccount(accounts[0]?.id ?? '');
      setDate(defaultDate ?? todayStr());
      setPendingDraft(readDraft());
    }
    setErrors({});
    // members/accounts는 의존성에서 제외 — 모달 열린 동안 가족/계좌
    // sync로 바뀌어도 입력 중인 폼이 초기화되지 않도록.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, defaultDate]);

  // 새 추가 모드일 때 입력값을 200ms debounce로 sessionStorage에 저장 — 실수로
  // 닫혀도 다음 진입 시 "이어쓰기" 배너로 복원 가능.
  useEffect(() => {
    if (!open || initial) return;
    const id = setTimeout(() => {
      try {
        sessionStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ kind, amount, cat, title, memo, member, account, date }),
        );
      } catch {
        /* 일부 사파리 시크릿 모드는 sessionStorage write 거부 — 무시 */
      }
    }, 200);
    return () => clearTimeout(id);
  }, [open, initial, kind, amount, cat, title, memo, member, account, date]);

  const restoreDraft = () => {
    const d = pendingDraft;
    if (!d) return;
    setKind(d.kind);
    setAmount(d.amount);
    setCat(d.cat);
    setTitle(d.title);
    setMemo(d.memo);
    if (d.member) setMember(d.member);
    if (d.account) setAccount(d.account);
    if (d.date) setDate(d.date);
    setPendingDraft(null);
  };

  const dismissDraft = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    setPendingDraft(null);
  };

  const [busy, setBusy] = useState(false);

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  const handleSave = async () => {
    const cleanAmount = Number(String(amount).replace(/[^0-9]/g, ''));
    const payload = { kind, amount: cleanAmount, cat, title, memo, member, account, date };
    const result = transactionSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const k = String(issue.path[0] ?? '');
        if (!fieldErrors[k]) fieldErrors[k] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setBusy(true);
    try {
      if (initial) {
        await update(initial.id, result.data as Partial<Transaction>);
      } else {
        await add(result.data as Omit<Transaction, 'id'>);
        // 저장 성공한 새 거래의 draft는 정리
        sessionStorage.removeItem(DRAFT_KEY);
      }
      handleClose();
    } catch (e) {
      setErrors({ submit: e instanceof Error ? e.message : '저장 실패' });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!initial) return;
    if (!confirm('이 거래를 삭제하시겠습니까?')) return;
    setBusy(true);
    try {
      await remove(initial.id);
      handleClose();
    } catch (e) {
      setErrors({ submit: e instanceof Error ? e.message : '삭제 실패' });
    } finally {
      setBusy(false);
    }
  };

  const cats = kind === 'in' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const formatAmount = (v: string) => {
    const num = v.replace(/[^0-9]/g, '');
    return num ? Number(num).toLocaleString('ko-KR') : '';
  };

  return (
    <Modal open={open} onClose={handleClose} title={initial ? '거래 수정' : '새 거래 입력'}>
      <div className="stack">
        {pendingDraft && !initial && (
          <div
            className="between"
            style={{
              padding: '10px 14px',
              background: 'var(--amber-soft)',
              border: '1px solid var(--amber)',
              borderRadius: 12,
              fontSize: 'var(--fs-sm)',
            }}
          >
            <span>
              📝 지난 작성 내역이 있어요
              {pendingDraft.title && (
                <strong style={{ marginLeft: 6 }}>"{pendingDraft.title}"</strong>
              )}
            </span>
            <div className="row" style={{ gap: 6 }}>
              <Button variant="ghost" size="sm" type="button" onClick={dismissDraft}>
                지우기
              </Button>
              <Button variant="primary" size="sm" type="button" onClick={restoreDraft}>
                이어쓰기
              </Button>
            </div>
          </div>
        )}
        {/* 종류 토글 */}
        <div role="radiogroup" aria-label="거래 종류" className="row" style={{ gap: 8 }}>
          <Button
            variant={kind === 'out' ? 'primary' : 'default'}
            onClick={() => {
              setKind('out');
              if (cat && !EXPENSE_CATEGORIES.includes(cat as CategoryId)) setCat('');
            }}
            type="button"
            aria-pressed={kind === 'out'}
          >
            지출
          </Button>
          <Button
            variant={kind === 'in' ? 'primary' : 'default'}
            onClick={() => {
              setKind('in');
              if (cat && !INCOME_CATEGORIES.includes(cat as CategoryId)) setCat('');
            }}
            type="button"
            aria-pressed={kind === 'in'}
          >
            수입
          </Button>
        </div>

        {/* 금액 */}
        <div className="field">
          <label className="label" htmlFor="tx-amount">
            금액
          </label>
          <input
            id="tx-amount"
            className="input num"
            inputMode="numeric"
            value={formatAmount(amount)}
            onChange={(e) => setAmount(e.target.value)}
            style={{ fontSize: 24, textAlign: 'right', fontWeight: 700 }}
            placeholder="0"
            autoFocus
          />
          {errors.amount && <div style={{ color: 'var(--coral-2)', fontSize: 13, marginTop: 4 }}>{errors.amount}</div>}
        </div>

        {/* 카테고리 */}
        <div className="field">
          <label className="label">카테고리</label>
          <div className="grid cols-4">
            {cats.map((cid) => {
              const c = CATEGORIES[cid];
              return (
                <Tile
                  key={cid}
                  emoji={c.emoji}
                  label={c.label}
                  color={c.color}
                  selected={cat === cid}
                  onClick={() => setCat(cid)}
                />
              );
            })}
          </div>
          {errors.cat && <div style={{ color: 'var(--coral-2)', fontSize: 13, marginTop: 4 }}>{errors.cat}</div>}
        </div>

        {/* 제목 */}
        <div className="field">
          <label className="label" htmlFor="tx-title">
            제목
          </label>
          <input
            id="tx-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="어디서 / 무엇"
            maxLength={40}
          />
          {errors.title && <div style={{ color: 'var(--coral-2)', fontSize: 13, marginTop: 4 }}>{errors.title}</div>}
        </div>

        {/* 메모 */}
        <div className="field">
          <label className="label" htmlFor="tx-memo">
            메모 (선택)
          </label>
          <input
            id="tx-memo"
            className="input"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="비고"
            maxLength={140}
          />
          {errors.memo && (
            <div style={{ color: 'var(--coral-2)', fontSize: 13, marginTop: 4 }}>{errors.memo}</div>
          )}
        </div>

        {/* 누가 + 결제수단 */}
        <div className="grid cols-2">
          <div className="field">
            <label className="label" htmlFor="tx-member">
              누가
            </label>
            {members.length === 0 ? (
              <div className="meta" style={{ color: 'var(--coral-2)' }}>
                가족 구성원이 없어요. 설정에서 먼저 추가해주세요.
              </div>
            ) : (
              <select
                id="tx-member"
                className="select"
                value={member}
                onChange={(e) => setMember(e.target.value)}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
            {errors.member && (
              <div style={{ color: 'var(--coral-2)', fontSize: 13, marginTop: 4 }}>{errors.member}</div>
            )}
          </div>
          <div className="field">
            <label className="label" htmlFor="tx-account">
              결제 수단
            </label>
            {accounts.length === 0 ? (
              <div className="meta" style={{ color: 'var(--coral-2)' }}>
                계좌가 없어요. 설정에서 먼저 추가해주세요.
              </div>
            ) : (
              <select
                id="tx-account"
                className="select"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            )}
            {errors.account && (
              <div style={{ color: 'var(--coral-2)', fontSize: 13, marginTop: 4 }}>{errors.account}</div>
            )}
          </div>
        </div>

        {/* 날짜 */}
        <div className="field">
          <label className="label" htmlFor="tx-date">
            날짜
          </label>
          <input
            id="tx-date"
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {errors.date && (
            <div style={{ color: 'var(--coral-2)', fontSize: 13, marginTop: 4 }}>{errors.date}</div>
          )}
        </div>

        {errors.submit && (
          <div className="auth-error" style={{ marginTop: 4 }}>{errors.submit}</div>
        )}

        {/* 액션 */}
        <div className="between" style={{ marginTop: 8 }}>
          {initial ? (
            <Button variant="ghost" onClick={handleDelete} type="button" disabled={busy}>
              삭제
            </Button>
          ) : (
            <span />
          )}
          <div className="row" style={{ gap: 8 }}>
            <Button variant="default" onClick={handleClose} type="button" disabled={busy}>
              취소
            </Button>
            <Button variant="primary" onClick={handleSave} type="button" disabled={busy}>
              {busy ? '저장 중…' : '저장'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
