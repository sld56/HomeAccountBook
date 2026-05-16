// 리포트 화면: 가족 통합 / 월별 비교 / 연간 정리

const { useState: useStateReport, useMemo: useMemoReport } = React;

// ─── 월별 멤버×카테고리 데이터 헬퍼 ───
function getMonthCat(ym) {
  if (MONTHLY_CAT[ym]) return MONTHLY_CAT[ym];
  // 5월: 실제 거래에서 집계
  const cats = stats.byCategory(TX, 'out');
  return Object.fromEntries(cats.map(c => [c.cat, c.amount]));
}
function getMonthMem(ym) {
  if (MONTHLY_MEM[ym]) return MONTHLY_MEM[ym];
  const mems = stats.byMember(TX, 'out');
  return Object.fromEntries(mems.map(m => [m.member, m.amount]));
}
function getMonthSummary(ym) {
  const m = MONTHLY.find(x => x.ym === ym);
  return m || { income: 0, expense: 0 };
}

// ─────────────────────────────────────────────────
// 스파크라인 (작은 트렌드)
// ─────────────────────────────────────────────────
function Sparkline({ values, color = 'var(--coral)', width = 120, height = 32, showDots = false }) {
  if (!values?.length) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);
  const pts = values.map((v, i) => [i * stepX, height - ((v - min) / range) * (height - 6) - 3]);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {showDots && pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2" fill={color}/>)}
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3" fill={color}/>
    </svg>
  );
}

