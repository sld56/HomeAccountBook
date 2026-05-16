import { useMemo, useState } from 'react';
import { useTransactions } from '@/stores/transactionStore';
import { useMembers } from '@/stores/memberStore';
import { useSettings } from '@/stores/settingsStore';
import { filterByMember, monthSummary, byCategory } from '@/lib/stats';
import { fmt } from '@/lib/format';
import { MONTHLY } from '@/data/monthly';
import { TOTAL_BUDGET } from '@/data/budgets';
import { GOALS } from '@/data/goals';
import { UPCOMING } from '@/data/upcoming';
import { ACCOUNTS } from '@/data/accounts';
import { CATEGORIES } from '@/data/categories';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { MemberPills } from '@/components/domain/MemberPills';
import { KpiCard } from '@/components/domain/KpiCard';
import { TransactionRow } from '@/components/domain/TransactionRow';
import { TotalExpenseBreakdown } from '@/components/domain/TotalExpenseBreakdown';
import { Avatar } from '@/components/ui/Avatar';
import { Sparkline } from '@/components/charts/Sparkline';
import { MonthlyBars } from '@/components/charts/MonthlyBars';
import { DonutChart } from '@/components/charts/DonutChart';
import { TransactionForm } from '@/features/transactions/TransactionForm';

const CURRENT_YM = '2026-05';

function useMonthData() {
  const transactions = useTransactions((s) => s.transactions);
  const selectedMember = useMembers((s) => s.selectedMember);
  return useMemo(() => {
    const filteredByMember = filterByMember(transactions, selectedMember);
    const monthTxs = filteredByMember.filter((t) => t.date.startsWith(CURRENT_YM));
    const summary = monthSummary(monthTxs);
    const cats = byCategory(monthTxs, 'out');
    return { monthTxs, summary, cats, selectedMember };
  }, [transactions, selectedMember]);
}

function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 100);
}

