// 대시보드 변형 3종
// V1: 카드 그리드 (전통적/친숙)
// V2: 큰 숫자 히어로 (가독성 최우선)
// V3: 가족 스토리 (가족 구성원별 위주)

const { useMemo } = React;

// ───────── 변형 1: 카드 그리드 ─────────
function DashboardCardGrid({ currencyMode, member }) {
  const filtered = member === 'all' ? TX : TX.filter(t => t.member === member);
  const sum = stats.monthSummary(filtered);
  const cats = stats.byCategory(filtered);
  const totalBudget = BUDGETS.reduce((s, b) => s + b.limit, 0);
  const usedBudget = sum.expense;

  // 누적 일별 지출 (1~12일)
  const dailyCumulative = useMemo(() => {
    const arr = new Array(12).fill(0);
    filtered.filter(t => t.kind === 'out').forEach(t => {
      const d = parseInt(t.date.slice(-2), 10);
      arr[d - 1] += t.amount;
    });
    let cum = 0; return arr.map(v => (cum += v));
  }, [member]);

  return (
    <div className="stack-lg stack">
      {/* 4-up KPI */}
      <div className="row cols-4">
        <KpiCard
          label="이번 달 수입"
          value={fmt.money(sum.income, currencyMode)}
          accent="sage"
          icon={<Icons.arrowDown size={20}/>}
          sub={<span style={{ color: 'var(--sage-2)' }}>4월보다 6.3% ↑</span>}
        />
        <KpiCard
          label="이번 달 지출"
          value={fmt.money(sum.expense, currencyMode)}
          accent="coral"
          icon={<Icons.arrowUp size={20}/>}
          sub={<span style={{ color: 'var(--sage-2)' }}>4월보다 25.7% ↓</span>}
        />
        <KpiCard
          label="남은 예산"
          value={fmt.money(totalBudget - usedBudget, currencyMode)}
          accent="amber"
          icon={<Icons.wallet size={20}/>}
          sub={`예산 ${fmt.money(totalBudget, currencyMode)} 중 ${fmt.percent(usedBudget/totalBudget*100)} 사용`}
        />
        <KpiCard
          label="순저축"
          value={fmt.money(sum.net, currencyMode)}
          accent="sky"
          icon={<Icons.piggy size={20}/>}
          sub="목표 대비 84% 달성"
        />
      </div>

      {/* 전체 지출 분석 */}
      <div className="card card-lg">
        <div className="card-title">
          <span>이번 달 전체 지출</span>
          <span className="muted-3" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>막대를 눌러보세요</span>
        </div>
        <TotalExpenseBreakdown data={cats} currencyMode={currencyMode}/>
      </div>

      {/* 본문 2단 */}
      <div className="row" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <div className="card card-lg">
          <div className="card-title">
            <span>월별 수입 / 지출</span>
            <span className="more">최근 6개월 ›</span>
          </div>
          <MonthlyBars data={MONTHLY.slice(-6)} currencyMode={currencyMode}/>
        </div>
        <div className="card card-lg">
          <div className="card-title">카테고리별 지출</div>
          <div className="donut-row" style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
            <DonutChart data={cats} size={170} thickness={24} currencyMode={currencyMode}/>
            <div style={{ flex: '1 1 200px', minWidth: 180 }}>
              <CatLegend data={cats} currencyMode={currencyMode} max={5} showBar={false}/>
            </div>
          </div>
        </div>
      </div>

      <div className="row" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-title">
            <span>최근 거래</span>
            <span className="more">전체 ›</span>
          </div>
          <div className="tx-list">
            {filtered.slice(0, 5).map(t => <TxRow key={t.id} tx={t} currencyMode={currencyMode}/>)}
          </div>
        </div>
        <div className="card">
          <div className="card-title">
            <span>다가오는 결제</span>
            <span className="chip amber"><Icons.bell size={12}/> 3건</span>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            {UPCOMING.slice(0, 4).map(u => (
              <div key={u.id} className="spread">
                <div className="hstack" style={{ gap: 12 }}>
                  <CatIcon cat={u.cat} size="sm"/>
                  <div className="vstack" style={{ gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>{u.label}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{fmt.dateLong(u.date)}</span>
                  </div>
                </div>
                <span className="num bold">{fmt.money(u.amount, currencyMode)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-title">계좌 잔액</div>
          <div className="stack" style={{ gap: 14 }}>
            {ACCOUNTS.slice(0, 4).map(a => (
              <div key={a.id} className="spread">
                <div className="hstack" style={{ gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: a.color,
                    display: 'grid', placeItems: 'center', color: '#fff', fontSize: 12, fontWeight: 700,
                  }}>{a.bank.slice(0, 2)}</div>
                  <div className="vstack" style={{ gap: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{a.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{a.type}</span>
                  </div>
                </div>
                <span className="num bold" style={{ color: a.balance < 0 ? 'var(--rose)' : 'var(--ink)' }}>
                  {fmt.money(a.balance, currencyMode)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── 변형 2: 큰 숫자 히어로 ─────────
function DashboardBigNumber({ currencyMode, member }) {
  const filtered = member === 'all' ? TX : TX.filter(t => t.member === member);
  const sum = stats.monthSummary(filtered);
  const cats = stats.byCategory(filtered);
  const totalBudget = BUDGETS.reduce((s, b) => s + b.limit, 0);
  const budgetPct = (sum.expense / totalBudget) * 100;

  return (
    <div className="stack-lg stack">
      {/* HERO */}
      <div className="card card-lg" style={{
        background: 'linear-gradient(135deg, #FBF1E5 0%, #FCE4DA 100%)',
        border: 'none', padding: '36px 40px',
      }}>
        <div className="spread" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>5월 12일 · 12일 째</div>
            <div style={{ fontSize: 16, color: 'var(--ink-2)', fontWeight: 600 }}>이번 달 남은 돈</div>
            <div className="hero-money" style={{ marginTop: 8, color: 'var(--ink)' }}>
              {fmt.money(sum.net, currencyMode)}
            </div>
            <div className="hstack" style={{ gap: 14, marginTop: 18 }}>
              <span className="chip sage" style={{ fontSize: 14, padding: '7px 14px' }}>
                <Icons.arrowDown size={14}/> 수입 {fmt.money(sum.income, currencyMode)}
              </span>
              <span className="chip coral" style={{ fontSize: 14, padding: '7px 14px' }}>
                <Icons.arrowUp size={14}/> 지출 {fmt.money(sum.expense, currencyMode)}
              </span>
            </div>
          </div>
          <div className="vstack" style={{ gap: 8, minWidth: 220, alignItems: 'flex-end' }}>
            <div style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 600 }}>예산 진행률</div>
            <div className="big-money" style={{ fontSize: 40 }}>{fmt.percent(budgetPct)}</div>
            <div style={{ width: 220 }}>
              <div className="bar thick" style={{ background: 'rgba(255,255,255,0.55)' }}>
                <span style={{ width: `${budgetPct}%`, background: 'var(--coral)' }}/>
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>
              남은 예산 <b className="num">{fmt.money(totalBudget - sum.expense, currencyMode)}</b>
            </div>
          </div>
        </div>
      </div>

      {/* 큰 정보 3장 */}
      <div className="row cols-3">
        <div className="card card-lg">
          <div className="eyebrow">이번 달 가장 많이 쓴</div>
          <div className="hstack" style={{ marginTop: 14, gap: 18 }}>
            <CatIcon cat={cats[0].cat} size="lg"/>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{cats[0].info.label}</div>
              <div className="big-money" style={{ fontSize: 26, marginTop: 2 }}>{fmt.money(cats[0].amount, currencyMode)}</div>
            </div>
          </div>
          <div className="divider"/>
          <div className="stack" style={{ gap: 10 }}>
            {cats.slice(1, 4).map(c => (
              <div key={c.cat} className="spread">
                <div className="hstack" style={{ gap: 10 }}>
                  <span className="cat-dot" style={{ background: c.info.color }}/>
                  <span style={{ fontWeight: 600 }}>{c.info.label}</span>
                </div>
                <span className="num bold">{fmt.money(c.amount, currencyMode)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-lg">
          <div className="eyebrow">지난달과 비교</div>
          <div style={{ marginTop: 14, fontSize: 20, fontWeight: 700, lineHeight: 1.4 }}>
            지난달보다<br/>
            <span style={{ color: 'var(--sage-2)' }}>{fmt.money(2_960_000 - sum.expense, currencyMode)}</span> 덜 쓰셨어요
          </div>
          <div style={{ marginTop: 18 }}>
            <TrendArea
              values={[2_850_000, 3_410_000, 3_080_000, 2_960_000, sum.expense]}
              labels={['1월', '2월', '3월', '4월', '5월']}
              height={90}
              color="var(--sage)"
              currencyMode={currencyMode}
            />
          </div>
          <div className="hstack" style={{ gap: 4, justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: 'var(--ink-3)' }}>
            <span>1월</span><span>2월</span><span>3월</span><span>4월</span><span style={{ color: 'var(--sage-2)', fontWeight: 700 }}>5월</span>
          </div>
        </div>

        <div className="card card-lg">
          <div className="eyebrow">다가오는 결제 (이번주)</div>
          <div style={{ marginTop: 14 }}>
            <div className="big-money" style={{ fontSize: 32 }}>{fmt.money(UPCOMING.slice(0,3).reduce((s,u)=>s+u.amount,0), currencyMode)}</div>
            <div style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 4 }}>3건의 자동결제 예정</div>
          </div>
          <div className="divider"/>
          <div className="stack" style={{ gap: 12 }}>
            {UPCOMING.slice(0, 3).map(u => (
              <div key={u.id} className="spread">
                <div className="vstack" style={{ gap: 2 }}>
                  <span style={{ fontWeight: 600 }}>{u.label}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{fmt.dayLabel(u.date)}</span>
                </div>
                <span className="num bold">{fmt.money(u.amount, currencyMode)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 최근 거래 풀폭 */}
      <div className="card card-lg">
        <div className="card-title">
          <span>최근 거래 내역</span>
          <span className="more">전체 보기 ›</span>
        </div>
        <div className="tx-list">
          {filtered.slice(0, 6).map(t => <TxRow key={t.id} tx={t} currencyMode={currencyMode}/>)}
        </div>
      </div>
    </div>
  );
}

// ───────── 변형 3: 가족 스토리 ─────────
function DashboardFamily({ currencyMode, member }) {
  const filtered = member === 'all' ? TX : TX.filter(t => t.member === member);
  const sum = stats.monthSummary(filtered);
  const byMember = stats.byMember(TX, 'out');
  const cats = stats.byCategory(filtered);
  const totalBudget = BUDGETS.reduce((s, b) => s + b.limit, 0);

  return (
    <div className="stack-lg stack">
      {/* 가족 한눈에 */}
      <div className="card card-lg" style={{ padding: '28px 30px' }}>
        <div className="spread" style={{ marginBottom: 22 }}>
          <div>
            <div className="eyebrow">우리 가족 5월</div>
            <h2 style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700 }}>네 사람이 함께 만든 한 달</h2>
          </div>
          <span className="chip sage" style={{ fontSize: 14, padding: '7px 14px' }}>
            <Icons.check size={14}/> 예산 안에서 잘 쓰고 있어요
          </span>
        </div>

        <div className="row cols-4" style={{ gap: 14 }}>
          {Object.values(MEMBERS).map(m => {
            const mTx = TX.filter(t => t.member === m.id);
            const ms = stats.monthSummary(mTx);
            const max = Math.max(...byMember.map(b => b.amount));
            const w = (ms.expense / max) * 100;
            return (
              <div key={m.id} className="card" style={{ padding: 18, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="hstack" style={{ gap: 12, marginBottom: 12 }}>
                  <div className={`avatar lg ${m.color}`}>{m.short}</div>
                  <div className="vstack" style={{ gap: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: 17 }}>{m.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{m.role}</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>이번 달 지출</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                  {fmt.money(ms.expense, currencyMode)}
                </div>
                <div className="bar thin" style={{ marginTop: 10 }}>
                  <span style={{ width: `${w}%`, background: `var(--${m.color === 'fam-appa' ? 'sky' : m.color === 'fam-eomma' ? 'coral' : m.color === 'fam-deahyun' ? 'sage' : 'amber'})` }}/>
                </div>
                <div className="spread" style={{ marginTop: 10, fontSize: 12 }}>
                  <span style={{ color: 'var(--sage-2)', fontWeight: 600 }}>+{fmt.short(ms.income)}</span>
                  <span style={{ color: 'var(--ink-3)' }}>{mTx.length}건</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 본문 */}
      <div className="row" style={{ gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
        <div className="card card-lg">
          <div className="card-title">
            <span>{member === 'all' ? '가족 전체' : MEMBERS[member]?.name} 카테고리 지출</span>
          </div>
          <div className="hstack" style={{ gap: 20, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
            <DonutChart data={cats} size={180} thickness={26} currencyMode={currencyMode}/>
          </div>
          <div className="divider"/>
          <CatLegend data={cats} currencyMode={currencyMode} max={5}/>
        </div>

        <div className="card card-lg">
          <div className="card-title">
            <span>저축 목표</span>
            <span className="more">목표 추가 ›</span>
          </div>
          <div className="stack-lg stack">
            {GOALS.map(g => {
              const pct = (g.saved / g.target) * 100;
              return (
                <div key={g.id}>
                  <div className="spread" style={{ marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 17 }}>{g.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
                        매달 <b>{fmt.money(g.monthly, currencyMode)}</b> 저축 중
                      </div>
                    </div>
                    <div className="right">
                      <div style={{ fontWeight: 700, fontSize: 18 }} className="num">{fmt.percent(pct)}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        {fmt.short(g.saved)} / {fmt.short(g.target)}
                      </div>
                    </div>
                  </div>
                  <div className="bar thick">
                    <span style={{ width: `${pct}%`, background: g.color }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="row" style={{ gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <div className="card card-lg">
          <div className="card-title">최근 가족 활동</div>
          <div className="tx-list">
            {TX.slice(0, 6).map(t => <TxRow key={t.id} tx={t} currencyMode={currencyMode}/>)}
          </div>
        </div>
        <div className="card card-lg">
          <div className="card-title">
            <span>이번 주 다가오는 결제</span>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            {UPCOMING.slice(0, 4).map(u => (
              <div key={u.id} className="spread" style={{
                padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 12,
              }}>
                <div className="hstack" style={{ gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: 'var(--surface)',
                    display: 'grid', placeItems: 'center',
                  }}>
                    <Icons.cal size={20} style={{ color: 'var(--ink-2)' }}/>
                  </div>
                  <div className="vstack" style={{ gap: 2 }}>
                    <span style={{ fontWeight: 700 }}>{u.label}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{fmt.dayLabel(u.date)}</span>
                  </div>
                </div>
                <span className="num bold">{fmt.money(u.amount, currencyMode)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.DashboardCardGrid = DashboardCardGrid;
window.DashboardBigNumber = DashboardBigNumber;
window.DashboardFamily = DashboardFamily;
