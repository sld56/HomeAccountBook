import { useState } from 'react';
import { ChartTooltip } from './ChartTooltip';
import { ChartA11yTable } from './ChartA11yTable';
import { fmt } from '@/lib/format';
import { useSettings } from '@/stores/settingsStore';
import { CATEGORIES } from '@/data/categories';
import type { CategoryId } from '@/types/domain';

type Segment = { cat: CategoryId; amount: number; ratio: number };
type Props = { segments: Segment[]; height?: number };

export function StackBar({ segments, height = 22 }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const currency = useSettings((s) => s.currencyMode);
  let acc = 0;
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        height,
        borderRadius: 999,
        overflow: 'hidden',
        background: 'var(--bg-2)',
        gap: 2,
      }}
      role="img"
      aria-label="카테고리별 지출 비율 스택바"
      onPointerLeave={() => setActive(null)}
    >
      <ChartA11yTable
        caption="카테고리별 지출 비율"
        headers={['카테고리', '금액', '비율']}
        rows={segments.map((seg) => [
          CATEGORIES[seg.cat].label,
          fmt.money(seg.amount, currency),
          fmt.percent(seg.ratio * 100, 1),
        ])}
      />
      {segments.map((seg, i) => {
        const widthPct = seg.ratio * 100;
        const cat = CATEGORIES[seg.cat];
        const left = acc;
        acc += widthPct;
        return (
          <div
            key={seg.cat}
            style={{
              width: `${widthPct}%`,
              background: cat.color,
              opacity: active != null && active !== i ? 0.4 : 1,
              cursor: 'pointer',
              transition: 'opacity 0.18s',
            }}
            onPointerEnter={() => setActive(i)}
            onPointerDown={() => setActive(i)}
            title={`${cat.label} ${fmt.percent(widthPct, 1)}`}
            data-left={left}
          />
        );
      })}
      {active != null && segments[active] && (
        <ChartTooltip x={segments.slice(0, active).reduce((s, x) => s + x.ratio * 100, 0) + segments[active].ratio * 50} y={0} containerWidth={100}>
          <div style={{ fontWeight: 700 }}>{CATEGORIES[segments[active].cat].label}</div>
          <div>{fmt.money(segments[active].amount, currency)}</div>
          <div>{fmt.percent(segments[active].ratio * 100, 1)}</div>
        </ChartTooltip>
      )}
    </div>
  );
}
