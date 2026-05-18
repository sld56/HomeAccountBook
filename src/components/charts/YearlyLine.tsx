import { useState } from 'react';
import { ChartTooltip } from './ChartTooltip';
import { ChartA11yTable } from './ChartA11yTable';
import { fmt } from '@/lib/format';
import { useSettings } from '@/stores/settingsStore';

type Datum = { ym: string; income: number; expense: number };
type Props = { data: Datum[]; height?: number };

export function YearlyLine({ data, height = 280 }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const currency = useSettings((s) => s.currencyMode);
  if (!data.length) return null;

  const width = Math.max(640, data.length * 70);
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const peak = Math.max(...data.flatMap((d) => [d.income, d.expense]));
  if (peak === 0) {
    return (
      <div
        style={{
          height,
          display: 'grid',
          placeItems: 'center',
          color: 'var(--ink-3)',
        }}
        className="meta"
      >
        아직 거래가 없어요
      </div>
    );
  }
  const max = peak * 1.1;
  const x = (i: number) =>
    padding.left + (i / Math.max(1, data.length - 1)) * innerW;
  const y = (v: number) => padding.top + innerH - (v / max) * innerH;

  const incomePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.income)}`)
    .join(' ');
  const expensePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(d.expense)}`)
    .join(' ');
  const incomeArea = `${incomePath} L ${x(data.length - 1)} ${padding.top + innerH} L ${x(0)} ${padding.top + innerH} Z`;
  const expenseArea = `${expensePath} L ${x(data.length - 1)} ${padding.top + innerH} L ${x(0)} ${padding.top + innerH} Z`;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.round(((px - padding.left) / innerW) * (data.length - 1));
    if (idx >= 0 && idx < data.length) setActive(idx);
  };

  return (
    <div style={{ position: 'relative', overflowX: 'auto' }}>
      <ChartA11yTable
        caption="월별 수입·지출 라인 차트"
        headers={['월', '수입', '지출']}
        rows={data.map((d) => [
          fmt.ymLabel(d.ym),
          fmt.money(d.income, currency),
          fmt.money(d.expense, currency),
        ])}
      />
      <svg
        width={width}
        height={height}
        style={{ touchAction: 'none', display: 'block' }}
        role="img"
        aria-label="월별 수입·지출 라인 차트"
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setActive(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <line
            key={g}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * g}
            y2={padding.top + innerH * g}
            stroke="var(--border)"
            strokeDasharray="2 4"
          />
        ))}
        <path d={incomeArea} fill="var(--sage)" opacity={0.12} />
        <path d={expenseArea} fill="var(--coral)" opacity={0.12} />
        <path d={incomePath} fill="none" stroke="var(--sage)" strokeWidth={2.5} />
        <path d={expensePath} fill="none" stroke="var(--coral)" strokeWidth={2.5} />
        {data.map((d, i) => (
          <g key={d.ym}>
            <text
              x={x(i)}
              y={height - 16}
              textAnchor="middle"
              fontSize={11}
              fill="var(--ink-3)"
            >
              {Number(d.ym.split('-')[1])}월
            </text>
            <circle cx={x(i)} cy={y(d.income)} r={active === i ? 6 : 3} fill="var(--sage)" />
            <circle cx={x(i)} cy={y(d.expense)} r={active === i ? 6 : 3} fill="var(--coral)" />
          </g>
        ))}
        {active != null && (
          <line
            x1={x(active)}
            x2={x(active)}
            y1={padding.top}
            y2={padding.top + innerH}
            stroke="var(--ink-3)"
            strokeDasharray="2 4"
          />
        )}
      </svg>
      {active != null && data[active] && (
        <ChartTooltip x={x(active)} y={y(Math.max(data[active].income, data[active].expense))} containerWidth={width}>
          <div style={{ fontWeight: 700 }}>{fmt.ymLabel(data[active].ym)}</div>
          <div>수입: {fmt.money(data[active].income, currency)}</div>
          <div>지출: {fmt.money(data[active].expense, currency)}</div>
        </ChartTooltip>
      )}
    </div>
  );
}
