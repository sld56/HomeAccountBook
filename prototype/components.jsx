// 공용 컴포넌트: 아바타, 카테고리 아이콘, 도넛, 막대, 카드 등

const Avatar = ({ member, size = 'md', showName = false }) => {
  const m = MEMBERS[member];
  if (!m) return null;
  return (
    <div className="hstack" style={{ gap: 10 }}>
      <div className={`avatar ${size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : ''} ${m.color}`}>
        {m.short}
      </div>
      {showName && <span style={{ fontWeight: 600 }}>{m.name}</span>}
    </div>
  );
};

const CatIcon = ({ cat, size = 'md' }) => {
  const c = CATEGORIES[cat];
  if (!c) return null;
  const cls = size === 'lg' ? 'cat-icon lg' : size === 'sm' ? 'cat-icon' : 'cat-icon';
  const dim = size === 'lg' ? 56 : size === 'sm' ? 36 : 44;
  const fs = size === 'lg' ? 28 : 22;
  return (
    <div className={cls} style={{ background: c.color, width: dim, height: dim, fontSize: fs }}>
      <span>{c.emoji}</span>
    </div>
  );
};

// 도넛 차트: 카테고리별 지출 비중 (터치/호버 툴팁 지원)
const DonutChart = ({ data, size = 200, thickness = 28, currencyMode = 'won', interactive = true }) => {
  const [active, setActive] = React.useState(null);
  const total = data.reduce((s, d) => s + d.amount, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const activeData = active != null ? data[active] : null;

  return (
    <div style={{ position: 'relative', width: size, height: size }}
         onPointerLeave={() => interactive && setActive(null)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="var(--bg-2)" strokeWidth={thickness} fill="none"/>
        {data.map((d, i) => {
          const portion = total ? d.amount / total : 0;
          const dash = portion * c;
          const isActive = active === i;
          const sw = isActive ? thickness + 6 : thickness;
          const el = (
            <circle key={i} cx={size/2} cy={size/2} r={r}
              stroke={d.info.color} strokeWidth={sw} fill="none"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              opacity={active != null && !isActive ? 0.45 : 1}
              style={{
                cursor: interactive ? 'pointer' : 'default',
                transition: 'stroke-width .15s, opacity .15s',
                pointerEvents: 'stroke',
              }}
              onPointerEnter={() => interactive && setActive(i)}
              onPointerDown={() => interactive && setActive(i)}/>
          );
          offset += dash;
          return el;
        })}
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center',
        pointerEvents: 'none',
      }}>
        {activeData ? (
          <>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>{activeData.info.label}</div>
            <div className="big-money" style={{ fontSize: 22, color: activeData.info.color }}>
              {fmt.money(activeData.amount, currencyMode)}
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>
              전체의 <b className="num">{fmt.percent(activeData.amount / total * 100)}</b>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>전체 지출</div>
            <div className="big-money" style={{ fontSize: 26 }}>{fmt.money(total, currencyMode)}</div>
            {interactive && <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>조각을 눌러보세요</div>}
          </>
        )}
      </div>
    </div>
  );
};

