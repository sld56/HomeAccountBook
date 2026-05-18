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
};

const DRAFT_KEY = 'gagyebu-tx-draft';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function TransactionForm({ open, onClose, initial }: Props) {
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
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 편집 대상이 바뀌거나 새 추가 모달이 열리면 상태 초기화 (이전 값 잔존 방지)
  useEffect(() => {
    if (!open) return;
    if (initial) {
      // 편집 모드 — initial 값으로 동기화
      setKind(initial.kind);
      setAmount(String(initial.amount));
      setCat(initial.cat);
      setTitle(initial.title);
      setMemo(initial.memo ?? '');
      setMember(initial.member);
      setAccount(initial.account);
      setDate(initial.date);
      setErrors({});
      return;
    }
    // 새 추가 — 기본값으로 리셋 후 draft 복원 시도
    setKind('out');
    setAmount('');
    setCat('');
    setTitle('');
    setMemo('');
    setMember(members[0]?.id ?? '');
    setAccount(accounts[0]?.id ?? '');
    setDate(todayStr());
    setErrors({});
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setKind(d.kind ?? 'out');
        setAmount(d.amount ?? '');
        setCat(d.cat ?? '');
        setTitle(d.title ?? '');
        setMemo(d.memo ?? '');
        setMember(d.member ?? members[0]?.id ?? '');
        setAccount(d.account ?? accounts[0]?.id ?? '');
        setDate(d.date ?? todayStr());
      }
    } catch {
      /* ignore */
    }
    // members/accounts는 의존성에서 제외 — 모달 열린 동안 변하면
    // 폼이 초기화되어 입력 내용이 사라지는 부작용을 막음.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  // Draft 자동 저장
  useEffect(() => {
    if (!open || initial) return;
    const id = setTimeout(() => {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ kind, amount, cat, title, memo, member, account, date }),
      );
    }, 200);
    return () => clearTimeout(id);
  }, [open, initial, kind, amount, cat, title, memo, member, account, date]);

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
          />
        </div>

        {/* 누가 + 결제수단 */}
        <div className="grid cols-2">
          <div className="field">
            <label className="label" htmlFor="tx-member">
              누가
            </label>
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
          </div>
          <div className="field">
            <label className="label" htmlFor="tx-account">
              결제 수단
            </label>
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
