// 메인 앱 — 사이드바, 라우팅, Tweaks 패널

const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dashboardLayout": "card",
  "fontSize": 17,
  "currencyMode": "won",
  "hiContrast": false,
  "accentPalette": ["#E5765E", "#7FA274", "#6E94C0"]
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState('dashboard'); // dashboard | tx | budget | settings
  const [member, setMember] = useState('all');
  const [adding, setAdding] = useState(false);
  const [txOverrides, setTxOverrides] = useState([]); // 새로 추가된 거래

  // Tweak에서 직접 변경 가능한 값들도 별도 상태로 (설정 화면에서 변경)
  const currencyMode = t.currencyMode;
  const setCurrencyMode = v => setTweak('currencyMode', v);
  const fontSize = t.fontSize;
  const setFontSize = v => setTweak('fontSize', v);
  const hiContrast = t.hiContrast;
  const setHiContrast = v => setTweak('hiContrast', v);

  useEffect(() => {
    document.documentElement.style.setProperty('--fs-base', fontSize + 'px');
    document.body.style.fontSize = fontSize + 'px';
  }, [fontSize]);

  useEffect(() => {
    document.body.classList.toggle('hi-contrast', hiContrast);
  }, [hiContrast]);

  // 강조 색상 — 팔레트의 첫 번째 색을 코랄 변수에 매핑
  useEffect(() => {
    const [primary, secondary, tertiary] = t.accentPalette || [];
    if (primary) {
      document.documentElement.style.setProperty('--coral', primary);
      document.documentElement.style.setProperty('--coral-2', shade(primary, -0.15));
      document.documentElement.style.setProperty('--coral-soft', tint(primary, 0.78));
    }
  }, [JSON.stringify(t.accentPalette)]);

  const onSaveTx = (tx) => setTxOverrides(arr => [tx, ...arr]);

  // TX에 새로 추가된 거래 합치기 (window.TX를 직접 수정하지 않고 새 배열 노출)
  useEffect(() => {
    window.__TX_ORIG = window.__TX_ORIG || TX.slice();
    window.TX = [...txOverrides, ...window.__TX_ORIG];
  }, [txOverrides]);

  const DashboardComp =
    t.dashboardLayout === 'big'    ? DashboardBigNumber :
    t.dashboardLayout === 'family' ? DashboardFamily   :
    DashboardCardGrid;

  const greeting = (() => {
    const h = new Date().getHours();
    const period = h < 12 ? '좋은 아침이에요' : h < 18 ? '안녕하세요' : '편안한 저녁이에요';
    return `${period}, 우리집 가계부에 오신 걸 환영합니다`;
  })();

  return (
    <div className="app" data-screen-label="가계부 앱">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Icons.piggy size={22}/>
          </div>
          <div>
            <div className="brand-name">우리집 가계부</div>
            <div className="brand-sub">2026년 5월</div>
          </div>
        </div>

        <NavItem icon={<Icons.home size={20}/>} active={route === 'dashboard'} onClick={() => setRoute('dashboard')}>홈</NavItem>
        <NavItem icon={<Icons.list size={20}/>} active={route === 'tx'} onClick={() => setRoute('tx')}>거래 내역</NavItem>
        <NavItem icon={<Icons.chart size={20}/>} active={route === 'report'} onClick={() => setRoute('report')}>리포트</NavItem>
        <NavItem icon={<Icons.goal size={20}/>} active={route === 'budget'} onClick={() => setRoute('budget')}>예산 · 목표</NavItem>
        <NavItem icon={<Icons.settings size={20}/>} active={route === 'settings'} onClick={() => setRoute('settings')}>설정</NavItem>

        <div style={{ marginTop: 14 }}>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setAdding(true)}>
            <Icons.plus size={18}/> 새 거래 입력
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="eyebrow" style={{ marginBottom: 10 }}>가족 보기</div>
          <MemberSwitcher value={member} onChange={setMember}/>
        </div>
      </aside>

      <main className="main">
        {route === 'dashboard' && (
          <>
            <div className="page-header">
              <div>
                <h1>홈</h1>
                <p className="greet">{greeting}</p>
              </div>
              <div className="hstack" style={{ gap: 10 }}>
                <MemberPills value={member} onChange={setMember}/>
              </div>
            </div>
            <DashboardComp currencyMode={currencyMode} member={member}/>
          </>
        )}

        {route === 'tx' && (
          <TransactionsScreen currencyMode={currencyMode} member={member} openAdd={() => setAdding(true)}/>
        )}

        {route === 'budget' && <BudgetScreen currencyMode={currencyMode}/>}

        {route === 'report' && <ReportScreen currencyMode={currencyMode}/>}

        {route === 'settings' && (
          <SettingsScreen
            currencyMode={currencyMode} setCurrencyMode={setCurrencyMode}
            fontSize={fontSize} setFontSize={setFontSize}
            hiContrast={hiContrast} setHiContrast={setHiContrast}
          />
        )}
      </main>

      <AddTransactionModal
        open={adding}
        onClose={() => setAdding(false)}
        currencyMode={currencyMode}
        onSave={onSaveTx}
        defaultMember={member === 'all' ? 'eomma' : member}
      />

      <TweaksPanel title="Tweaks">
        <TweakSection label="대시보드 레이아웃" />
        <TweakRadio label="레이아웃" value={t.dashboardLayout}
          options={[
            { value: 'card',   label: '카드 그리드' },
            { value: 'big',    label: '큰 숫자' },
            { value: 'family', label: '가족 중심' },
          ]}
          onChange={v => setTweak('dashboardLayout', v)}/>

        <TweakSection label="가독성" />
        <TweakSlider label="기본 글자 크기" value={fontSize} min={15} max={22} unit="px"
          onChange={v => setTweak('fontSize', v)}/>
        <TweakToggle label="고대비 모드" value={hiContrast}
          onChange={v => setTweak('hiContrast', v)}/>

        <TweakSection label="강조 색상" />
        <TweakColor label="팔레트" value={t.accentPalette}
          options={[
            ['#E5765E', '#7FA274', '#6E94C0'],
            ['#D45F45', '#5F8657', '#3e6593'],
            ['#9B8AC2', '#7FA274', '#D4A656'],
            ['#C25A5A', '#D4A656', '#6E94C0'],
            ['#5F8657', '#E5765E', '#9B8AC2'],
          ]}
          onChange={v => setTweak('accentPalette', v)}/>

        <TweakSection label="금액 표시" />
        <TweakSelect label="형식" value={currencyMode}
          options={[
            { value: 'won', label: '1,234,567원' },
            { value: 'symbol', label: '₩1,234,567' },
            { value: 'korean', label: '123만 4,567원' },
          ]}
          onChange={v => setTweak('currencyMode', v)}/>
      </TweaksPanel>
    </div>
  );
}

