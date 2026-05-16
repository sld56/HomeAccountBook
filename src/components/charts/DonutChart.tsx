import { useState } from 'react';
import { fmt } from '@/lib/format';
import { useSettings } from '@/stores/settingsStore';
import { CATEGORIES } from '@/data/categories';
import { ChartA11yTable } from './ChartA11yTable';
import type { CategoryId } from '@/types/domain';

type Segment = { cat: CategoryId; amount: number; ratio: number };
type Props = { segments: Segment[]; size?: number };

export function DonutChart({ segments, size = 260 }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const currency = useSettings((s) => s.currencyMode);
  const total = segments.reduce((s, x) => s + x.amount, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 16;
  const stroke = active != null ? 30 : 26;
  const circ = 2 * Math.PI * r;

  let acc = 0;
  const paths = segments.map((seg, i) => {
    const len = seg.ratio * circ;
    const dasharray = `${len} ${circ - len}`;
    const dashoffset = -acc;
    acc += len;
    const cat = CATEGORIES[seg.cat];
    const isActive = active === i;
    return {
      seg,
      cat,
      dasharray,
      dashoffset,
      isActive,
      idx: i,
    };
  });

  const activeSeg = active != null ? segments[active] : null;
  const activeCat = activeSeg ? CATEGORIES[activeSeg.cat] : null;

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <ChartA11yTable
        caption="카테고리별 지출 도넛 차트"
        headers={['카테고리', '금액', '비율']}
        rows={segments.map((seg) => [
          CATEGORIES[seg.cat].label,
          fmt.money(seg.amount, currency),
          fmt.percent(seg.ratio * 100, 1),
        ])}
      />
      <svg width={size} height={size} style={{ touchAction: 'none' }} role="img" aria-label="카테고리별 지출 도넛 차트">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--bg-2)"
          strokeWidth={26}
        />
        {paths.map((p) => (
          <circle
            key={p.seg.cat}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={p.cat.color}
            strokeWidth={p.isActive ? stroke : 26}
            strokeDasharray={p.dasharray}
            strokeDashoffset={p.dashoffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            opacity={active != null && !p.isActive ? 0.45 : 1}
            onPointerEnter={() => setActive(p.idx)}
            onPointerDown={() => setActive(p.idx)}
            onPointerLeave={() => setActive(null)}
            style={{ cursor: 'pointer', transition: 'all 0.18s' }}
          />
        ))}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div>
          {activeSeg && activeCat ? (
            <>
              <div className="meta">{activeCat.label}</div>
              <div className="big-money num" style={{ marginTop: 4 }}>
                {fmt.money(activeSeg.amount, currency)}
              </div>
              <div className="meta">{fmt.percent(activeSeg.ratio * 100, 1)}</div>
            </>
          ) : (
            <>
              <div className="meta">전체 지출</div>
              <div className="big-money num" style={{ marginTop: 4 }}>
                {fmt.money(total, currency)}
              </div>
              <div className="meta muted">조각을 눌러보세요</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
