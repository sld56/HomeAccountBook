// 거래 내역, 입력, 예산, 설정 화면

const { useState: useStateScreens } = React;

// ───────── 거래 내역 ─────────
function TransactionsScreen({ currencyMode, member, openAdd }) {
  const [filter, setFilter] = useStateScreens('all'); // all | in | out
  const [catFilter, setCatFilter] = useStateScreens('all');
  const [search, setSearch] = useStateScreens('');

  let txs = member === 'all' ? TX : TX.filter(t => t.member === member);
  if (filter !== 'all') txs = txs.filter(t => t.kind === filter);
  if (catFilter !== 'all') txs = txs.filter(t => t.cat === catFilter);
  if (search) txs = txs.filter(t =>
    t.title.includes(search) || (t.memo || '').includes(search)
  );

  const grouped = stats.groupByDate(txs);
  const totalIn  = txs.filter(t => t.kind === 'in').reduce((s,t)=>s+t.amount,0);
  const totalOut = txs.filter(t => t.kind === 'out').reduce((s,t)=>s+t.amount,0);

  return (
    <div className="stack-lg stack">
      <div className="page-header">
        <div>
          <h1>거래 내역</h1>
          <p className="greet">2026년 5월 · 총 {txs.length}건</p>
        </div>
        <div className="hstack" style={{ gap: 10 }}>
          <button className="btn">
            <Icons.cal size={18}/> 5월
          </button>
          <button className="btn btn-primary btn-lg" onClick={openAdd}>
            <Icons.plus size={20}/> 새 거래 입력
          </button>
        </div>
      </div>

      {/* 검색 + 필터 + 합계 */}
      <div className="card">
        <div className="hstack" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className="hstack" style={{
            gap: 8, padding: '10px 14px', background: 'var(--bg-2)',
            borderRadius: 12, flex: '1 1 240px', minWidth: 0,
          }}>
            <Icons.search size={18} style={{ color: 'var(--ink-3)' }}/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="제목, 메모 검색"
              style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: 15, color: 'var(--ink)' }}
            />
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            {[
              { v: 'all', l: '전체' },
              { v: 'out', l: '지출' },
              { v: 'in',  l: '수입' },
            ].map(o => (
              <button key={o.v} className={`btn ${filter === o.v ? 'btn-primary' : ''}`}
                onClick={() => setFilter(o.v)}>{o.l}</button>
            ))}
          </div>
        </div>

        <div className="divider"/>
        <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className={`chip ${catFilter === 'all' ? 'coral' : ''}`}
            style={{ cursor: 'pointer' }} onClick={() => setCatFilter('all')}>모든 카테고리</span>
          {Object.values(CATEGORIES).filter(c => !['salary','pension','side'].includes(c.id)).map(c => (
            <span key={c.id} className={`chip ${catFilter === c.id ? 'coral' : ''}`}
              style={{ cursor: 'pointer' }} onClick={() => setCatFilter(c.id)}>
              <span className="cat-dot" style={{ background: c.color }}/> {c.label}
            </span>
          ))}
        </div>

        <div className="divider"/>
        <div className="hstack" style={{ gap: 24 }}>
          <div>
            <div className="eyebrow">기간 수입</div>
            <div className="num bold" style={{ color: 'var(--sage-2)', fontSize: 22, marginTop: 4 }}>
              +{fmt.money(totalIn, currencyMode)}
            </div>
          </div>
          <div className="divider-y" style={{ width: 1, background: 'var(--border)' }}/>
          <div>
            <div className="eyebrow">기간 지출</div>
            <div className="num bold" style={{ color: 'var(--coral-2)', fontSize: 22, marginTop: 4 }}>
              −{fmt.money(totalOut, currencyMode)}
            </div>
          </div>
          <div className="divider-y" style={{ width: 1, background: 'var(--border)' }}/>
          <div>
            <div className="eyebrow">잔액</div>
            <div className="num bold" style={{ fontSize: 22, marginTop: 4 }}>
              {fmt.money(totalIn - totalOut, currencyMode)}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        {grouped.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-3)' }}>
            해당 조건의 거래가 없어요.
          </div>
        )}
        {grouped.map(g => (
          <div key={g.date}>
            <div className="tx-day-head">
              <span>{fmt.dateLong(g.date)}</span>
              <span className="num">
                {g.totalIn > 0 && <span style={{ color: 'var(--sage-2)', marginRight: 12 }}>+{fmt.short(g.totalIn)}</span>}
                <span style={{ color: 'var(--ink-2)' }}>−{fmt.short(g.totalOut)}</span>
              </span>
            </div>
            <div className="tx-list">
              {g.items.map(t => <TxRow key={t.id} tx={t} currencyMode={currencyMode}/>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────── 거래 입력 (모달) ─────────
function AddTransactionModal({ open, onClose, currencyMode, onSave, defaultMember }) {
  const [kind, setKind] = useStateScreens('out');
  const [amount, setAmount] = useStateScreens('');
  const [cat, setCat] = useStateScreens('food');
  const [title, setTitle] = useStateScreens('');
  const [memo, setMemo] = useStateScreens('');
  const [member, setMember] = useStateScreens(defaultMember || 'eomma');
  const [account, setAccount] = useStateScreens('a5');
  const [date, setDate] = useStateScreens('2026-05-12');

  if (!open) return null;

  const expenseCats = ['food','transport','medical','utility','leisure','shopping','edu','other'];
  const incomeCats  = ['salary','pension','side','other'];
  const cats = kind === 'in' ? incomeCats : expenseCats;

  const reset = () => {
    setAmount(''); setTitle(''); setMemo('');
  };

  const submit = () => {
    if (!amount || !title) return;
    onSave({
      id: 't' + Math.random().toString(36).slice(2, 8),
      date, kind, amount: parseInt(amount, 10),
      cat, title, memo, member, account,
    });
    reset();
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(42,37,33,0.45)',
      display: 'grid', placeItems: 'center',
      padding: 24, backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div className="card card-lg" style={{
        width: 'min(560px, 100%)', maxHeight: '92vh', overflow: 'auto',
        boxShadow: 'var(--shadow-lg)', padding: 32,
      }} onClick={e => e.stopPropagation()}>
        <div className="spread" style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, whiteSpace: 'nowrap' }}>새 거래 입력</h2>
          <button className="btn-ghost btn" onClick={onClose} style={{ padding: 8 }}>
            <Icons.close size={22}/>
          </button>
        </div>

        {/* 수입/지출 토글 */}
        <div className="hstack" style={{
          background: 'var(--bg-2)', padding: 4, borderRadius: 14, marginBottom: 22,
        }}>
          {[
            { v: 'out', l: '지출', c: 'var(--coral)' },
            { v: 'in',  l: '수입', c: 'var(--sage)' },
          ].map(o => (
            <button key={o.v}
              onClick={() => { setKind(o.v); setCat(o.v === 'in' ? 'salary' : 'food'); }}
              style={{
                flex: 1, padding: '12px 16px',
                background: kind === o.v ? o.c : 'transparent',
                color: kind === o.v ? '#fff' : 'var(--ink-2)',
                border: 'none', borderRadius: 12,
                fontWeight: 700, fontSize: 16, cursor: 'pointer',
                transition: 'all .15s',
              }}>{o.l}</button>
          ))}
        </div>

        {/* 금액 */}
        <div className="field" style={{ marginBottom: 22 }}>
          <label className="field-label">얼마</label>
          <div style={{ position: 'relative' }}>
            <input
              className="input amount"
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={amount ? parseInt(amount, 10).toLocaleString('ko-KR') : ''}
              onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
            />
            <span style={{
              position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--ink-3)', fontSize: 20, fontWeight: 600,
            }}>원</span>
          </div>
        </div>

        {/* 카테고리 */}
        <div className="field" style={{ marginBottom: 22 }}>
          <label className="field-label">카테고리</label>
          <div className="tile-grid">
            {cats.map(cid => {
              const c = CATEGORIES[cid];
              const sel = cat === cid;
              return (
                <button key={cid} className={`tile ${sel ? 'selected' : ''}`} onClick={() => setCat(cid)}>
                  <div className="tile-ic" style={{ background: c.color }}>
                    <span style={{ fontSize: 22 }}>{c.emoji}</span>
                  </div>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 제목 */}
        <div className="field" style={{ marginBottom: 16 }}>
          <label className="field-label">어디서 / 무엇</label>
          <input className="input" placeholder="예: 동네 마트, 약국 등"
            value={title} onChange={e => setTitle(e.target.value)}/>
        </div>

        {/* 메모 */}
        <div className="field" style={{ marginBottom: 22 }}>
          <label className="field-label">메모 <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(선택)</span></label>
          <textarea className="textarea" placeholder="기억할 내용을 적어두세요"
            value={memo} onChange={e => setMemo(e.target.value)}/>
        </div>

        {/* 누가 / 결제수단 / 날짜 */}
        <div className="row cols-2" style={{ marginBottom: 22 }}>
          <div className="field">
            <label className="field-label">누가</label>
            <select className="select" value={member} onChange={e => setMember(e.target.value)}>
              {Object.values(MEMBERS).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">결제 수단</label>
            <select className="select" value={account} onChange={e => setAccount(e.target.value)}>
              {ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 28 }}>
          <label className="field-label">언제</label>
          <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)}/>
        </div>

        <div className="hstack" style={{ gap: 10 }}>
          <button className="btn btn-lg" style={{ flex: 1 }} onClick={onClose}>취소</button>
          <button className="btn btn-primary btn-lg" style={{ flex: 2 }} onClick={submit}>
            <Icons.check size={20}/> 저장하기
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────── 예산 화면 ─────────
function BudgetScreen({ currencyMode }) {
  const cats = stats.byCategory(TX, 'out');
  const usedByCat = Object.fromEntries(cats.map(c => [c.cat, c.amount]));
  const totalBudget = BUDGETS.reduce((s, b) => s + b.limit, 0);
  const totalUsed = BUDGETS.reduce((s, b) => s + (usedByCat[b.cat] || 0), 0);
  const pct = (totalUsed / totalBudget) * 100;

  return (
    <div className="stack-lg stack">
      <div className="page-header">
        <div>
          <h1>예산</h1>
          <p className="greet">2026년 5월 · 12일 진행</p>
        </div>
        <button className="btn">
          <Icons.pencil size={18}/> 예산 수정
        </button>
      </div>

      <div className="card card-lg" style={{ background: 'linear-gradient(135deg, #FBF1E5 0%, #E4EEDC 100%)', border: 'none' }}>
        <div className="spread" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div className="eyebrow">5월 예산 사용</div>
            <div className="big-money" style={{ fontSize: 42, marginTop: 4 }}>
              {fmt.money(totalUsed, currencyMode)}
            </div>
            <div style={{ color: 'var(--ink-2)', marginTop: 4 }}>
              총 예산 <b className="num">{fmt.money(totalBudget, currencyMode)}</b> 중 사용
            </div>
          </div>
          <div style={{ minWidth: 240 }}>
            <div className="spread" style={{ marginBottom: 6 }}>
              <span className="eyebrow">사용률</span>
              <span className="num bold" style={{ fontSize: 22 }}>{fmt.percent(pct)}</span>
            </div>
            <div className="bar thick" style={{ background: 'rgba(255,255,255,0.6)' }}>
              <span style={{ width: `${pct}%`, background: 'var(--sage)' }}/>
            </div>
            <div className="hstack" style={{ justifyContent: 'space-between', marginTop: 8, fontSize: 13, color: 'var(--ink-2)' }}>
              <span>잘 쓰고 계세요</span>
              <span>남은 예산 <b className="num">{fmt.money(totalBudget - totalUsed, currencyMode)}</b></span>
            </div>
          </div>
        </div>
      </div>

      <div className="card card-lg">
        <div className="card-title">카테고리별 예산</div>
        <div className="stack-lg stack">
          {BUDGETS.map(b => (
            <BudgetRow key={b.cat} cat={b.cat} used={usedByCat[b.cat] || 0} limit={b.limit} currencyMode={currencyMode}/>
          ))}
        </div>
      </div>

      <div className="card card-lg">
        <div className="card-title">저축 목표</div>
        <div className="stack-lg stack">
          {GOALS.map(g => {
            const pct2 = (g.saved / g.target) * 100;
            return (
              <div key={g.id} className="spread" style={{ alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div className="hstack" style={{ gap: 16, flex: '1 1 240px', minWidth: 0 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16, background: g.color,
                    display: 'grid', placeItems: 'center', color: '#fff',
                  }}>
                    <Icons.piggy size={26}/>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{g.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>
                      매달 {fmt.money(g.monthly, currencyMode)} 저축
                    </div>
                  </div>
                </div>
                <div style={{ flex: '2 1 320px' }}>
                  <div className="spread" style={{ marginBottom: 6 }}>
                    <span className="num" style={{ fontWeight: 700 }}>{fmt.money(g.saved, currencyMode)}</span>
                    <span style={{ color: 'var(--ink-3)' }}>목표 {fmt.money(g.target, currencyMode)}</span>
                  </div>
                  <div className="bar thick">
                    <span style={{ width: `${pct2}%`, background: g.color }}/>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: 'var(--ink-2)' }}>
                    {fmt.percent(pct2)} 달성
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ───────── 설정 화면 ─────────
function SettingsScreen({ currencyMode, setCurrencyMode, fontSize, setFontSize, hiContrast, setHiContrast }) {
  return (
    <div className="stack-lg stack" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <h1>설정</h1>
          <p className="greet">화면과 표시 방식을 바꿀 수 있어요</p>
        </div>
      </div>

      <div className="card card-lg">
        <div className="card-title">화면 보기</div>
        <div className="stack-lg stack">
          <div className="field">
            <label className="field-label">글자 크기</label>
            <div className="hstack" style={{ gap: 10 }}>
              {[
                { v: 16, l: '보통', sz: 14 },
                { v: 18, l: '크게', sz: 16 },
                { v: 20, l: '아주 크게', sz: 18 },
              ].map(o => (
                <button key={o.v}
                  className={`btn ${fontSize === o.v ? 'btn-primary' : ''}`}
                  style={{ flex: 1, fontSize: o.sz, padding: '14px 16px' }}
                  onClick={() => setFontSize(o.v)}>
                  가 {o.l}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="field-label">고대비 모드 (글자가 더 선명하게)</label>
            <button
              className={`btn ${hiContrast ? 'btn-primary' : ''}`}
              onClick={() => setHiContrast(!hiContrast)}
              style={{ alignSelf: 'flex-start' }}>
              {hiContrast ? <><Icons.check size={18}/> 켜짐</> : '꺼짐'}
            </button>
          </div>
        </div>
      </div>

      <div className="card card-lg">
        <div className="card-title">금액 표시 방식</div>
        <div className="stack" style={{ gap: 10 }}>
          {[
            { v: 'won', l: '1,234,567원', s: '한국식 (기본)' },
            { v: 'symbol', l: '₩1,234,567', s: '원화 기호' },
            { v: 'korean', l: '123만 4,567원', s: '읽기 쉬운 한글' },
          ].map(o => (
            <button key={o.v}
              onClick={() => setCurrencyMode(o.v)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '16px 20px',
                background: currencyMode === o.v ? 'var(--coral-soft)' : 'var(--surface-2)',
                border: `1.5px solid ${currencyMode === o.v ? 'var(--coral)' : 'var(--border)'}`,
                borderRadius: 14, cursor: 'pointer',
                fontFamily: 'inherit', color: 'var(--ink)',
              }}>
              <div className="vstack" style={{ gap: 2, alignItems: 'flex-start' }}>
                <span className="num bold" style={{ fontSize: 19 }}>{o.l}</span>
                <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{o.s}</span>
              </div>
              {currencyMode === o.v && <Icons.check size={22} style={{ color: 'var(--coral-2)' }}/>}
            </button>
          ))}
        </div>
      </div>

      <div className="card card-lg">
        <div className="card-title">가족 구성원</div>
        <div className="stack" style={{ gap: 10 }}>
          {Object.values(MEMBERS).map(m => (
            <div key={m.id} className="spread" style={{ padding: 8 }}>
              <div className="hstack" style={{ gap: 14 }}>
                <Avatar member={m.id} size="lg"/>
                <div className="vstack" style={{ gap: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 17 }}>{m.name}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{m.role}</span>
                </div>
              </div>
              <button className="btn btn-sm">관리</button>
            </div>
          ))}
          <button className="btn" style={{ marginTop: 6 }}>
            <Icons.plus size={18}/> 가족 추가
          </button>
        </div>
      </div>
    </div>
  );
}

window.TransactionsScreen = TransactionsScreen;
window.AddTransactionModal = AddTransactionModal;
window.BudgetScreen = BudgetScreen;
window.SettingsScreen = SettingsScreen;
