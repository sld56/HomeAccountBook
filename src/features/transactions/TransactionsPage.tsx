import { useMemo, useState } from 'react';
import { useTransactions } from '@/stores/transactionStore';
import { useMembers } from '@/stores/memberStore';
import { useSettings } from '@/stores/settingsStore';
import { groupByDate, monthSummary, filterByMember } from '@/lib/stats';
import { CATEGORIES, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/data/categories';
import { fmt } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TransactionRow } from '@/components/domain/TransactionRow';
import { TransactionForm } from './TransactionForm';
import { MemberPills } from '@/components/domain/MemberPills';
import type { Transaction, CategoryId } from '@/types/domain';

const todayYM = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// 선택된 ym 안에서 적절한 기본 날짜 계산:
// - 오늘이 그 월에 속하면 오늘
// - 다른 월이면 오늘의 일자(day)와 그 월의 마지막 날 중 작은 값
//   예: 오늘 5/31 + ym=2024-02 → 2024-02-29
function defaultDateInYM(ym: string): string {
  const today = new Date();
  const todayYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  if (ym === todayYm) {
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return todayYm;
  const lastDay = new Date(y, m, 0).getDate();
  const day = Math.min(today.getDate(), lastDay);
  return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function TransactionsPage() {
  const transactions = useTransactions((s) => s.transactions);
  const selectedMember = useMembers((s) => s.selectedMember);
  const currency = useSettings((s) => s.currencyMode);

  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'in' | 'out'>('all');
  const [catFilters, setCatFilters] = useState<Set<CategoryId>>(new Set());
  const [ym, setYM] = useState(todayYM());
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [openNew, setOpenNew] = useState(false);

  const filtered = useMemo(() => {
    let arr = filterByMember(transactions, selectedMember);
    arr = arr.filter((t) => t.date.startsWith(ym));
    if (kindFilter !== 'all') arr = arr.filter((t) => t.kind === kindFilter);
    if (catFilters.size) arr = arr.filter((t) => catFilters.has(t.cat));
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      arr = arr.filter(
        (t) =>
          t.title.toLowerCase().includes(s) ||
          (t.memo?.toLowerCase().includes(s) ?? false),
      );
    }
    return arr;
  }, [transactions, selectedMember, ym, kindFilter, catFilters, search]);

  const summary = monthSummary(filtered);
  const groups = groupByDate(filtered);

  const toggleCat = (c: CategoryId) => {
    setCatFilters((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">거래 내역</h1>
          <div className="page-greet">{fmt.ymLabel(ym)} 가족 거래 흐름</div>
        </div>
        <div className="page-actions">
          <input
            type="month"
            className="input"
            value={ym}
            onChange={(e) => setYM(e.target.value)}
            style={{ width: 160 }}
          />
          <Button variant="primary" onClick={() => setOpenNew(true)}>
            + 새 거래 입력
          </Button>
        </div>
      </header>

      <MemberPills />

      <div className="stack" style={{ marginTop: 'var(--gap-3)' }}>
        <Card>
          <div className="stack">
            <input
              className="input"
              placeholder="제목 · 메모 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="row" style={{ gap: 6 }}>
              <Chip as="button" active={kindFilter === 'all'} onClick={() => setKindFilter('all')}>
                전체
              </Chip>
              <Chip as="button" tone="sage" active={kindFilter === 'in'} onClick={() => setKindFilter('in')}>
                수입
              </Chip>
              <Chip as="button" tone="coral" active={kindFilter === 'out'} onClick={() => setKindFilter('out')}>
                지출
              </Chip>
            </div>
            <div className="row" style={{ gap: 6 }}>
              {(kindFilter === 'in'
                ? INCOME_CATEGORIES
                : kindFilter === 'out'
                  ? EXPENSE_CATEGORIES
                  : [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]
              ).map((c) => (
                <Chip
                  key={c}
                  as="button"
                  active={catFilters.has(c)}
                  onClick={() => toggleCat(c)}
                >
                  {CATEGORIES[c].emoji} {CATEGORIES[c].label}
                </Chip>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="row" style={{ justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div className="meta">수입</div>
              <div className="num" style={{ fontWeight: 700, fontSize: 'var(--fs-lg)', color: 'var(--sage-2)' }}>
                {fmt.money(summary.income, currency)}
              </div>
            </div>
            <div>
              <div className="meta">지출</div>
              <div className="num" style={{ fontWeight: 700, fontSize: 'var(--fs-lg)', color: 'var(--coral-2)' }}>
                {fmt.money(summary.expense, currency)}
              </div>
            </div>
            <div>
              <div className="meta">잔액</div>
              <div className="num" style={{ fontWeight: 700, fontSize: 'var(--fs-lg)' }}>
                {fmt.money(summary.net, currency)}
              </div>
            </div>
          </div>
        </Card>

        {groups.length === 0 && (
          <Card>
            <div className="muted" style={{ textAlign: 'center', padding: 'var(--gap-4)' }}>
              해당하는 거래가 없습니다.
            </div>
          </Card>
        )}

        {groups.map((g) => (
          <div key={g.date} className="stack" style={{ gap: 8 }}>
            <div className="between" style={{ padding: '0 4px' }}>
              <div className="meta" style={{ fontWeight: 700, color: 'var(--ink-2)' }}>
                {fmt.dayLabel(g.date)} · {fmt.date(g.date)}
              </div>
              <div className="meta num">
                {g.totalIn > 0 && (
                  <span style={{ color: 'var(--sage-2)' }}>+{fmt.money(g.totalIn, currency)}</span>
                )}
                {g.totalIn > 0 && g.totalOut > 0 && <span> · </span>}
                {g.totalOut > 0 && (
                  <span style={{ color: 'var(--coral-2)' }}>−{fmt.money(g.totalOut, currency)}</span>
                )}
              </div>
            </div>
            <div className="stack" style={{ gap: 6 }}>
              {g.items.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} onClick={() => setEditing(tx)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <TransactionForm
        open={openNew}
        onClose={() => setOpenNew(false)}
        defaultDate={defaultDateInYM(ym)}
      />
      <TransactionForm
        open={editing != null}
        onClose={() => setEditing(null)}
        initial={editing ?? undefined}
      />
    </>
  );
}
