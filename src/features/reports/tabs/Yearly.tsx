import { useMemo } from 'react';
import { useSettings } from '@/stores/settingsStore';
import { useTransactions } from '@/stores/transactionStore';
import { aggregateMonthly, last12Months } from '@/lib/stats';
import { fmt } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { KpiCard } from '@/components/domain/KpiCard';
import { YearlyLine } from '@/components/charts/YearlyLine';
import { Sparkline } from '@/components/charts/Sparkline';
import { CATEGORIES, EXPENSE_CATEGORIES } from '@/data/categories';

export function Yearly() {
  const currency = useSettings((s) => s.currencyMode);
  const transactions = useTransactions((s) => s.transactions);
  const data = useMemo(() => last12Months(aggregateMonthly(transactions)), [transactions]);
  const totalIncome = data.reduce((s, m) => s + m.income, 0);
  const totalExpense = data.reduce((s, m) => s + m.expense, 0);
  const totalSaving = totalIncome - totalExpense;
  const savingRate = totalIncome > 0 ? (totalSaving / totalIncome) * 100 : 0;

  const best = data.reduce(
    (acc, m) => (m.income - m.expense > acc.value ? { ym: m.ym, value: m.income - m.expense } : acc),
    { ym: '', value: -Infinity },
  );
  const worst = data.reduce(
    (acc, m) => (m.income - m.expense < acc.value ? { ym: m.ym, value: m.income - m.expense } : acc),
    { ym: '', value: Infinity },
  );
  const avgExpense = totalExpense / data.length;

  let cumulative = 0;
  const savingsCum = data.map((m) => {
    cumulative += m.income - m.expense;
    return { ym: m.ym, income: cumulative, expense: 0 };
  });

  return (
    <div className="stack">
      <div className="grid cols-4">
        <KpiCard eyebrow="12개월 총 수입" value={fmt.money(totalIncome, currency)} accent="var(--sage-soft)" icon="💰" />
        <KpiCard eyebrow="12개월 총 지출" value={fmt.money(totalExpense, currency)} accent="var(--coral-soft)" icon="🛍️" />
        <KpiCard eyebrow="12개월 총 저축" value={fmt.money(totalSaving, currency)} accent="var(--sky-soft)" icon="🏦" />
        <KpiCard eyebrow="저축률" value={fmt.percent(savingRate, 1)} accent="var(--amber-soft)" icon="📈" />
      </div>

      <Card>
        <h3 className="section-title">12개월 수입 · 지출 흐름</h3>
        <YearlyLine data={data.map((m) => ({ ym: m.ym, income: m.income, expense: m.expense }))} />
        <div className="row" style={{ gap: 16, marginTop: 12, fontSize: 'var(--fs-sm)' }}>
          <span className="row" style={{ gap: 6 }}>
            <span style={{ width: 12, height: 12, background: 'var(--sage)', borderRadius: 3 }} />
            수입
          </span>
          <span className="row" style={{ gap: 6 }}>
            <span style={{ width: 12, height: 12, background: 'var(--coral)', borderRadius: 3 }} />
            지출
          </span>
        </div>
      </Card>

      <div className="grid cols-3">
        <Card>
          <h3 className="section-title">베스트 달</h3>
          <div className="big-money num" style={{ color: 'var(--sage-2)' }}>{fmt.ymLabel(best.ym)}</div>
          <div className="meta num" style={{ marginTop: 4 }}>저축 {fmt.money(best.value, currency)}</div>
        </Card>
        <Card>
          <h3 className="section-title">워스트 달</h3>
          <div className="big-money num" style={{ color: 'var(--coral-2)' }}>{fmt.ymLabel(worst.ym)}</div>
          <div className="meta num" style={{ marginTop: 4 }}>저축 {fmt.money(worst.value, currency)}</div>
        </Card>
        <Card>
          <h3 className="section-title">월평균 지출</h3>
          <div className="big-money num">{fmt.money(avgExpense, currency)}</div>
          <div className="meta" style={{ marginTop: 4 }}>12개월 평균</div>
        </Card>
      </div>

      <Card>
        <h3 className="section-title">카테고리별 1년 트렌드</h3>
        <div className="stack" style={{ gap: 12 }}>
          {EXPENSE_CATEGORIES.map((c) => {
            const series = data.map((m) => m.byCategory[c] ?? 0);
            const total = series.reduce((s, v) => s + v, 0);
            const avg = total / series.length;
            const cat = CATEGORIES[c];
            return (
              <div key={c} className="row" style={{ gap: 16 }}>
                <div style={{ width: 100, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: cat.color,
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 14,
                    }}
                  >
                    {cat.emoji}
                  </span>
                  <span style={{ fontWeight: 600 }}>{cat.label}</span>
                </div>
                <Sparkline values={series} color={cat.color} width={200} height={36} />
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div className="num" style={{ fontWeight: 700 }}>
                    합 {fmt.short(total)}
                  </div>
                  <div className="meta num">월평균 {fmt.short(avg)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h3 className="section-title">누적 저축 흐름</h3>
        <YearlyLine data={savingsCum} />
      </Card>
    </div>
  );
}
