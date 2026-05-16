import { useState } from 'react';
import { useSettings, PALETTES, type PaletteKey } from '@/stores/settingsStore';
import type { CurrencyMode, DashboardLayout } from '@/types/domain';
import './TweaksPanel.css';

const LAYOUTS: { key: DashboardLayout; label: string }[] = [
  { key: 'card', label: '카드형' },
  { key: 'big', label: '큰 숫자' },
  { key: 'family', label: '가족 중심' },
];

const CURRENCIES: { key: CurrencyMode; label: string }[] = [
  { key: 'won', label: '1,234,567원' },
  { key: 'symbol', label: '₩1,234,567' },
  { key: 'korean', label: '123만 4,567원' },
];

export function TweaksPanel() {
  const [open, setOpen] = useState(false);
  const fontSize = useSettings((s) => s.fontSize);
  const setFontSize = useSettings((s) => s.setFontSize);
  const hiContrast = useSettings((s) => s.hiContrast);
  const toggleHiContrast = useSettings((s) => s.toggleHiContrast);
  const palette = useSettings((s) => s.palette);
  const setPalette = useSettings((s) => s.setPalette);
  const dashboardLayout = useSettings((s) => s.dashboardLayout);
  const setDashboardLayout = useSettings((s) => s.setDashboardLayout);
  const currencyMode = useSettings((s) => s.currencyMode);
  const setCurrencyMode = useSettings((s) => s.setCurrencyMode);

  return (
    <>
      <button
        className="tweaks-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="tweaks-panel"
        title="Tweaks 패널 (개발용)"
      >
        {open ? '✕' : '⚙'}
      </button>
      {open && (
        <aside
          id="tweaks-panel"
          className="tweaks-panel"
          role="region"
          aria-label="Tweaks (디자인 검토)"
        >
          <header className="tweaks-header">
            <h2>Tweaks</h2>
            <span className="tweaks-meta">개발/QA 전용</span>
          </header>

          <section className="tweaks-section">
            <div className="tweaks-section-title">대시보드 레이아웃</div>
            <div className="tweaks-options">
              {LAYOUTS.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  className={`tweaks-pill ${dashboardLayout === l.key ? 'is-active' : ''}`}
                  onClick={() => setDashboardLayout(l.key)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </section>

          <section className="tweaks-section">
            <div className="tweaks-section-title">
              본문 글자 크기
              <span className="tweaks-section-value num">{fontSize}px</span>
            </div>
            <input
              type="range"
              min={15}
              max={22}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="tweaks-slider"
              aria-label="본문 글자 크기"
            />
          </section>

          <section className="tweaks-section">
            <div className="tweaks-section-title">고대비 모드</div>
            <button
              type="button"
              className={`tweaks-pill ${hiContrast ? 'is-active' : ''}`}
              onClick={toggleHiContrast}
            >
              {hiContrast ? '✓ 켜짐' : '꺼짐'}
            </button>
          </section>

          <section className="tweaks-section">
            <div className="tweaks-section-title">컬러 팔레트</div>
            <div className="tweaks-palettes">
              {PALETTES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`tweaks-palette ${palette === p.key ? 'is-active' : ''}`}
                  onClick={() => setPalette(p.key as PaletteKey)}
                  aria-pressed={palette === p.key}
                  title={p.label}
                >
                  <span className="tweaks-palette-swatches">
                    {p.swatch.map((c) => (
                      <span key={c} style={{ background: c }} />
                    ))}
                  </span>
                  <span className="tweaks-palette-label">{p.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="tweaks-section">
            <div className="tweaks-section-title">금액 표시</div>
            <div className="tweaks-options">
              {CURRENCIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`tweaks-pill ${currencyMode === c.key ? 'is-active' : ''}`}
                  onClick={() => setCurrencyMode(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </section>
        </aside>
      )}
    </>
  );
}
