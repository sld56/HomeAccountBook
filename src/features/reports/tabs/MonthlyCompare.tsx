import { useMemo, useState } from 'react';
import { useSettings } from '@/stores/settingsStore';
import { useTransactions } from '@/stores/transactionStore';
import { aggregateMonthly, lastNMonths } from '@/lib/stats';
import { fmt } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/domain/KpiCard';
import { CATEGORIES, EXPENSE_CATEGORIES } from '@/data/categories';
import { useMembers } from '@/stores/memberStore';
import { Avatar } from '@/components/ui/Avatar';

export function MonthlyCompare() {
  const currency = useSettings((s) => s.currencyMode);
  const members = useMembers((s) => s.members);
  const transactions = useTransactions((s) => s.transactions);

  // 거래에서 실제 발생한 월 + 최근 12개월 채워서 드롭다운에 표시
  const aggregate = useMemo(() => aggregateMonthly(transactions), [transactions]);
  const last12 = useMemo(() => lastNMonths(aggregate, 12), [aggregate]);
  const byYm = useMemo(() => Object.fromEntries(last12.map((m) => [m.ym, m])), [last12]);
  const yms = last12.map((m) => m.ym);

  const [a, setA] = useState(yms[yms.length - 2] ?? yms[0]);
  const [b, setB] = useState(yms[yms.length - 1] ?? yms[0]);

  const A = byYm[a];
  const B = byYm[b];
  if (!A || !B) return null;

  // y=0이면 비율 계산 무의미 → null. y>0이면 ±%.
  const delta = (x: number, y: number): number | null =>
    y === 0 ? (x === 0 ? 0 : null) : Math.round(((x - y) / y) * 100);
  const dInc = delta(B.income, A.income);
  const dExp = delta(B.expense, A.expense);
  const dNet = delta(B.income - B.expense, A.income - A.expense);

  const deltaTrend = (d: number | null, refLabel: string) => {
    if (d === null) return { direction: 'flat' as const, text: `vs ${refLabel} 비교 불가` };
    if (d === 0) return { direction: 'flat' as const, text: `vs ${refLabel} 동일` };
    return {
      direction: d > 0 ? ('up' as const) : ('down' as const),
      text: `vs ${refLabel} ${d > 0 ? '+' : ''}${d}%`,
    };
  };

  return (
    <div className="stack">
      <div className="row" style={{ gap: 12, marginBottom: 4 }}>
        <div className="field">
          <label className="label">A월</label>
          <select className="select" value={a} onChange={(e) => setA(e.target.value)}>
            {yms.map((y) => (
              <option key={y} value={y}>{fmt.ymLabel(y)}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">B월</label>
          <select className="select" value={b} onChange={(e) => setB(e.target.value)}>
            {yms.map((y) => (
              <option key={y} value={y}>{fmt.ymLabel(y)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid cols-3">
        <KpiCard
          eyebrow={`수입 (${fmt.ymLabel(b)})`}
          value={fmt.money(B.income, currency)}
          trend={deltaTrend(dInc, fmt.ymLabel(a))}
        />
        <KpiCard
          eyebrow={`지출 (${fmt.ymLabel(b)})`}
          value={fmt.money(B.expense, currency)}
          trend={deltaTrend(dExp, fmt.ymLabel(a))}
        />
        <KpiCard
          eyebrow={`순저축 (${fmt.ymLabel(b)})`}
          value={fmt.money(B.income - B.expense, currency)}
          trend={deltaTrend(dNet, fmt.ymLabel(a))}
        />
      </div>

      <Card>
        <h3 className="section-title">카테고리별 비교</h3>
        <div className="stack" style={{ gap: 10 }}>
          {EXPENSE_CATEGORIES.map((c) => {
            const aVal = A.byCategory[c] ?? 0;
            const bVal = B.byCategory[c] ?? 0;
            const max = Math.max(aVal, bVal, 1);
            const cat = CATEGORIES[c];
            return (
              <div key={c} className="row" style={{ gap: 12 }}>
                <div style={{ width: 80, fontWeight: 600 }}>{cat.emoji} {cat.label}</div>
                <div style={{ flex: 1, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div className="num meta" style={{ width: 80, textAlign: 'right' }}>
                    {fmt.short(aVal)}
                  </div>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                    <div
                      style={{
                        height: 14,
                        width: `${(aVal / max) * 100}%`,
                        background: cat.color,
                        borderRadius: 4,
                        opacity: 0.5,
                      }}
                    />
                  </div>
                  <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        height: 14,
                        width: `${(bVal / max) * 100}%`,
                        background: cat.color,
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div className="num" style={{ width: 80, fontWeight: 700 }}>
                    {fmt.short(bVal)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="meta muted" style={{ marginTop: 8, textAlign: 'center' }}>
          ◀ {fmt.ymLabel(a)} (왼쪽) · {fmt.ymLabel(b)} (오른쪽) ▶
        </div>
      </Card>

      <Card>
        <h3 className="section-title">가족 구성원별 비교</h3>
        <div className="grid cols-2">
          {members.map((m) => {
            const aV = A.byMember[m.id] ?? 0;
            const bV = B.byMember[m.id] ?? 0;
            const d = delta(bV, aV);
            return (
              <div
                key={m.id}
                style={{
                  padding: 14,
                  background: 'var(--surface-2)',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                }}
              >
                <div className="row">
                  <Avatar name={m.name} short={m.short} colorKey={m.colorKey} size="md" />
                  <div style={{ fontWeight: 700 }}>{m.name}</div>
                </div>
                <div className="row" style={{ marginTop: 10, gap: 12 }}>
                  <div>
                    <div className="meta">{fmt.ymLabel(a)}</div>
                    <div className="num" style={{ fontWeight: 700 }}>
                      {fmt.money(aV, currency)}
                    </div>
                  </div>
                  <div style={{ color: 'var(--ink-3)' }}>→</div>
                  <div>
                    <div className="meta">{fmt.ymLabel(b)}</div>
                    <div className="num" style={{ fontWeight: 700 }}>
                      {fmt.money(bV, currency)}
                    </div>
                  </div>
                </div>
                <div
                  className="meta"
                  style={{
                    marginTop: 6,
                    color:
                      d === null
                        ? 'var(--ink-3)'
                        : d > 0
                          ? 'var(--coral-2)'
                          : d < 0
                            ? 'var(--sage-2)'
                            : 'var(--ink-3)',
                  }}
                >
                  {d === null
                    ? '비교 불가'
                    : d === 0
                      ? '동일'
                      : `${d > 0 ? '▲' : '▼'} ${Math.abs(d)}%`}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
