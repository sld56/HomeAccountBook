import { useMemo, useState } from 'react';
import { useTransactions } from '@/stores/transactionStore';
import { useMembers } from '@/stores/memberStore';
import { useSettings } from '@/stores/settingsStore';
import { useAccounts } from '@/stores/accountStore';
import { useBudgets } from '@/stores/budgetStore';
import { useGoals } from '@/stores/goalStore';
import { useUpcoming } from '@/stores/upcomingStore';
import { filterByMember, monthSummary, byCategory, aggregateMonthly, lastNMonths } from '@/lib/stats';
import { fmt } from '@/lib/format';
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

function useMonthData() {
  const transactions = useTransactions((s) => s.transactions);
  const selectedMember = useMembers((s) => s.selectedMember);
  const currentYm = useMemo(() => fmt.ym(new Date()), []);
  return useMemo(() => {
    const filteredByMember = filterByMember(transactions, selectedMember);
    const monthTxs = filteredByMember.filter((t) => t.date.startsWith(currentYm));
    const summary = monthSummary(monthTxs);
    const cats = byCategory(monthTxs, 'out');
    return { monthTxs, summary, cats, selectedMember, currentYm };
  }, [transactions, selectedMember, currentYm]);
}

// 전월 대비 변화율. 전월값이 0이면 비율 계산이 의미 없어 null 반환
// (호출부에서 "신규" 같은 표시로 분기). curr·prev 모두 0이면 0% (변화 없음).
function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return Math.round(((curr - prev) / prev) * 100);
}

