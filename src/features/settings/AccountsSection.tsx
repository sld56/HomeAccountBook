import { useEffect, useState } from 'react';
import { useAccounts } from '@/stores/accountStore';
import { useSettings } from '@/stores/settingsStore';
import { fmt } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { Account, AccountType } from '@/types/domain';

const ACCOUNT_TYPES: AccountType[] = ['입출금', '적금', '카드', '현금'];
const COLOR_PRESETS = [
  { label: '국민', value: '#f6c200' },
  { label: '신한', value: '#0046ff' },
  { label: '농협', value: '#3aa15f' },
  { label: '회색', value: '#444' },
  { label: 'Coral', value: 'var(--coral)' },
  { label: 'Sage', value: 'var(--sage)' },
];

export function AccountsSection() {
  const accounts = useAccounts((s) => s.accounts);
  const currency = useSettings((s) => s.currencyMode);
  const [editing, setEditing] = useState<Account | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <Card>
      <div className="between" style={{ marginBottom: 8 }}>
        <h3 className="section-title" style={{ margin: 0 }}>계좌 / 결제수단</h3>
        <Button variant="default" size="sm" onClick={() => setAdding(true)}>+ 추가</Button>
      </div>

      {accounts.length === 0 ? (
        <p className="meta muted">아직 등록된 계좌가 없어요. "+ 추가"로 만들어보세요.</p>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setEditing(a)}
              className="between"
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              <div className="row" style={{ gap: 12 }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: a.color, color: '#fff',
                  display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {a.bank.slice(0, 1)}
                </span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600 }}>{a.label}</div>
                  <div className="meta">{a.type}{a.limit ? ` · 한도 ${fmt.short(a.limit)}` : ''}</div>
                </div>
              </div>
              <div className="num" style={{ fontWeight: 700, color: a.balance < 0 ? 'var(--coral-2)' : 'var(--ink)' }}>
                {fmt.money(a.balance, currency)}
              </div>
            </button>
          ))}
        </div>
      )}

      <AccountEditorModal
        open={adding || editing !== null}
        editing={editing}
        onClose={() => { setAdding(false); setEditing(null); }}
      />
    </Card>
  );
}

function AccountEditorModal({
  open, onClose, editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Account | null;
}) {
  const add = useAccounts((s) => s.add);
  const update = useAccounts((s) => s.update);
  const remove = useAccounts((s) => s.remove);

  const [label, setLabel] = useState(editing?.label ?? '');
  const [type, setType] = useState<AccountType>(editing?.type ?? '입출금');
  const [bank, setBank] = useState(editing?.bank ?? '');
  const [balance, setBalance] = useState(String(editing?.balance ?? 0));
  const [color, setColor] = useState(editing?.color ?? '#444');
  const [creditLimit, setCreditLimit] = useState(String(editing?.limit ?? ''));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 모달이 열리거나 편집 대상이 바뀌면 폼 초기화 (이전 값 잔존 방지)
  useEffect(() => {
    if (!open) return;
    setLabel(editing?.label ?? '');
    setType(editing?.type ?? '입출금');
    setBank(editing?.bank ?? '');
    setBalance(String(editing?.balance ?? 0));
    setColor(editing?.color ?? '#444');
    setCreditLimit(String(editing?.limit ?? ''));
    setErr(null);
  }, [open, editing]);

  if (!open) return null;

  // 음수 부호 1개 + 숫자만 추출. "1-000" → "1000", "-1,000" → "-1000".
  const parseSignedNumber = (raw: string): number => {
    const trimmed = raw.trim();
    if (!trimmed) return 0;
    const isNegative = trimmed.startsWith('-');
    const digits = trimmed.replace(/[^0-9]/g, '');
    if (!digits) return 0;
    const n = Number(digits);
    return isNegative ? -n : n;
  };

  const handleSave = async () => {
    setBusy(true);
    setErr(null);
    try {
      const lbl = label.trim();
      const bk = bank.trim();
      if (!lbl) throw new Error('이름을 입력하세요');
      if (lbl.length > 30) throw new Error('이름은 30자 이내로 입력해주세요');
      if (!bk) throw new Error('은행/카드사를 입력하세요');
      if (bk.length > 20) throw new Error('은행/카드사는 20자 이내로 입력해주세요');
      const balanceNum = parseSignedNumber(balance);
      const limitNum = creditLimit.trim()
        ? Number(creditLimit.replace(/[^0-9]/g, '')) || undefined
        : undefined;

      const payload = {
        label: lbl,
        type,
        bank: bk,
        balance: balanceNum,
        color,
        limit: limitNum,
      };
      if (editing) {
        await update(editing.id, payload);
      } else {
        await add(payload);
      }
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm('이 계좌를 삭제하시겠습니까?')) return;
    setBusy(true);
    setErr(null);
    try {
      await remove(editing.id);
      onClose();
    } catch (e) {
      // FK 위반 (이 계좌를 쓴 거래가 있음) 또는 RLS 거부 등을 사용자에게 노출
      setErr(e instanceof Error ? e.message : '삭제 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? '계좌 편집' : '계좌 추가'}>
      <div className="stack">
        <div className="grid cols-2">
          <div className="field">
            <label className="label">이름</label>
            <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 국민은행 주거래" maxLength={30} />
          </div>
          <div className="field">
            <label className="label">은행 / 카드사</label>
            <input className="input" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="예: 국민" maxLength={20} />
          </div>
        </div>
        <div className="grid cols-2">
          <div className="field">
            <label className="label">종류</label>
            <select className="select" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">잔액 (카드는 음수)</label>
            <input className="input num" inputMode="numeric" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0" style={{ textAlign: 'right' }} />
          </div>
        </div>
        {type === '카드' && (
          <div className="field">
            <label className="label">카드 한도 (선택)</label>
            <input className="input num" inputMode="numeric" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="0" style={{ textAlign: 'right' }} />
          </div>
        )}
        <div className="field">
          <label className="label">색상</label>
          <div className="row" style={{ gap: 8 }}>
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: c.value,
                  border: color === c.value ? '3px solid var(--ink)' : '3px solid transparent',
                  cursor: 'pointer',
                }}
                aria-label={c.label}
                title={c.label}
              />
            ))}
          </div>
        </div>
        {err && <div className="auth-error">{err}</div>}
        <div className="row" style={{ gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
          <div>
            {editing && <Button variant="ghost" onClick={handleDelete} disabled={busy}>삭제</Button>}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button variant="default" onClick={onClose} disabled={busy}>취소</Button>
            <Button variant="primary" onClick={handleSave} disabled={busy}>{busy ? '저장 중…' : '저장'}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
