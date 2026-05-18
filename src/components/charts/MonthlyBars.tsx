import { useState } from 'react';
import { ChartTooltip } from './ChartTooltip';
import { ChartA11yTable } from './ChartA11yTable';
import { fmt } from '@/lib/format';
import { useSettings } from '@/stores/settingsStore';

type Datum = { ym: string; income: number; expense: number };
type Props = { data: Datum[]; height?: number };

export function MonthlyBars({ data, height = 200 }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const currency = useSettings((s) => s.currencyMode);
  if (!data.length) return null;

  const peak = Math.max(...data.map((d) => Math.max(d.income, d.expense)));
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
  const groupWidth = 60;
  const barWidth = 18;
  const gap = 8;
  const padding = 24;
  const width = data.length * groupWidth + padding * 2;
  const innerH = height - 40;

  return (
    <div style={{ position: 'relative', overflowX: 'auto' }}>
      <ChartA11yTable
        caption="월별 수입·지출 비교"
        headers={['월', '수입', '지출', '저축']}
        rows={data.map((d) => [
          fmt.ymLabel(d.ym),
          fmt.money(d.income, currency),
          fmt.money(d.expense, currency),
          fmt.money(d.income - d.expense, currency),
        ])}
      />
      <svg
        width={width}
        height={height}
        style={{ touchAction: 'none', display: 'block' }}
        role="img"
        aria-label="월별 수입·지출 막대 차트"
        onPointerLeave={() => setActive(null)}
      >
        {data.map((d, i) => {
          const cx = padding + i * groupWidth + groupWidth / 2;
          const incomeH = (d.income / max) * innerH;
          const expenseH = (d.expense / max) * innerH;
          const isActive = active === i;
          return (
            <g
              key={d.ym}
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
              style={{ cursor: 'pointer' }}
            >
              {isActive && (
                <rect
                  x={cx - groupWidth / 2 + 4}
                  y={4}
                  width={groupWidth - 8}
                  height={height - 28}
                  fill="var(--bg-2)"
                  rx={8}
                />
              )}
              <rect
                x={cx - barWidth - gap / 2}
                y={innerH - incomeH + 8}
                width={barWidth}
                height={incomeH}
                fill="var(--sage)"
                opacity={isActive || i === data.length - 1 ? 1 : 0.7}
                rx={4}
              />
              <rect
                x={cx + gap / 2}
                y={innerH - expenseH + 8}
                width={barWidth}
                height={expenseH}
                fill="var(--coral)"
                opacity={isActive || i === data.length - 1 ? 1 : 0.7}
                rx={4}
              />
              <text
                x={cx}
                y={height - 8}
                textAnchor="middle"
                fontSize="12"
                fill="var(--ink-3)"
              >
                {fmt.ymLabel(d.ym)}
              </text>
            </g>
          );
        })}
      </svg>
      {active != null && data[active] && (
        <ChartTooltip
          x={padding + active * groupWidth + groupWidth / 2}
          y={innerH + 16}
          containerWidth={width}
        >
          <div style={{ fontWeight: 700 }}>{fmt.ymLabel(data[active].ym)}</div>
          <div>수입: {fmt.money(data[active].income, currency)}</div>
          <div>지출: {fmt.money(data[active].expense, currency)}</div>
          <div style={{ borderTop: '1px solid #555', marginTop: 6, paddingTop: 6 }}>
            저축: {fmt.money(data[active].income - data[active].expense, currency)}
          </div>
        </ChartTooltip>
      )}
    </div>
  );
}