// ─────────────────────────────────────────────────
// 12개월 라인 차트 (호버/터치 툴팁)
// ─────────────────────────────────────────────────
function YearlyLine({ data, height = 240, currencyMode = 'won', singleSeries = false }) {
  const [active, setActive] = useStateReport(null);
  const max = Math.max(...data.flatMap(d => [d.income, d.expense]));
  const w = 720;
  const padX = 36, padY = 24;
  const innerW = w - padX * 2, innerH = height - padY * 2;
  const stepX = innerW / (data.length - 1);
  const xy = (v, i) => [padX + i * stepX, padY + innerH - (v / max) * innerH];

  const incPts = data.map((d, i) => xy(d.income, i));
  const expPts = data.map((d, i) => xy(d.expense, i));
  const linePath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const areaPath = (pts) => `${linePath(pts)} L ${pts[pts.length-1][0]} ${padY + innerH} L ${pts[0][0]} ${padY + innerH} Z`;

  const yTicks = [0, 0.5, 1].map(t => max * t);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * w;
    const idx = Math.round((x - padX) / stepX);
    setActive(Math.max(0, Math.min(data.length - 1, idx)));
  };

  return (
    <div style={{ position: 'relative' }} onPointerLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height}
           style={{ overflow: 'visible', cursor: 'crosshair', touchAction: 'none' }}
           onPointerMove={onMove}
           onPointerDown={onMove}>
        {yTicks.map((v, i) => {
          const y = padY + innerH - (v / max) * innerH;
          return (
            <g key={i}>
              <line x1={padX} y1={y} x2={w - padX} y2={y} stroke="var(--border)" strokeDasharray="3 4"/>
              <text x={padX - 8} y={y + 4} fontSize="11" fill="var(--ink-3)" textAnchor="end">
                {fmt.short(v)}
              </text>
            </g>
          );
        })}
        <path d={areaPath(incPts)} fill="var(--sage)" opacity={singleSeries ? 0.18 : 0.10}/>
        {!singleSeries && <path d={areaPath(expPts)} fill="var(--coral)" opacity="0.10"/>}
        <path d={linePath(incPts)} fill="none" stroke="var(--sage)" strokeWidth="2.5" strokeLinejoin="round"/>
        {!singleSeries && <path d={linePath(expPts)} fill="none" stroke="var(--coral)" strokeWidth="2.5" strokeLinejoin="round"/>}
        {incPts.map((p, i) => (
          <circle key={'i'+i} cx={p[0]} cy={p[1]} r={active === i ? 6 : (i === data.length - 1 ? 5 : 3)} fill="var(--sage)" style={{ transition: 'r .12s' }}/>
        ))}
        {!singleSeries && expPts.map((p, i) => (
          <circle key={'e'+i} cx={p[0]} cy={p[1]} r={active === i ? 6 : (i === data.length - 1 ? 5 : 3)} fill="var(--coral)" style={{ transition: 'r .12s' }}/>
        ))}
        {active != null && (
          <line x1={incPts[active][0]} x2={incPts[active][0]} y1={padY} y2={padY + innerH}
                stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5"/>
        )}
        {data.map((d, i) => {
          const last = i === data.length - 1;
          const high = active === i;
          return (
            <text key={i} x={padX + i * stepX} y={height - 4} fontSize="11"
                  fill={high ? 'var(--ink)' : last ? 'var(--coral-2)' : 'var(--ink-3)'}
                  fontWeight={high || last ? 700 : 500}
                  textAnchor="middle">
              {d.month}
            </text>
          );
        })}
      </svg>
      {active != null && (() => {
        const x = (incPts[active][0] / w) * 100;
        return (
          <div style={{
            position: 'absolute',
            left: `${x}%`,
            top: 4,
            transform: `translate(${x > 75 ? 'calc(-100% - 8px)' : x < 25 ? '8px' : '-50%'}, 0)`,
            background: 'var(--ink)', color: '#fff',
            padding: '10px 14px', borderRadius: 12,
            fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            boxShadow: '0 6px 16px rgba(0,0,0,.18)',
            pointerEvents: 'none', zIndex: 5,
          }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
              {data[active].ym ? data[active].ym.slice(0,4) + '년 ' : ''}{data[active].month}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <span><span style={{ color: '#9ec48f', marginRight: 6 }}>●</span>{singleSeries ? '누적 저축' : '수입'}</span>
              <span className="num">{fmt.money(data[active].income, currencyMode)}</span>
            </div>
            {!singleSeries && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 4 }}>
                  <span><span style={{ color: '#f0a290', marginRight: 6 }}>●</span>지출</span>
                  <span className="num">{fmt.money(data[active].expense, currencyMode)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,.15)' }}>
                  <span style={{ opacity: 0.8 }}>저축</span>
                  <span className="num" style={{ fontWeight: 800 }}>{fmt.money(data[active].income - data[active].expense, currencyMode)}</span>
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────
// 가족 × 카테고리 매트릭스 (히트맵)
// ─────────────────────────────────────────────────
function FamilyMatrix({ ym, currencyMode = 'won' }) {
  const memCols = Object.values(MEMBERS);
  const cats = ['food','transport','medical','utility','leisure','shopping','edu','other'];

  // 멤버×카테고리 집계 (5월만 실제 데이터, 그 외는 비율로 합성)
  const memTotal = getMonthMem(ym);
  const catTotal = getMonthCat(ym);
  const grandTotal = Object.values(memTotal).reduce((s, v) => s + v, 0);

  const cell = (memId, cat) => {
    // 5월(2026-05)은 실제 거래
    if (ym === '2026-05') {
      return TX.filter(t => t.kind === 'out' && t.member === memId && t.cat === cat)
        .reduce((s, t) => s + t.amount, 0);
    }
    // 합성: 멤버의 그 달 지출 비율 × 그 달 카테고리 총액
    const memShare = (memTotal[memId] || 0) / (grandTotal || 1);
    return Math.round((catTotal[cat] || 0) * memShare);
  };

  const maxCell = Math.max(...cats.flatMap(c => memCols.map(m => cell(m.id, c)))) || 1;

  return (
    <div style={{ overflowX: 'auto', margin: '0 -8px' }}>
      <table className="matrix" style={{ borderCollapse: 'collapse', minWidth: '100%', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: 12, color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '0.06em' }}>카테고리</th>
            {memCols.map(m => (
              <th key={m.id} style={{ padding: '10px 8px', minWidth: 86 }}>
                <div className="vstack" style={{ alignItems: 'center', gap: 4 }}>
                  <div className={`avatar sm ${m.color}`}>{m.short}</div>
                  <span style={{ fontWeight: 600, color: 'var(--ink-2)', fontSize: 12 }}>{m.name}</span>
                </div>
              </th>
            ))}
            <th style={{ padding: '10px 8px', minWidth: 100, textAlign: 'right', fontSize: 12, color: 'var(--ink-3)', fontWeight: 700, letterSpacing: '0.06em' }}>합계</th>
          </tr>
        </thead>
        <tbody>
          {cats.map(cat => {
            const c = CATEGORIES[cat];
            const row = memCols.map(m => cell(m.id, cat));
            const rowTotal = row.reduce((s, v) => s + v, 0);
            return (
              <tr key={cat} style={{ borderTop: '1px solid var(--border)' }}>
                <td style={{ padding: '12px' }}>
                  <div className="hstack" style={{ gap: 10 }}>
                    <span className="cat-dot" style={{ background: c.color, width: 14, height: 14 }}/>
                    <span style={{ fontWeight: 600 }}>{c.label}</span>
                  </div>
                </td>
                {row.map((v, i) => {
                  const ratio = v / maxCell;
                  const bg = v === 0 ? 'var(--bg-2)' :
                    `color-mix(in oklab, ${c.color} ${Math.max(8, ratio * 75)}%, transparent)`;
                  return (
                    <td key={i} style={{ padding: 4, textAlign: 'center' }}>
                      <div style={{
                        padding: '12px 6px',
                        background: bg,
                        borderRadius: 10,
                        fontWeight: 700,
                        color: ratio > 0.5 ? '#fff' : 'var(--ink)',
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                      }} className="num">
                        {v ? fmt.short(v) : '–'}
                      </div>
                    </td>
                  );
                })}
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700 }} className="num">
                  {fmt.short(rowTotal)}
                </td>
              </tr>
            );
          })}
          <tr style={{ borderTop: '2px solid var(--border-2)' }}>
            <td style={{ padding: '14px 12px', fontWeight: 700, color: 'var(--ink-2)' }}>합계</td>
            {memCols.map(m => (
              <td key={m.id} style={{ padding: '14px 8px', textAlign: 'center', fontWeight: 700 }} className="num">
                {fmt.short(memTotal[m.id] || 0)}
              </td>
            ))}
            <td style={{ padding: '14px 8px', textAlign: 'right', fontWeight: 800, fontSize: 14, color: 'var(--coral-2)' }} className="num">
              {fmt.short(grandTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────
// 비교 막대 (좌우 마주보는)
// ─────────────────────────────────────────────────
function CompareBar({ left, right, leftColor, rightColor, max }) {
  const lw = (left / max) * 100;
  const rw = (right / max) * 100;
  return (
    <div className="hstack" style={{ width: '100%', gap: 0, alignItems: 'center' }}>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ height: 14, width: `${lw}%`, background: leftColor, borderRadius: '999px 0 0 999px', minWidth: 4 }}/>
      </div>
      <div style={{ width: 2, height: 22, background: 'var(--border-2)' }}/>
      <div style={{ flex: 1 }}>
        <div style={{ height: 14, width: `${rw}%`, background: rightColor, borderRadius: '0 999px 999px 0', minWidth: 4 }}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// 가족 통합 탭
// ─────────────────────────────────────────────────
function FamilyOverviewTab({ currencyMode }) {
  const memCols = Object.values(MEMBERS);
  const totalExpense = MONTHLY[MONTHLY.length - 1].expense;
  const totalIncome  = MONTHLY[MONTHLY.length - 1].income;

  // 멤버별 6개월 트렌드
  const memTrend = (mid) => MONTHLY.slice(-6).map(m => {
    const mems = getMonthMem(m.ym);
    return mems[mid] || 0;
  });

  // 멤버별 카테고리 분포 (5월)
  const memCats = (mid) => {
    const arr = stats.byCategory(TX.filter(t => t.member === mid), 'out');
    return arr;
  };

  return (
    <div className="stack-lg stack">
      {/* 큰 요약 */}
      <div className="row cols-4">
        <KpiCard label="가족 전체 수입" accent="sage"
          value={fmt.money(totalIncome, currencyMode)}
          icon={<Icons.arrowDown size={20}/>}
          sub="네 사람 합산"/>
        <KpiCard label="가족 전체 지출" accent="coral"
          value={fmt.money(totalExpense, currencyMode)}
          icon={<Icons.arrowUp size={20}/>}
          sub="네 사람 합산"/>
        <KpiCard label="가족 순저축" accent="sky"
          value={fmt.money(totalIncome - totalExpense, currencyMode)}
          icon={<Icons.piggy size={20}/>}
          sub={`저축률 ${fmt.percent((totalIncome - totalExpense)/totalIncome*100)}`}/>
        <KpiCard label="가장 많이 쓴 사람" accent="lavender"
          value={MEMBERS.eomma.name}
          icon={<Icons.people size={20}/>}
          sub="어머니 · 식비 · 쇼핑"/>
      </div>

      {/* 멤버 카드 */}
      <div className="card card-lg">
        <div className="card-title">
          <span>가족 구성원별 한눈에</span>
          <span className="muted-3" style={{ fontSize: 13 }}>2026년 5월</span>
        </div>
        <div className="row cols-4" style={{ gap: 14 }}>
          {memCols.map(m => {
            const memExp = getMonthMem('2026-05')[m.id] || 0;
            const memShare = (memExp / totalExpense) * 100;
            const trend = memTrend(m.id);
            const lastVsPrev = trend[trend.length-1] - trend[trend.length-2];
            const topCat = memCats(m.id)[0];
            return (
              <div key={m.id} style={{
                padding: 18, background: 'var(--surface-2)',
                border: '1px solid var(--border)', borderRadius: 16,
              }}>
                <div className="hstack" style={{ gap: 12, marginBottom: 14 }}>
                  <div className={`avatar lg ${m.color}`}>{m.short}</div>
                  <div className="vstack" style={{ gap: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: 17 }}>{m.name}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{m.role}</span>
                  </div>
                </div>
                <div className="eyebrow">5월 지출</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
                  {fmt.money(memExp, currencyMode)}
                </div>
                <div className="hstack" style={{ justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--ink-3)' }}>
                  <span>전체의 {fmt.percent(memShare)}</span>
                  <span style={{ color: lastVsPrev <= 0 ? 'var(--sage-2)' : 'var(--rose)', fontWeight: 700 }}>
                    {lastVsPrev <= 0 ? '↓' : '↑'} {fmt.short(Math.abs(lastVsPrev))}
                  </span>
                </div>
                <div style={{ marginTop: 12, marginBottom: 12 }}>
                  <Sparkline values={trend} color={`var(--${m.color === 'fam-appa' ? 'sky' : m.color === 'fam-eomma' ? 'coral' : m.color === 'fam-deahyun' ? 'sage' : 'amber'})`} width={170} height={36}/>
                </div>
                <div className="divider" style={{ margin: '4px 0' }}/>
                {topCat && (
                  <div className="hstack" style={{ gap: 8, marginTop: 8 }}>
                    <span className="cat-dot" style={{ background: topCat.info.color }}/>
                    <span style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                      주로 <b>{topCat.info.label}</b>에 지출
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 가족 × 카테고리 매트릭스 */}
      <div className="card card-lg">
        <div className="card-title">
          <span>누가 어디에 얼마나 썼나</span>
          <span className="muted-3" style={{ fontSize: 13 }}>5월 · 색이 진할수록 많이 쓴 항목</span>
        </div>
        <FamilyMatrix ym="2026-05" currencyMode={currencyMode}/>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// 월별 비교 탭
// ─────────────────────────────────────────────────
function MonthlyCompareTab({ currencyMode }) {
  const [a, setA] = useStateReport('2026-04');
  const [b, setB] = useStateReport('2026-05');
  const ma = MONTHLY.find(m => m.ym === a);
  const mb = MONTHLY.find(m => m.ym === b);
  const catA = getMonthCat(a);
  const catB = getMonthCat(b);
  const memA = getMonthMem(a);
  const memB = getMonthMem(b);

  const cats = ['food','transport','medical','utility','leisure','shopping','edu'];
  const maxCat = Math.max(...cats.map(c => Math.max(catA[c] || 0, catB[c] || 0))) || 1;
  const maxMem = Math.max(...Object.values(MEMBERS).map(m => Math.max(memA[m.id] || 0, memB[m.id] || 0))) || 1;

  const Diff = ({ now, prev, invert = false }) => {
    const diff = now - prev;
    const pct = prev ? (diff / prev) * 100 : 0;
    const good = invert ? diff > 0 : diff < 0;
    return (
      <span style={{ color: good ? 'var(--sage-2)' : 'var(--rose)', fontWeight: 700, fontSize: 14 }} className="num">
        {diff > 0 ? '↑' : '↓'} {fmt.percent(Math.abs(pct))}
      </span>
    );
  };

  return (
    <div className="stack-lg stack">
      {/* 월 선택 */}
      <div className="card">
        <div className="hstack" style={{ gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="vstack" style={{ gap: 6 }}>
            <span className="eyebrow">기준 달</span>
            <select className="select" value={a} onChange={e => setA(e.target.value)} style={{ width: 200 }}>
              {MONTHLY.map(m => <option key={m.ym} value={m.ym}>{m.ym.slice(0,4)}년 {m.month}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 28, color: 'var(--ink-3)', marginTop: 18 }}>→</div>
          <div className="vstack" style={{ gap: 6 }}>
            <span className="eyebrow">비교 달</span>
            <select className="select" value={b} onChange={e => setB(e.target.value)} style={{ width: 200 }}>
              {MONTHLY.map(m => <option key={m.ym} value={m.ym}>{m.ym.slice(0,4)}년 {m.month}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 큰 수치 비교 */}
      <div className="row cols-3">
        {[
          { label: '수입', a: ma.income, b: mb.income, color: 'sage', invert: true },
          { label: '지출', a: ma.expense, b: mb.expense, color: 'coral', invert: false },
          { label: '순저축', a: ma.income - ma.expense, b: mb.income - mb.expense, color: 'sky', invert: true },
        ].map(k => (
          <div key={k.label} className="card card-lg">
            <div className="eyebrow">{k.label}</div>
            <div className="spread" style={{ marginTop: 10, alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{ma.month}</div>
                <div className="num" style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink-3)' }}>{fmt.short(k.a)}</div>
              </div>
              <div className="right">
                <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>{mb.month}</div>
                <div className="num" style={{ fontSize: 28, fontWeight: 800, color: `var(--${k.color}-2)` }}>{fmt.short(k.b)}</div>
              </div>
            </div>
            <div className="hstack" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
              <Diff now={k.b} prev={k.a} invert={k.invert}/>
            </div>
          </div>
        ))}
      </div>

      {/* 카테고리 비교 */}
      <div className="card card-lg">
        <div className="card-title">
          <span>카테고리별 비교</span>
          <div className="hstack" style={{ gap: 14, fontSize: 13, color: 'var(--ink-2)' }}>
            <span className="hstack" style={{ gap: 6 }}><span className="cat-dot" style={{ background: 'var(--ink-3)' }}/>{ma.month}</span>
            <span className="hstack" style={{ gap: 6 }}><span className="cat-dot" style={{ background: 'var(--coral)' }}/>{mb.month}</span>
          </div>
        </div>
        <div className="stack" style={{ gap: 16 }}>
          {cats.map(cat => {
            const c = CATEGORIES[cat];
            const va = catA[cat] || 0, vb = catB[cat] || 0;
            return (
              <div key={cat}>
                <div className="hstack" style={{ gap: 14, marginBottom: 8 }}>
                  <span className="hstack" style={{ gap: 8, width: 100, flexShrink: 0 }}>
                    <span className="cat-dot" style={{ background: c.color }}/>
                    <span style={{ fontWeight: 600 }}>{c.label}</span>
                  </span>
                  <div style={{ flex: 1 }}>
                    <CompareBar left={va} right={vb} leftColor="var(--ink-3)" rightColor={c.color} max={maxCat}/>
                  </div>
                </div>
                <div className="hstack" style={{ gap: 14, paddingLeft: 114, justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}>
                  <span className="num">{fmt.money(va, currencyMode)}</span>
                  <Diff now={vb} prev={va} invert={false}/>
                  <span className="num bold" style={{ color: 'var(--ink)' }}>{fmt.money(vb, currencyMode)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 가족 멤버 비교 */}
      <div className="card card-lg">
        <div className="card-title">가족 구성원별 비교</div>
        <div className="row cols-4" style={{ gap: 14 }}>
          {Object.values(MEMBERS).map(m => {
            const va = memA[m.id] || 0, vb = memB[m.id] || 0;
            const diff = vb - va;
            const pct = va ? (diff / va) * 100 : 0;
            return (
              <div key={m.id} style={{
                padding: 18, background: 'var(--surface-2)',
                border: '1px solid var(--border)', borderRadius: 16,
              }}>
                <div className="hstack" style={{ gap: 10, marginBottom: 14 }}>
                  <div className={`avatar sm ${m.color}`}>{m.short}</div>
                  <span style={{ fontWeight: 700 }}>{m.name}</span>
                </div>
                <div className="vstack" style={{ gap: 4 }}>
                  <div className="spread">
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{ma.month}</span>
                    <span className="num" style={{ color: 'var(--ink-3)', fontWeight: 600 }}>{fmt.short(va)}</span>
                  </div>
                  <div className="spread">
                    <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>{mb.month}</span>
                    <span className="num bold">{fmt.short(vb)}</span>
                  </div>
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
                  <Diff now={vb} prev={va}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// 연간 정리 탭
// ─────────────────────────────────────────────────
function YearlyTab({ currencyMode }) {
  const yearIncome = MONTHLY.reduce((s, m) => s + m.income, 0);
  const yearExpense = MONTHLY.reduce((s, m) => s + m.expense, 0);
  const yearSaved = yearIncome - yearExpense;

  // 카테고리 연간 합계
  const yearCat = {};
  MONTHLY.forEach(m => {
    const cat = getMonthCat(m.ym);
    Object.entries(cat).forEach(([k, v]) => { yearCat[k] = (yearCat[k] || 0) + v; });
  });
  const yearCatArr = Object.entries(yearCat)
    .map(([cat, amount]) => ({ cat, amount, info: CATEGORIES[cat] }))
    .filter(c => c.info)
    .sort((a, b) => b.amount - a.amount);

  // 베스트/워스트
  const maxMonth = MONTHLY.reduce((a, b) => b.expense > a.expense ? b : a);
  const minMonth = MONTHLY.reduce((a, b) => b.expense < a.expense ? b : a);

  // 카테고리별 12개월 트렌드
  const catTrend = (cat) => MONTHLY.map(m => getMonthCat(m.ym)[cat] || 0);

  // 누적 저축
  let cum = 0;
  const cumSavings = MONTHLY.map(m => { cum += (m.income - m.expense); return cum; });

  return (
    <div className="stack-lg stack">
      {/* 큰 요약 */}
      <div className="card card-lg" style={{
        background: 'linear-gradient(135deg, #FBF1E5 0%, #E4EEDC 100%)',
        border: 'none', padding: '32px 36px',
      }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>최근 12개월 (2025년 6월 ~ 2026년 5월)</div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>1년 동안 우리 가족은</h2>
        <div className="row cols-3" style={{ marginTop: 24, gap: 20 }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>총 수입</div>
            <div className="hero-money" style={{ fontSize: 42, color: 'var(--sage-2)', marginTop: 4 }}>
              {fmt.short(yearIncome)}원
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>총 지출</div>
            <div className="hero-money" style={{ fontSize: 42, color: 'var(--coral-2)', marginTop: 4 }}>
              {fmt.short(yearExpense)}원
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>총 저축</div>
            <div className="hero-money" style={{ fontSize: 42, color: 'var(--ink)', marginTop: 4 }}>
              {fmt.short(yearSaved)}원
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>
              저축률 <b className="num">{fmt.percent(yearSaved / yearIncome * 100)}</b>
            </div>
          </div>
        </div>
      </div>

      {/* 12개월 라인 */}
      <div className="card card-lg">
        <div className="card-title">
          <span>월별 수입과 지출</span>
          <div className="hstack" style={{ gap: 14, fontSize: 13, color: 'var(--ink-2)' }}>
            <span className="hstack" style={{ gap: 6 }}><span className="cat-dot" style={{ background: 'var(--sage)' }}/>수입</span>
            <span className="hstack" style={{ gap: 6 }}><span className="cat-dot" style={{ background: 'var(--coral)' }}/>지출</span>
          </div>
        </div>
        <YearlyLine data={MONTHLY} height={260} currencyMode={currencyMode}/>
      </div>

      {/* 베스트 / 워스트 + 누적 저축 */}
      <div className="row cols-3">
        <div className="card card-lg">
          <div className="eyebrow">가장 적게 쓴 달</div>
          <div className="hstack" style={{ marginTop: 14, gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, background: 'var(--sage-soft)',
              display: 'grid', placeItems: 'center', fontSize: 26,
            }}>🌿</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{minMonth.month}</div>
              <div className="num" style={{ color: 'var(--sage-2)', fontWeight: 700, fontSize: 18 }}>
                {fmt.money(minMonth.expense, currencyMode)}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-2)' }}>
            평균보다 <b>{fmt.short(yearExpense / 12 - minMonth.expense)}원</b> 적게 썼어요
          </div>
        </div>
        <div className="card card-lg">
          <div className="eyebrow">가장 많이 쓴 달</div>
          <div className="hstack" style={{ marginTop: 14, gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, background: 'var(--coral-soft)',
              display: 'grid', placeItems: 'center', fontSize: 26,
            }}>🔥</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{maxMonth.month}</div>
              <div className="num" style={{ color: 'var(--coral-2)', fontWeight: 700, fontSize: 18 }}>
                {fmt.money(maxMonth.expense, currencyMode)}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-2)' }}>
            추석이 있던 달이라 여행·선물 지출이 많았어요
          </div>
        </div>
        <div className="card card-lg">
          <div className="eyebrow">월평균</div>
          <div className="hstack" style={{ marginTop: 14, gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, background: 'var(--sky-soft)',
              display: 'grid', placeItems: 'center', fontSize: 26,
            }}>📊</div>
            <div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>한 달 평균 지출</div>
              <div className="num" style={{ fontWeight: 700, fontSize: 22 }}>
                {fmt.money(Math.round(yearExpense / 12), currencyMode)}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-2)' }}>
            수입의 <b className="num">{fmt.percent(yearExpense / yearIncome * 100)}</b>를 쓰고 계세요
          </div>
        </div>
      </div>

      {/* 카테고리 연간 합계 + 트렌드 */}
      <div className="card card-lg">
        <div className="card-title">
          <span>카테고리별 1년 트렌드</span>
          <span className="muted-3" style={{ fontSize: 13 }}>매달 얼마씩 썼나</span>
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <div className="hstack" style={{
            gap: 14, padding: '8px 12px', fontSize: 12, color: 'var(--ink-3)',
            fontWeight: 700, letterSpacing: '0.06em',
          }}>
            <span style={{ width: 130 }}>카테고리</span>
            <span style={{ flex: 1 }}>월별 추이</span>
            <span style={{ width: 130, textAlign: 'right' }}>연간 합계</span>
            <span style={{ width: 80, textAlign: 'right' }}>월평균</span>
          </div>
          {yearCatArr.slice(0, 7).map(c => {
            const trend = catTrend(c.cat);
            return (
              <div key={c.cat} className="hstack" style={{
                gap: 14, padding: '14px 12px', borderRadius: 12,
                background: 'var(--surface-2)',
              }}>
                <div className="hstack" style={{ gap: 10, width: 130 }}>
                  <span className="cat-dot" style={{ background: c.info.color, width: 14, height: 14 }}/>
                  <span style={{ fontWeight: 600 }}>{c.info.label}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <Sparkline values={trend} color={c.info.color} width={260} height={36}/>
                </div>
                <span className="num bold" style={{ width: 130, textAlign: 'right', fontSize: 17 }}>
                  {fmt.money(c.amount, currencyMode)}
                </span>
                <span className="num" style={{ width: 80, textAlign: 'right', fontSize: 13, color: 'var(--ink-3)' }}>
                  {fmt.short(Math.round(c.amount / 12))}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 누적 저축 */}
      <div className="card card-lg">
        <div className="card-title">
          <span>누적 저축 흐름</span>
          <span className="chip sage">↑ 1년간 {fmt.short(yearSaved)}원 모았어요</span>
        </div>
        <YearlyLine
          data={MONTHLY.map((m, i) => ({ month: m.month, ym: m.ym, income: cumSavings[i], expense: 0 }))}
          height={200}
          singleSeries={true}
          currencyMode={currencyMode}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// 메인 리포트 화면 (탭 컨테이너)
// ─────────────────────────────────────────────────
function ReportScreen({ currencyMode }) {
  const [tab, setTab] = useStateReport('family');

  return (
    <div className="stack-lg stack">
      <div className="page-header">
        <div>
          <h1>리포트</h1>
          <p className="greet">가족 통합 · 월별 비교 · 연간 정리</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="tab-bar">
        {[
          { v: 'family',  l: '가족 통합', ic: <Icons.people size={18}/> },
          { v: 'monthly', l: '월별 비교', ic: <Icons.chart size={18}/> },
          { v: 'yearly',  l: '연간 정리', ic: <Icons.cal size={18}/> },
        ].map(o => (
          <button key={o.v}
            onClick={() => setTab(o.v)}
            className={`tab-btn ${tab === o.v ? 'active' : ''}`}>
            {o.ic}
            {o.l}
          </button>
        ))}
      </div>

      {tab === 'family'  && <FamilyOverviewTab currencyMode={currencyMode}/>}
      {tab === 'monthly' && <MonthlyCompareTab currencyMode={currencyMode}/>}
      {tab === 'yearly'  && <YearlyTab currencyMode={currencyMode}/>}
    </div>
  );
}

window.ReportScreen = ReportScreen;