function CardGridVariant() {
  const currency = useSettings((s) => s.currencyMode);
  const { monthTxs, summary, cats, selectedMember, currentYm } = useMonthData();
  const accounts = useAccounts((s) => s.accounts);
  const upcoming = useUpcoming((s) => s.upcoming);
  const budgets = useBudgets((s) => s.budgets);
  const totalBudget = useMemo(() => budgets.reduce((acc, b) => acc + b.limit, 0), [budgets]);
  const usedBudget = summary.expense;
  const budgetRatio = totalBudget > 0 ? (usedBudget / totalBudget) * 100 : 0;

  const recent = [...monthTxs].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);

  // 실제 거래에서 월별 집계 (시드 MONTHLY 대신)
  const allTransactions = useTransactions((s) => s.transactions);
  const monthlyAggregate = useMemo(
    () => aggregateMonthly(filterByMember(allTransactions, selectedMember)),
    [allTransactions, selectedMember],
  );
  const last6 = useMemo(() => lastNMonths(monthlyAggregate, 6), [monthlyAggregate]);
  const monthlyData = last6.map((m) => ({ ym: m.ym, income: m.income, expense: m.expense }));

  const prevMonth = last6[last6.length - 2];
  const expenseDelta = prevMonth ? pctDelta(summary.expense, prevMonth.expense) : null;
  const incomeDelta = prevMonth ? pctDelta(summary.income, prevMonth.income) : null;

  // null이면 "신규" (전월 데이터 없음), 0이면 변화 없음, 그 외엔 ±N%
  const deltaTrend = (d: number | null): { direction: 'up' | 'down' | 'flat'; text: string } => {
    if (d === null) return { direction: 'flat', text: '신규 기록' };
    if (d === 0) return { direction: 'flat', text: '전월과 동일' };
    return { direction: d > 0 ? 'up' : 'down', text: `전월 대비 ${d > 0 ? '+' : ''}${d}%` };
  };

  return (
    <div className="stack">
      <div className="grid cols-4">
        <KpiCard
          eyebrow="이번 달 수입"
          value={fmt.money(summary.income, currency)}
          icon="💰"
          accent="var(--sage-soft)"
          trend={deltaTrend(incomeDelta)}
        />
        <KpiCard
          eyebrow="이번 달 지출"
          value={fmt.money(summary.expense, currency)}
          icon="🛍️"
          accent="var(--coral-soft)"
          trend={deltaTrend(expenseDelta)}
        />
        <KpiCard
          eyebrow="남은 예산"
          value={fmt.money(Math.max(0, totalBudget - usedBudget), currency)}
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
        monthLabel={fmt.ymLabel(currentYm)}
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
          {upcoming.length === 0 ? (
            <p className="meta muted">예정된 결제가 없어요. 예산 페이지에서 추가해보세요.</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {upcoming.map((u) => {
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
          )}
        </Card>
        <Card>
          <h3 className="section-title">계좌 잔액</h3>
          {accounts.length === 0 ? (
            <p className="meta muted">등록된 계좌가 없어요. 설정에서 추가해보세요.</p>
          ) : (
            <div className="stack" style={{ gap: 10 }}>
              {accounts.map((a) => (
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
          )}
        </Card>
      </div>
    </div>
  );
}

function BigNumberVariant() {
  const currency = useSettings((s) => s.currencyMode);
  const { summary, cats, selectedMember } = useMonthData();
  const budgets = useBudgets((s) => s.budgets);
  const allTransactions = useTransactions((s) => s.transactions);
  const totalBudget = useMemo(() => budgets.reduce((acc, b) => acc + b.limit, 0), [budgets]);
  const remaining = Math.max(0, totalBudget - summary.expense);
  const usedRatio = totalBudget > 0 ? (summary.expense / totalBudget) * 100 : 0;
  const monthlyData = useMemo(() => {
    const aggr = aggregateMonthly(filterByMember(allTransactions, selectedMember));
    return lastNMonths(aggr, 6).map((m) => ({ ym: m.ym, income: m.income, expense: m.expense }));
  }, [allTransactions, selectedMember]);
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
          <ProgressBar value={summary.expense} max={totalBudget} thickness="thick" />
          <div className="meta num" style={{ marginTop: 6 }}>
            예산 {fmt.percent(usedRatio, 0)} 사용 · 총 {fmt.money(totalBudget, currency)}
          </div>
        </div>
      </Card>

      <div className="grid cols-2">
        <Card>
          <h3 className="section-title">가장 많이 쓴 카테고리</h3>
          {cats.length === 0 ? (
            <p className="meta muted">이번 달 지출이 아직 없어요.</p>
          ) : (
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
          )}
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
  const goals = useGoals((s) => s.goals);
  const upcoming = useUpcoming((s) => s.upcoming);
  const currentYm = useMemo(() => fmt.ym(new Date()), []);
  const monthTxs = transactions.filter((t) => t.date.startsWith(currentYm));
  const visibleMembers =
    selectedMember === 'all' ? members : members.filter((m) => m.id === selectedMember);

  const monthlyAggregate = aggregateMonthly(transactions);
  const last6 = lastNMonths(monthlyAggregate, 6);
  const memberStats = visibleMembers.map((m) => {
    const txs = monthTxs.filter((t) => t.member === m.id && t.kind === 'out');
    const expense = txs.reduce((s, t) => s + t.amount, 0);
    const series = last6.map((mo) => mo.byMember[m.id] ?? 0);
    return { member: m, expense, series };
  });

  const totalExpense = memberStats.reduce((s, ms) => s + ms.expense, 0);

  // 가족 인원에 맞춰 그리드 컬럼 동적 조정 (0~4명 모두 보기 좋게)
  const gridClass =
    memberStats.length >= 4 ? 'grid cols-4'
    : memberStats.length === 3 ? 'grid cols-3'
    : memberStats.length === 2 ? 'grid cols-2'
    : 'stack';

  if (memberStats.length === 0) {
    return (
      <div className="stack">
        <Card>
          <p className="meta muted">
            가족 구성원이 없어요. 설정에서 추가하거나 초대를 보내보세요.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className={gridClass}>
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
            {goals.map((g) => (
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
            {upcoming.map((u) => (
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