// 카테고리 범례
const CatLegend = ({ data, total, currencyMode = 'won', max = 6, showBar = true }) => {
  const t = total || data.reduce((s, d) => s + d.amount, 0);
  return (
    <div className="stack" style={{ gap: 12 }}>
      {data.slice(0, max).map(d => {
        const pct = t ? (d.amount / t) * 100 : 0;
        return (
          <div key={d.cat}>
            <div className="spread" style={{ marginBottom: 6, gap: 8 }}>
              <div className="hstack" style={{ gap: 10, minWidth: 0 }}>
                <span className="cat-dot" style={{ background: d.info.color }}/>
                <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{d.info.label}</span>
              </div>
              <div className="hstack" style={{ gap: 10, flexShrink: 0 }}>
                <span style={{ color: 'var(--ink-3)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt.percent(pct)}</span>
                <span className="num" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt.money(d.amount, currencyMode)}</span>
              </div>
            </div>
            {showBar && (
              <div className="bar thin">
                <span style={{ width: `${pct}%`, background: d.info.color }}/>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// 월별 비교 막대 차트 (수입/지출 그룹, 터치/호버 툴팁)
const MonthlyBars = ({ data, currencyMode = 'won', height = 220 }) => {
  const [active, setActive] = React.useState(null);
  const max = Math.max(...data.flatMap(d => [d.income, d.expense]));
  return (
    <div style={{ position: 'relative' }} onPointerLeave={() => setActive(null)}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`, gap: 14, alignItems: 'end', height }}>
        {data.map((d, i) => {
          const last = i === data.length - 1;
          const ih = (d.income / max) * (height - 40);
          const eh = (d.expense / max) * (height - 40);
          const isActive = active === i;
          return (
            <div key={d.month}
                 onPointerEnter={() => setActive(i)}
                 onPointerDown={() => setActive(i)}
                 style={{
                   display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                   cursor: 'pointer', position: 'relative',
                   padding: '4px 2px', borderRadius: 8,
                   background: isActive ? 'var(--bg-2)' : 'transparent',
                   transition: 'background .15s',
                 }}>
              {isActive && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: '50%', transform: 'translate(-50%, -10px)',
                  background: 'var(--ink)', color: '#fff',
                  padding: '12px 16px', borderRadius: 12,
                  fontSize: 14, fontWeight: 600,
                  whiteSpace: 'nowrap', zIndex: 10, minWidth: 200,
                  boxShadow: '0 6px 16px rgba(0,0,0,.18)',
                  pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
                    {data[i].ym ? data[i].ym.slice(0,4) + '년 ' : ''}{d.month}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 4 }}>
                    <span><span style={{ color: '#9ec48f', marginRight: 6 }}>●</span>수입</span>
                    <span className="num">{fmt.money(d.income, currencyMode)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                    <span><span style={{ color: '#f0a290', marginRight: 6 }}>●</span>지출</span>
                    <span className="num">{fmt.money(d.expense, currencyMode)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.18)' }}>
                    <span style={{ opacity: 0.8 }}>저축</span>
                    <span className="num" style={{ fontWeight: 800 }}>{fmt.money(d.income - d.expense, currencyMode)}</span>
                  </div>
                  <div style={{
                    position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
                    borderTop: '7px solid var(--ink)',
                  }}/>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'end', gap: 6, height: height - 30 }}>
                <div style={{
                  width: 18, height: ih, borderRadius: '8px 8px 3px 3px',
                  background: 'var(--sage)',
                  opacity: isActive ? 1 : (last ? 1 : 0.7),
                  boxShadow: (isActive || last) ? '0 4px 10px rgba(127,162,116,.35)' : 'none',
                  transition: 'opacity .15s, transform .15s',
                  transform: isActive ? 'translateY(-2px)' : 'none',
                }}/>
                <div style={{
                  width: 18, height: eh, borderRadius: '8px 8px 3px 3px',
                  background: 'var(--coral)',
                  opacity: isActive ? 1 : (last ? 1 : 0.7),
                  boxShadow: (isActive || last) ? '0 4px 10px rgba(229,118,94,.35)' : 'none',
                  transition: 'opacity .15s, transform .15s',
                  transform: isActive ? 'translateY(-2px)' : 'none',
                }}/>
              </div>
              <div style={{
                fontSize: 13, color: (isActive || last) ? 'var(--ink)' : 'var(--ink-3)',
                fontWeight: (isActive || last) ? 700 : 500,
              }}>
                {d.month}{last && <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--coral)' }}>●</span>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="hstack" style={{ gap: 18, justifyContent: 'center', marginTop: 16, fontSize: 14 }}>
        <span className="hstack" style={{ gap: 6, whiteSpace: 'nowrap' }}><span className="cat-dot" style={{ background: 'var(--sage)' }}/>수입</span>
        <span className="hstack" style={{ gap: 6, whiteSpace: 'nowrap' }}><span className="cat-dot" style={{ background: 'var(--coral)' }}/>지출</span>
      </div>
    </div>
  );
};

// 라인+에어리어 트렌드 차트 (터치/호버 툴팁)
const TrendArea = ({ values, labels, color = 'var(--coral)', height = 100, fill = true, currencyMode = 'won' }) => {
  const [active, setActive] = React.useState(null);
  const max = Math.max(...values);
  const w = 280;
  const stepX = w / (values.length - 1);
  const points = values.map((v, i) => [i * stepX, height - (v / max) * (height - 10) - 5]);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const area = `${path} L ${w} ${height} L 0 ${height} Z`;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * w;
    const idx = Math.round(x / stepX);
    setActive(Math.max(0, Math.min(values.length - 1, idx)));
  };
  return (
    <div style={{ position: 'relative' }} onPointerLeave={() => setActive(null)}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}
           preserveAspectRatio="none"
           style={{ cursor: 'crosshair', touchAction: 'none' }}
           onPointerMove={onMove}
           onPointerDown={onMove}>
        {fill && <path d={area} fill={color} opacity="0.12"/>}
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {points.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={active === i ? 5 : 3} fill={color}
                  style={{ transition: 'r .12s' }}/>
        ))}
        <circle cx={points[points.length-1][0]} cy={points[points.length-1][1]} r="9" fill={color} opacity="0.2"/>
        {active != null && (
          <line x1={points[active][0]} x2={points[active][0]} y1={0} y2={height}
                stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.4"/>
        )}
      </svg>
      {active != null && (
        <div style={{
          position: 'absolute',
          left: `${(points[active][0] / w) * 100}%`,
          top: -8, transform: 'translate(-50%, -100%)',
          background: 'var(--ink)', color: '#fff',
          padding: '8px 12px', borderRadius: 10,
          fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
          boxShadow: '0 6px 16px rgba(0,0,0,.2)',
          pointerEvents: 'none', zIndex: 5,
        }}>
          {labels && <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>{labels[active]}</div>}
          <span className="num">{fmt.money(values[active], currencyMode)}</span>
        </div>
      )}
    </div>
  );
};

// 카테고리 가로 막대 (예산 진행률)
const BudgetRow = ({ cat, used, limit, currencyMode = 'won' }) => {
  const c = CATEGORIES[cat];
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  const over = used > limit;
  const tone = over ? 'var(--rose)' : pct > 85 ? 'var(--amber)' : c.color;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="spread">
        <div className="hstack" style={{ gap: 12 }}>
          <CatIcon cat={cat} size="sm"/>
          <div className="vstack" style={{ gap: 2 }}>
            <span style={{ fontWeight: 700 }}>{c.label}</span>
            <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
              {fmt.money(used, currencyMode)} / {fmt.money(limit, currencyMode)}
            </span>
          </div>
        </div>
        <div className={`chip ${over ? 'rose' : pct > 85 ? 'amber' : 'sage'}`}>
          {over ? `${fmt.percent(pct)} 초과` : `${fmt.percent(pct)}`}
        </div>
      </div>
      <div className="bar">
        <span style={{ width: `${Math.min(100, pct)}%`, background: tone }}/>
      </div>
    </div>
  );
};

// 거래 한 줄 (목록용)
const TxRow = ({ tx, currencyMode = 'won', onClick }) => {
  const c = CATEGORIES[tx.cat];
  const m = MEMBERS[tx.member];
  const acct = ACCOUNTS.find(a => a.id === tx.account);
  return (
    <div className="tx-row" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <CatIcon cat={tx.cat} size="sm"/>
      <div className="vstack" style={{ gap: 2, minWidth: 0 }}>
        <span className="tx-title" style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {tx.title}
        </span>
        <span className="tx-meta">
          {c.label} · {m.name} {tx.memo && `· ${tx.memo}`}
        </span>
      </div>
      <span className="tx-bank chip" style={{ background: 'transparent', borderColor: 'var(--border)' }}>
        {acct?.bank || tx.account}
      </span>
      <span className={`tx-amount num ${tx.kind === 'in' ? 'in' : ''}`}>
        {fmt.signed(tx.amount, tx.kind, currencyMode)}
      </span>
    </div>
  );
};

// KPI 카드 (요약용)
const KpiCard = ({ label, value, sub, accent = 'coral', icon, footer }) => (
  <div className="card" style={{ minWidth: 0 }}>
    <div className="spread" style={{ marginBottom: 12, gap: 8 }}>
      <span className="eyebrow" style={{ flex: 1, minWidth: 0 }}>{label}</span>
      {icon && (
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          display: 'grid', placeItems: 'center',
          background: `var(--${accent}-soft)`, color: `var(--${accent})`,
        }}>{icon}</div>
      )}
    </div>
    <div className="big-money" style={{
      color: `var(--${accent === 'coral' ? 'ink' : accent + '-2'})`,
      fontSize: 'clamp(22px, 3vw, 32px)',
    }}>{value}</div>
    {sub && <div style={{ marginTop: 6, fontSize: 14, color: 'var(--ink-2)' }}>{sub}</div>}
    {footer && <div style={{ marginTop: 14 }}>{footer}</div>}
  </div>
);

// 전체 지출 분석: 큰 숫자 + 가로 스택바 + 카테고리 그리드 (홈용)
const TotalExpenseBreakdown = ({ data, currencyMode = 'won', monthLabel = '이번 달' }) => {
  const [active, setActive] = React.useState(null);
  const total = data.reduce((s, d) => s + d.amount, 0);
  return (
    <div>
      {/* 큰 숫자 */}
      <div className="spread" style={{ alignItems: 'flex-end', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>{monthLabel} 전체 지출</div>
          <div className="big-money" style={{ fontSize: 'clamp(28px, 4vw, 40px)', color: 'var(--ink)', whiteSpace: 'nowrap' }}>
            {fmt.money(total, currencyMode)}
          </div>
        </div>
        <div className="hstack" style={{ gap: 14, color: 'var(--ink-2)', fontSize: 14, flexShrink: 0 }}>
          <div className="vstack" style={{ gap: 2, alignItems: 'flex-end' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>카테고리</span>
            <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{data.length}개</span>
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--border)' }}/>
          <div className="vstack" style={{ gap: 2, alignItems: 'flex-end' }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>가장 많이</span>
            <span style={{ fontWeight: 700, color: data[0]?.info.color, whiteSpace: 'nowrap' }}>{data[0]?.info.label}</span>
          </div>
        </div>
      </div>

      {/* 가로 스택바 */}
      <div style={{
        display: 'flex', height: 22, borderRadius: 12, overflow: 'hidden',
        border: '1px solid var(--border)', marginBottom: 16,
      }}
           onPointerLeave={() => setActive(null)}>
        {data.map((d, i) => {
          const pct = total ? (d.amount / total) * 100 : 0;
          const isActive = active === i;
          return (
            <div key={d.cat}
                 onPointerEnter={() => setActive(i)}
                 onPointerDown={() => setActive(i)}
                 style={{
                   width: `${pct}%`,
                   background: d.info.color,
                   borderRight: i < data.length - 1 ? '2px solid var(--surface)' : 'none',
                   opacity: active != null && !isActive ? 0.4 : 1,
                   transition: 'opacity .15s',
                   cursor: 'pointer',
                   position: 'relative',
                 }}>
              {isActive && (
                <div style={{
                  position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--ink)', color: '#fff',
                  padding: '10px 14px', borderRadius: 10,
                  fontSize: 13, whiteSpace: 'nowrap',
                  boxShadow: '0 6px 16px rgba(0,0,0,.2)', zIndex: 5,
                  pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 2 }}>{d.info.label}</div>
                  <div className="num" style={{ fontWeight: 700 }}>
                    {fmt.money(d.amount, currencyMode)} <span style={{ opacity: 0.7, marginLeft: 4 }}>{fmt.percent(pct)}</span>
                  </div>
                  <div style={{
                    position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
                    borderTop: '6px solid var(--ink)',
                  }}/>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 카테고리 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 }}>
        {data.map((d, i) => {
          const pct = total ? (d.amount / total) * 100 : 0;
          return (
            <div key={d.cat}
                 onPointerEnter={() => setActive(i)}
                 onPointerLeave={() => setActive(null)}
                 onPointerDown={() => setActive(i)}
                 style={{
                   padding: '10px 12px',
                   background: active === i ? 'var(--bg-2)' : 'var(--surface-2)',
                   borderRadius: 10, cursor: 'pointer',
                   border: `1px solid ${active === i ? d.info.color : 'transparent'}`,
                   transition: 'all .15s',
                 }}>
              <div className="hstack" style={{ gap: 8, marginBottom: 6, minWidth: 0 }}>
                <span className="cat-dot" style={{ background: d.info.color, width: 10, height: 10, flexShrink: 0 }}/>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.info.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>{fmt.percent(pct)}</span>
              </div>
              <div className="num" style={{ fontWeight: 700, fontSize: 15 }}>
                {fmt.money(d.amount, currencyMode)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

Object.assign(window, {
  Avatar, CatIcon, DonutChart, CatLegend, MonthlyBars, TrendArea,
  BudgetRow, TxRow, KpiCard, TotalExpenseBreakdown,
});