function CardGridVariant() {
  const currency = useSettings((s) => s.currencyMode);
  const { monthTxs, summary, cats } = useMonthData();
  const usedBudget = summary.expense;
  const budgetRatio = TOTAL_BUDGET > 0 ? (usedBudget / TOTAL_BUDGET) * 100 : 0;

  const recent = [...monthTxs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);
  const monthlyData = MONTHLY.slice(-6).map((m) => ({
    ym: m.ym,
    income: m.income,
    expense: m.expense,
  }));

  const lastMonth = MONTHLY[MONTHLY.length - 2];
  const expenseDelta = lastMonth ? pctDelta(summary.expense, lastMonth.expense) : 0;
  const incomeDelta = lastMonth ? pctDelta(summary.income, lastMonth.income) : 0;

  return (
    <div className="stack">
      <div className="grid cols-4">
        <KpiCard
          eyebrow="이번 달 수입"
          value={fmt.money(summary.income, currency)}
          icon="💰"
          accent="var(--sage-soft)"
          trend={{
            direction: incomeDelta > 0 ? 'up' : incomeDelta < 0 ? 'down' : 'flat',
            text: `전월 대비 ${incomeDelta >= 0 ? '+' : ''}${incomeDelta}%`,
          }}
        />
        <KpiCard
          eyebrow="이번 달 지출"
          value={fmt.money(summary.expense, currency)}
          icon="🛍️"
          accent="var(--coral-soft)"
          trend={{
            direction: expenseDelta > 0 ? 'up' : expenseDelta < 0 ? 'down' : 'flat',
            text: `전월 대비 ${expenseDelta >= 0 ? '+' : ''}${expenseDelta}%`,
          }}
        />
        <KpiCard
          eyebrow="남은 예산"
          value={fmt.money(Math.max(0, TOTAL_BUDGET - usedBudget), currency)}
          icon="🎯"
          accent="var(--amber-soft)"
          trend={{
            direction: budgetRatio > 100 ? 'down' : 'flat',
            text: `${Math.round(budgetRatio)}% 사용`,
          }}
        />
        <KpiCard
          eyebrow="순저축"
          value={fmt.money(summary.net, currency)}
          icon="🏦"
          accent="var(--sky-soft)"
          trend={{
            direction: summary.net >= 0 ? 'up' : 'down',
            text: summary.net >= 0 ? '흑자' : '적자',
          }}
        />
      </div>

      <TotalExpenseBreakdown
        total={summary.expense}
        segments={cats}
        monthLabel={fmt.ymLabel(CURRENT_YM)}
      />

      <div className="grid cols-2">
        <Card>
          <h3 className="section-title">최근 6개월 비교</h3>
          <MonthlyBars data={monthlyData} />
        </Card>
        <Card>
          <h3 className="section-title">카테고리 비중</h3>
          <DonutChart segments={cats} />
        </Card>
      </div>

      <div className="grid cols-3">
        <Card>
          <h3 className="section-title">최근 거래</h3>
          <div className="stack" style={{ gap: 6 }}>
            {recent.length === 0 ? (
              <div className="muted">거래가 없습니다.</div>
            ) : (
              recent.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
            )}
          </div>
        </Card>
        <Card>
          <h3 className="section-title">다가오는 결제</h3>
          <div className="stack" style={{ gap: 10 }}>
            {UPCOMING.map((u) => {
              const cat = CATEGORIES[u.cat];
              return (
                <div key={u.id} className="between">
                  <div className="row" style={{ gap: 10 }}>
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: cat.color,
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 16,
                      }}
                    >
                      {cat.emoji}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.label}</div>
                      <div className="meta">
                        {fmt.date(u.date)} {u.autopay && '· 자동이체'}
                      </div>
                    </div>
                  </div>
                  <div className="num" style={{ fontWeight: 700 }}>
                    {fmt.money(u.amount, currency)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <h3 className="section-title">계좌 잔액</h3>
          <div className="stack" style={{ gap: 10 }}>
            {ACCOUNTS.map((a) => (
              <div key={a.id} className="between">
                <div>
                  <div style={{ fontWeight: 600 }}>{a.label}</div>
                  <div className="meta">{a.type}</div>
                </div>
                <div
                  className="num"
                  style={{
                    fontWeight: 700,
                    color: a.balance < 0 ? 'var(--coral-2)' : 'var(--ink)',
                  }}
                >
                  {fmt.money(a.balance, currency)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function BigNumberVariant() {
  const currency = useSettings((s) => s.currencyMode);
  const { summary, cats } = useMonthData();
  const remaining = Math.max(0, TOTAL_BUDGET - summary.expense);
  const usedRatio = TOTAL_BUDGET > 0 ? (summary.expense / TOTAL_BUDGET) * 100 : 0;
  const monthlyData = MONTHLY.slice(-6).map((m) => ({
    ym: m.ym,
    income: m.income,
    expense: m.expense,
  }));
  return (
    <div className="stack">
      <Card
        size="lg"
        style={{
          background: 'linear-gradient(135deg, var(--coral-soft), var(--amber-soft))',
          border: 'none',
        }}
      >
        <div className="meta" style={{ fontWeight: 600 }}>
          이번 달 남은 돈
        </div>
        <div
          className="hero-money num"
          style={{ color: 'var(--coral-2)', marginTop: 8 }}
        >
          {fmt.money(remaining, currency)}
        </div>
        <div className="row" style={{ marginTop: 16, gap: 12 }}>
          <span
            className="chip chip-sage"
            style={{ fontSize: 'var(--fs-sm)', padding: '8px 14px' }}
          >
            수입 +{fmt.money(summary.income, currency)}
          </span>
          <span
            className="chip chip-coral"
            style={{ fontSize: 'var(--fs-sm)', padding: '8px 14px' }}
          >
            지출 −{fmt.money(summary.expense, currency)}
          </span>
        </div>
        <div style={{ marginTop: 20 }}>
          <ProgressBar value={summary.expense} max={TOTAL_BUDGET} thickness="thick" />
          <div className="meta num" style={{ marginTop: 6 }}>
            예산 {fmt.percent(usedRatio, 0)} 사용 · 총 {fmt.money(TOTAL_BUDGET, currency)}
          </div>
        </div>
      </Card>

      <div className="grid cols-2">
        <Card>
          <h3 className="section-title">가장 많이 쓴 카테고리</h3>
          <div className="stack" style={{ gap: 10 }}>
            {cats.slice(0, 5).map((c) => {
              const cat = CATEGORIES[c.cat];
              return (
                <div key={c.cat} className="row" style={{ gap: 12 }}>
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: cat.color,
                      color: '#fff',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 18,
                    }}
                  >
                    {cat.emoji}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="between">
                      <span style={{ fontWeight: 600 }}>{cat.label}</span>
                      <span className="num">{fmt.money(c.amount, currency)}</span>
                    </div>
                    <ProgressBar value={c.ratio * 100} max={100} color={cat.color} thickness="thin" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <h3 className="section-title">최근 6개월</h3>
          <MonthlyBars data={monthlyData} />
        </Card>
      </div>
    </div>
  );
}

function FamilyVariant() {
  const currency = useSettings((s) => s.currencyMode);
  const members = useMembers((s) => s.members);
  const selectedMember = useMembers((s) => s.selectedMember);
  const transactions = useTransactions((s) => s.transactions);
  const monthTxs = transactions.filter((t) => t.date.startsWith(CURRENT_YM));
  const visibleMembers =
    selectedMember === 'all' ? members : members.filter((m) => m.id === selectedMember);

  const memberStats = visibleMembers.map((m) => {
    const txs = monthTxs.filter((t) => t.member === m.id && t.kind === 'out');
    const expense = txs.reduce((s, t) => s + t.amount, 0);
    const series = MONTHLY.slice(-6).map((mo) => mo.byMember[m.id] ?? 0);
    return { member: m, expense, series };
  });

  const totalExpense = memberStats.reduce((s, ms) => s + ms.expense, 0);

  return (
    <div className="stack">
      <div className="grid cols-4">
        {memberStats.map((ms) => (
          <Card key={ms.member.id} className="stack">
            <div className="row">
              <Avatar
                name={ms.member.name}
                short={ms.member.short}
                colorKey={ms.member.colorKey}
                size="md"
              />
              <div>
                <div style={{ fontWeight: 700 }}>{ms.member.name}</div>
                <div className="meta">{ms.member.role}</div>
              </div>
            </div>
            <div className="num" style={{ fontSize: 'var(--fs-xl)', fontWeight: 800 }}>
              {fmt.money(ms.expense, currency)}
            </div>
            <div className="meta">
              {totalExpense > 0
                ? fmt.percent((ms.expense / totalExpense) * 100, 1)
                : '0%'}{' '}
              차지
            </div>
            <Sparkline
              values={ms.series}
              color={`var(--member-${ms.member.colorKey})`}
            />
          </Card>
        ))}
      </div>

      <div className="grid cols-2">
        <Card>
          <h3 className="section-title">저축 목표</h3>
          <div className="stack" style={{ gap: 14 }}>
            {GOALS.map((g) => (
              <div key={g.id}>
                <div className="between" style={{ marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{g.title}</span>
                  <span className="num meta">
                    {fmt.money(g.saved, currency)} / {fmt.money(g.target, currency)}
                  </span>
                </div>
                <ProgressBar value={g.saved} max={g.target} color={g.color} thickness="default" />
                <div className="meta num" style={{ marginTop: 4 }}>
                  매월 {fmt.money(g.monthly, currency)} 저축
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="section-title">다가오는 결제</h3>
          <div className="stack" style={{ gap: 10 }}>
            {UPCOMING.map((u) => (
              <div key={u.id} className="between">
                <div>
                  <div style={{ fontWeight: 600 }}>{u.label}</div>
                  <div className="meta">
                    {fmt.date(u.date)} {u.autopay && '· 자동이체'}
                  </div>
                </div>
                <div className="num" style={{ fontWeight: 700 }}>
                  {fmt.money(u.amount, currency)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const layout = useSettings((s) => s.dashboardLayout);
  const setLayout = useSettings((s) => s.setDashboardLayout);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">홈</h1>
          <div className="page-greet">안녕하세요, 우리집 가계부에 오신 것을 환영합니다 ✨</div>
        </div>
        <div className="page-actions">
          <div className="row" style={{ gap: 4 }}>
            <Button
              variant={layout === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLayout('card')}
            >
              카드형
            </Button>
            <Button
              variant={layout === 'big' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLayout('big')}
            >
              큰 숫자
            </Button>
            <Button
              variant={layout === 'family' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setLayout('family')}
            >
              가족 중심
            </Button>
          </div>
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            + 새 거래 입력
          </Button>
        </div>
      </header>
      <MemberPills />
      <div style={{ marginTop: 'var(--gap-3)' }}>
        {layout === 'card' && <CardGridVariant />}
        {layout === 'big' && <BigNumberVariant />}
        {layout === 'family' && <FamilyVariant />}
      </div>
      <TransactionForm open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
