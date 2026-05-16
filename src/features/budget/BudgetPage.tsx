import { useMemo } from 'react';
import { useTransactions } from '@/stores/transactionStore';
import { useSettings } from '@/stores/settingsStore';
import { BUDGETS, TOTAL_BUDGET } from '@/data/budgets';
import { GOALS } from '@/data/goals';
import { fmt } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BudgetRow } from '@/components/domain/BudgetRow';
import type { CategoryId } from '@/types/domain';

const CURRENT_YM = '2026-05';

export function BudgetPage() {
  const transactions = useTransactions((s) => s.transactions);
  const currency = useSettings((s) => s.currencyMode);

  const used = useMemo(() => {
    const map: Partial<Record<CategoryId, number>> = {};
    for (const t of transactions) {
      if (t.kind !== 'out' || !t.date.startsWith(CURRENT_YM)) continue;
      map[t.cat] = (map[t.cat] ?? 0) + t.amount;
    }
    return map;
  }, [transactions]);

  const usedTotal = Object.values(used).reduce<number>((s, v) => s + (v ?? 0), 0);
  const ratio = TOTAL_BUDGET > 0 ? (usedTotal / TOTAL_BUDGET) * 100 : 0;

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
                {fmt.money(TOTAL_BUDGET, currency)}
              </div>
            </div>
          </div>
          <ProgressBar value={usedTotal} max={TOTAL_BUDGET} thickness="thick" />
          <div className="meta num" style={{ marginTop: 8 }}>
            {fmt.percent(ratio, 0)} 사용
          </div>
        </Card>

        <Card>
          <h3 className="section-title">카테고리별 예산</h3>
          <div className="stack" style={{ gap: 6 }}>
            {BUDGETS.map((b) => (
              <BudgetRow key={b.cat} cat={b.cat} used={used[b.cat] ?? 0} limit={b.limit} />
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="section-title">저축 목표</h3>
          <div className="grid cols-3">
            {GOALS.map((g) => {
              const pct = (g.saved / g.target) * 100;
              return (
                <div
                  key={g.id}
                  style={{
                    padding: 18,
                    borderRadius: 16,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div className="row" style={{ gap: 10 }}>
                    <span
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        background: g.color,
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 22,
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
                  <ProgressBar value={g.saved} max={g.target} color={g.color} thickness="default" />
                  <div className="meta num" style={{ marginTop: 4 }}>
                    {fmt.percent(pct, 1)} 달성
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </>
  );
}
