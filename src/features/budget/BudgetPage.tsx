import { useMemo, useState } from 'react';
import { useTransactions } from '@/stores/transactionStore';
import { useSettings } from '@/stores/settingsStore';
import { useBudgets } from '@/stores/budgetStore';
import { useGoals } from '@/stores/goalStore';
import { useUpcoming } from '@/stores/upcomingStore';
import { fmt } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BudgetRow } from '@/components/domain/BudgetRow';
import { Modal } from '@/components/ui/Modal';
import { CATEGORIES, EXPENSE_CATEGORIES } from '@/data/categories';
import type { CategoryId, Goal, Upcoming } from '@/types/domain';

const CURRENT_YM = '2026-05';

export function BudgetPage() {
  const transactions = useTransactions((s) => s.transactions);
  const currency = useSettings((s) => s.currencyMode);
  const budgets = useBudgets((s) => s.budgets);
  const upsertBudget = useBudgets((s) => s.upsert);
  const removeBudget = useBudgets((s) => s.remove);
  const goals = useGoals((s) => s.goals);
  const upcoming = useUpcoming((s) => s.upcoming);

  const [editingBudgets, setEditingBudgets] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [addingUpcoming, setAddingUpcoming] = useState(false);
  const [editingUpcoming, setEditingUpcoming] = useState<Upcoming | null>(null);

  const used = useMemo(() => {
    const map: Partial<Record<CategoryId, number>> = {};
    for (const t of transactions) {
      if (t.kind !== 'out' || !t.date.startsWith(CURRENT_YM)) continue;
      map[t.cat] = (map[t.cat] ?? 0) + t.amount;
    }
    return map;
  }, [transactions]);

  const totalBudget = useMemo(() => budgets.reduce((s, b) => s + b.limit, 0), [budgets]);
  const usedTotal = Object.values(used).reduce<number>((s, v) => s + (v ?? 0), 0);
  const ratio = totalBudget > 0 ? (usedTotal / totalBudget) * 100 : 0;

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">예산 · 목표</h1>
          <div className="page-greet">{fmt.ymLabel(CURRENT_YM)} 가족 예산 현황</div>
        </div>
      </header>

      <div className="stack">
        <Card
          size="lg"
          style={{
            background: 'linear-gradient(135deg, var(--coral-soft), var(--sage-soft))',
            border: 'none',
          }}
        >
          <div className="between" style={{ marginBottom: 16 }}>
            <div>
              <div className="meta" style={{ fontWeight: 600 }}>{fmt.ymLabel(CURRENT_YM)} 사용</div>
              <div className="big-money num" style={{ marginTop: 4 }}>
                {fmt.money(usedTotal, currency)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="meta">총 예산</div>
              <div className="num" style={{ fontWeight: 700 }}>
                {fmt.money(totalBudget, currency)}
              </div>
            </div>
          </div>
          <ProgressBar value={usedTotal} max={totalBudget || 1} thickness="thick" />
          <div className="meta num" style={{ marginTop: 8 }}>
            {totalBudget > 0 ? fmt.percent(ratio, 0) + ' 사용' : '예산이 아직 없어요'}
          </div>
        </Card>

        <Card>
          <div className="between" style={{ marginBottom: 8 }}>
            <h3 className="section-title" style={{ margin: 0 }}>카테고리별 예산</h3>
            <Button variant="default" size="sm" onClick={() => setEditingBudgets(true)}>
              {budgets.length === 0 ? '+ 예산 설정' : '편집'}
            </Button>
          </div>
          {budgets.length === 0 ? (
            <p className="meta muted">예산이 아직 없어요. "예산 설정"으로 카테고리별 월 한도를 정해주세요.</p>
          ) : (
            <div className="stack" style={{ gap: 6 }}>
              {budgets.map((b) => (
                <BudgetRow key={`${b.cat}-${b.ym ?? 'all'}`} cat={b.cat} used={used[b.cat] ?? 0} limit={b.limit} />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="between" style={{ marginBottom: 8 }}>
            <h3 className="section-title" style={{ margin: 0 }}>저축 목표</h3>
            <Button variant="default" size="sm" onClick={() => setAddingGoal(true)}>+ 목표 추가</Button>
          </div>
          {goals.length === 0 ? (
            <p className="meta muted">아직 저축 목표가 없어요. "+ 목표 추가"로 만들어보세요.</p>
          ) : (
            <div className="grid cols-3">
              {goals.map((g) => {
                const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setEditingGoal(g)}
                    style={{
                      padding: 18,
                      borderRadius: 16,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="row" style={{ gap: 10 }}>
                      <span
                        style={{
                          width: 44, height: 44, borderRadius: 14, background: g.color, color: '#fff',
                          display: 'grid', placeItems: 'center', fontSize: 22,
                        }}
                      >
                        🎯
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--fs-base)' }}>{g.title}</div>
                        <div className="meta num">매월 {fmt.money(g.monthly, currency)}</div>
                      </div>
                    </div>
                    <div className="num" style={{ marginTop: 14, fontSize: 'var(--fs-lg)', fontWeight: 700 }}>
                      {fmt.money(g.saved, currency)}
                      <span className="meta" style={{ fontWeight: 400 }}> / {fmt.money(g.target, currency)}</span>
                    </div>
                    <ProgressBar value={g.saved} max={g.target || 1} color={g.color} thickness="default" />
                    <div className="meta num" style={{ marginTop: 4 }}>
                      {fmt.percent(pct, 1)} 달성
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div className="between" style={{ marginBottom: 8 }}>
            <h3 className="section-title" style={{ margin: 0 }}>다가오는 결제</h3>
            <Button variant="default" size="sm" onClick={() => setAddingUpcoming(true)}>+ 추가</Button>
          </div>
          {upcoming.length === 0 ? (
            <p className="meta muted">아직 다가오는 결제가 없어요.</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {upcoming.map((u) => {
                const cat = CATEGORIES[u.cat];
                return (
                  <button
                    key={u.id}
                    type="button"
                    className="between"
                    onClick={() => setEditingUpcoming(u)}
                    style={{ padding: '8px 12px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer' }}
                  >
                    <div className="row" style={{ gap: 10 }}>
                      <span style={{ width: 32, height: 32, borderRadius: 10, background: cat.color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16 }}>
                        {cat.emoji}
                      </span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600 }}>{u.label}</div>
                        <div className="meta">{fmt.date(u.date)} {u.autopay && '· 자동이체'}</div>
                      </div>
                    </div>
                    <div className="num" style={{ fontWeight: 700 }}>{fmt.money(u.amount, currency)}</div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* 모달들 */}
      <BudgetEditorModal
        open={editingBudgets}
        onClose={() => setEditingBudgets(false)}
        budgets={budgets}
        onSave={async (cat, limit) => upsertBudget(cat, null, limit)}
        onDelete={async (cat) => removeBudget(cat, null)}
      />
      <GoalEditorModal
        open={addingGoal || editingGoal !== null}
        editing={editingGoal}
        onClose={() => { setAddingGoal(false); setEditingGoal(null); }}
      />
      <UpcomingEditorModal
        open={addingUpcoming || editingUpcoming !== null}
        editing={editingUpcoming}
        onClose={() => { setAddingUpcoming(false); setEditingUpcoming(null); }}
      />
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// 예산 편집 모달
// ──────────────────────────────────────────────────────────────

function BudgetEditorModal({
  open, onClose, budgets, onSave, onDelete,
}: {
  open: boolean;
  onClose: () => void;
  budgets: { cat: CategoryId; limit: number }[];
  onSave: (cat: CategoryId, limit: number) => Promise<void>;
  onDelete: (cat: CategoryId) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const current: Record<string, number> = Object.fromEntries(
    budgets.map((b) => [b.cat, b.limit]),
  );

  const handleSave = async () => {
    setBusy(true);
    try {
      for (const cat of EXPENSE_CATEGORIES) {
        const raw = values[cat] ?? '';
        const newLimit = raw.replace(/[^0-9]/g, '');
        const oldLimit = current[cat];
        if (newLimit === '' && oldLimit !== undefined) {
          await onDelete(cat);
        } else if (newLimit !== '' && Number(newLimit) !== oldLimit) {
          await onSave(cat, Number(newLimit));
        }
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="카테고리별 예산 편집">
      <div className="stack">
        <p className="meta">월 한도를 원(₩)으로 입력하세요. 빈 칸은 한도 없음으로 처리됩니다.</p>
        {EXPENSE_CATEGORIES.map((cat) => {
          const c = CATEGORIES[cat];
          const placeholder = current[cat] ? current[cat].toLocaleString('ko-KR') : '0';
          return (
            <div key={cat} className="row" style={{ gap: 10 }}>
              <span style={{ width: 32, height: 32, borderRadius: 10, background: c.color, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0 }}>
                {c.emoji}
              </span>
              <span style={{ width: 60, fontWeight: 600 }}>{c.label}</span>
              <input
                type="text"
                inputMode="numeric"
                className="input num"
                placeholder={placeholder}
                value={values[cat] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [cat]: e.target.value }))}
                style={{ flex: 1, textAlign: 'right' }}
              />
            </div>
          );
        })}
        <div className="row" style={{ gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="default" onClick={onClose} disabled={busy}>취소</Button>
          <Button variant="primary" onClick={handleSave} disabled={busy}>
            {busy ? '저장 중…' : '저장'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────
// 목표 편집 모달
// ──────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { label: 'Sage', value: 'var(--sage)' },
  { label: 'Coral', value: 'var(--coral)' },
  { label: 'Sky', value: 'var(--sky)' },
  { label: 'Amber', value: 'var(--amber)' },
  { label: 'Lavender', value: 'var(--lavender)' },
];

function GoalEditorModal({
  open, onClose, editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Goal | null;
}) {
  const add = useGoals((s) => s.add);
  const update = useGoals((s) => s.update);
  const remove = useGoals((s) => s.remove);

  const [title, setTitle] = useState(editing?.title ?? '');
  const [saved, setSaved] = useState(String(editing?.saved ?? 0));
  const [target, setTarget] = useState(String(editing?.target ?? ''));
  const [monthly, setMonthly] = useState(String(editing?.monthly ?? 0));
  const [color, setColor] = useState(editing?.color ?? 'var(--sage)');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // editing 바뀌면 폼 초기화
  useMemo(() => {
    if (open) {
      setTitle(editing?.title ?? '');
      setSaved(String(editing?.saved ?? 0));
      setTarget(String(editing?.target ?? ''));
      setMonthly(String(editing?.monthly ?? 0));
      setColor(editing?.color ?? 'var(--sage)');
      setErr(null);
    }
  }, [open, editing]);

  if (!open) return null;

  const handleSave = async () => {
    setBusy(true);
    setErr(null);
    try {
      const t = title.trim();
      const tg = Number(target.replace(/[^0-9]/g, ''));
      if (!t) throw new Error('제목을 입력하세요');
      if (!tg) throw new Error('목표 금액을 입력하세요');
      const payload = {
        title: t,
        saved: Number(saved.replace(/[^0-9]/g, '') || '0'),
        target: tg,
        monthly: Number(monthly.replace(/[^0-9]/g, '') || '0'),
        color,
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
    if (!confirm('이 목표를 삭제하시겠습니까?')) return;
    setBusy(true);
    try {
      await remove(editing.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? '저축 목표 편집' : '저축 목표 추가'}>
      <div className="stack">
        <div className="field">
          <label className="label" htmlFor="goal-title">제목</label>
          <input id="goal-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 제주 가족여행" />
        </div>
        <div className="grid cols-3">
          <div className="field">
            <label className="label">목표 금액</label>
            <input className="input num" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0" style={{ textAlign: 'right' }} />
          </div>
          <div className="field">
            <label className="label">현재 저축</label>
            <input className="input num" inputMode="numeric" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0" style={{ textAlign: 'right' }} />
          </div>
          <div className="field">
            <label className="label">매월 저축</label>
            <input className="input num" inputMode="numeric" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="0" style={{ textAlign: 'right' }} />
          </div>
        </div>
        <div className="field">
          <label className="label">색상</label>
          <div className="row" style={{ gap: 8 }}>
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                style={{ width: 36, height: 36, borderRadius: 10, background: c.value, border: color === c.value ? '3px solid var(--ink)' : '3px solid transparent', cursor: 'pointer' }}
                aria-label={c.label}
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

// ──────────────────────────────────────────────────────────────
// 다가오는 결제 편집 모달
// ──────────────────────────────────────────────────────────────

function UpcomingEditorModal({
  open, onClose, editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Upcoming | null;
}) {
  const add = useUpcoming((s) => s.add);
  const update = useUpcoming((s) => s.update);
  const remove = useUpcoming((s) => s.remove);

  const [label, setLabel] = useState(editing?.label ?? '');
  const [date, setDate] = useState(editing?.date ?? new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(String(editing?.amount ?? ''));
  const [cat, setCat] = useState<CategoryId>(editing?.cat ?? 'utility');
  const [autopay, setAutopay] = useState(editing?.autopay ?? false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useMemo(() => {
    if (open) {
      setLabel(editing?.label ?? '');
      setDate(editing?.date ?? new Date().toISOString().slice(0, 10));
      setAmount(String(editing?.amount ?? ''));
      setCat(editing?.cat ?? 'utility');
      setAutopay(editing?.autopay ?? false);
      setErr(null);
    }
  }, [open, editing]);

  if (!open) return null;

  const handleSave = async () => {
    setBusy(true);
    setErr(null);
    try {
      const a = Number(amount.replace(/[^0-9]/g, ''));
      if (!label.trim()) throw new Error('이름을 입력하세요');
      if (!a) throw new Error('금액을 입력하세요');
      const payload = { label: label.trim(), date, amount: a, cat, autopay };
      if (editing) await update(editing.id, payload);
      else await add(payload);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!confirm('이 결제 항목을 삭제하시겠습니까?')) return;
    setBusy(true);
    try {
      await remove(editing.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? '다가오는 결제 편집' : '다가오는 결제 추가'}>
      <div className="stack">
        <div className="field">
          <label className="label">이름</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 아파트 관리비" />
        </div>
        <div className="grid cols-2">
          <div className="field">
            <label className="label">결제일</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">금액</label>
            <input className="input num" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" style={{ textAlign: 'right' }} />
          </div>
        </div>
        <div className="field">
          <label className="label">카테고리</label>
          <select className="select" value={cat} onChange={(e) => setCat(e.target.value as CategoryId)}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORIES[c].emoji} {CATEGORIES[c].label}</option>
            ))}
          </select>
        </div>
        <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={autopay} onChange={(e) => setAutopay(e.target.checked)} />
          <span>자동이체</span>
        </label>
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
