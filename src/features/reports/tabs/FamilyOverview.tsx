import { useMembers } from '@/stores/memberStore';
import { useSettings } from '@/stores/settingsStore';
import { useTransactions } from '@/stores/transactionStore';
import { fmt } from '@/lib/format';
import { byCategory, byMember } from '@/lib/stats';
import { CATEGORIES, EXPENSE_CATEGORIES } from '@/data/categories';
import { aggregateMonthly, lastNMonths } from '@/lib/stats';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { KpiCard } from '@/components/domain/KpiCard';
import { Sparkline } from '@/components/charts/Sparkline';
import type { CategoryId } from '@/types/domain';

const CURRENT_YM = '2026-05';

export function FamilyOverview() {
  const members = useMembers((s) => s.members);
  const transactions = useTransactions((s) => s.transactions);
  const currency = useSettings((s) => s.currencyMode);

  const monthTxs = transactions.filter((t) => t.date.startsWith(CURRENT_YM));
  const totalIncome = monthTxs.filter((t) => t.kind === 'in').reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTxs.filter((t) => t.kind === 'out').reduce((s, t) => s + t.amount, 0);
  const memberTotals = byMember(monthTxs, 'out');
  const topMember = memberTotals[0];
  const topMemberName = topMember ? members.find((m) => m.id === topMember.member)?.name ?? '-' : '-';

  const monthlyAggregate = aggregateMonthly(transactions);
  const last6 = lastNMonths(monthlyAggregate, 6);
  const lastMonth = last6[last6.length - 2];

  return (
    <div className="stack">
      <div className="grid cols-4">
        <KpiCard eyebrow="가족 전체 수입" value={fmt.money(totalIncome, currency)} icon="💰" accent="var(--sage-soft)" />
        <KpiCard eyebrow="가족 전체 지출" value={fmt.money(totalExpense, currency)} icon="🛍️" accent="var(--coral-soft)" />
        <KpiCard eyebrow="순저축" value={fmt.money(totalIncome - totalExpense, currency)} icon="🏦" accent="var(--sky-soft)" />
        <KpiCard eyebrow="가장 많이 쓴 사람" value={topMemberName} icon="👑" accent="var(--amber-soft)" />
      </div>

      <div className="grid cols-2">
        {members.map((m) => {
          const myTxs = monthTxs.filter((t) => t.member === m.id && t.kind === 'out');
          const expense = myTxs.reduce((s, t) => s + t.amount, 0);
          const ratio = totalExpense > 0 ? expense / totalExpense : 0;
          const series = last6.map((mo) => mo.byMember[m.id] ?? 0);
          const prev = lastMonth?.byMember[m.id] ?? 0;
          const delta = prev > 0 ? Math.round(((expense - prev) / prev) * 100) : 0;
          const myCats = byCategory(myTxs, 'out');
          const topCat = myCats[0];
          return (
            <Card key={m.id} className="stack">
              <div className="between">
                <div className="row">
                  <Avatar name={m.name} short={m.short} colorKey={m.colorKey} size="lg" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 'var(--fs-lg)' }}>{m.name}</div>
                    <div className="meta">{m.role} · {fmt.percent(ratio * 100, 1)} 차지</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="big-money num">{fmt.money(expense, currency)}</div>
                  <div className="meta" style={{ color: delta >= 0 ? 'var(--coral-2)' : 'var(--sage-2)' }}>
                    전월 {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
                  </div>
                </div>
              </div>
              <Sparkline values={series} color={`var(--member-${m.colorKey})`} width={260} height={48} />
              {topCat && (
                <div className="meta">
                  주력 카테고리: <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{CATEGORIES[topCat.cat].emoji} {CATEGORIES[topCat.cat].label}</span>
                  <span className="num"> · {fmt.money(topCat.amount, currency)}</span>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card>
        <h3 className="section-title">가족 × 카테고리 매트릭스</h3>
        <FamilyMatrix monthTxs={monthTxs} />
      </Card>
    </div>
  );
}

function FamilyMatrix({ monthTxs }: { monthTxs: ReturnType<typeof useTransactions.getState>['transactions'] }) {
  const members = useMembers((s) => s.members);
  const currency = useSettings((s) => s.currencyMode);

  const matrix: Record<string, Record<CategoryId, number>> = {};
  let maxCell = 0;
  for (const m of members) {
    matrix[m.id] = {} as Record<CategoryId, number>;
    for (const c of EXPENSE_CATEGORIES) {
      const sum = monthTxs
        .filter((t) => t.member === m.id && t.cat === c && t.kind === 'out')
        .reduce((s, t) => s + t.amount, 0);
      matrix[m.id][c] = sum;
      if (sum > maxCell) maxCell = sum;
    }
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          borderCollapse: 'separate',
          borderSpacing: 4,
          fontSize: 'var(--fs-sm)',
          minWidth: 600,
        }}
      >
        <thead>
          <tr>
            <th style={{ textAlign: 'left', color: 'var(--ink-3)', fontWeight: 600 }}>구성원</th>
            {EXPENSE_CATEGORIES.map((c) => (
              <th key={c} style={{ color: 'var(--ink-3)', fontWeight: 600, fontSize: 'var(--fs-xs)' }}>
                {CATEGORIES[c].emoji} {CATEGORIES[c].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td style={{ fontWeight: 700, color: 'var(--ink)', paddingRight: 8 }}>{m.name}</td>
              {EXPENSE_CATEGORIES.map((c) => {
                const v = matrix[m.id][c];
                const ratio = maxCell > 0 ? v / maxCell : 0;
                const bg = `color-mix(in oklab, ${CATEGORIES[c].color} ${ratio * 75}%, transparent)`;
                const textColor = ratio > 0.5 ? '#fff' : 'var(--ink)';
                return (
                  <td
                    key={c}
                    className="num"
                    style={{
                      background: bg,
                      color: textColor,
                      padding: '8px 10px',
                      borderRadius: 8,
                      textAlign: 'right',
                      minWidth: 90,
                    }}
                  >
                    {v > 0 ? fmt.short(v) : '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="meta muted" style={{ marginTop: 8 }}>
        셀 농도는 가족 전체에서의 상대 크기를 나타냅니다. 통화: {currency === 'korean' ? '한글 단위' : '원'}
      </div>
    </div>
  );
}