function NavItem({ icon, active, children, onClick }) {
  return (
    <div className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="ic">{icon}</span>
      <span className="label">{children}</span>
    </div>
  );
}

function MemberSwitcher({ value, onChange }) {
  const all = [{ id: 'all', name: '가족 전체', short: '全', color: 'fam-all', role: '' }, ...Object.values(MEMBERS)];
  return (
    <div className="stack" style={{ gap: 6 }}>
      {all.map(m => (
        <button key={m.id} onClick={() => onChange(m.id)} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px', borderRadius: 10,
          background: value === m.id ? 'var(--coral-soft)' : 'transparent',
          border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', color: 'inherit', textAlign: 'left',
          fontWeight: value === m.id ? 700 : 500,
          fontSize: 14,
        }}>
          <div className={`avatar sm ${m.color}`}>{m.short}</div>
          <span style={{ whiteSpace: 'nowrap' }}>{m.name}</span>
        </button>
      ))}
    </div>
  );
}

function MemberPills({ value, onChange }) {
  const all = [{ id: 'all', name: '전체', short: '全', color: 'fam-all' }, ...Object.values(MEMBERS)];
  return (
    <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
      {all.map(m => (
        <button key={m.id} onClick={() => onChange(m.id)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px 8px 8px',
          borderRadius: 999,
          background: value === m.id ? 'var(--coral)' : 'var(--surface)',
          border: `1px solid ${value === m.id ? 'var(--coral)' : 'var(--border)'}`,
          color: value === m.id ? '#fff' : 'var(--ink-2)',
          cursor: 'pointer', fontFamily: 'inherit',
          fontWeight: value === m.id ? 700 : 500,
          fontSize: 14,
          transition: 'all .15s',
        }}>
          <div className={`avatar sm ${m.color}`} style={{ width: 26, height: 26, fontSize: 11 }}>{m.short}</div>
          <span style={{ whiteSpace: 'nowrap' }}>{m.name}</span>
        </button>
      ))}
    </div>
  );
}

// 색상 헬퍼 (밝게/어둡게)
function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (pct < 0) {
    r = Math.round(r * (1 + pct));
    g = Math.round(g * (1 + pct));
    b = Math.round(b * (1 + pct));
  } else {
    r = Math.round(r + (255 - r) * pct);
    g = Math.round(g + (255 - g) * pct);
    b = Math.round(b + (255 - b) * pct);
  }
  return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
}
function tint(hex, pct) { return shade(hex, pct); }

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
