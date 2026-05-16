import { fmt } from '@/lib/format';
import { useSettings } from '@/stores/settingsStore';
import { CATEGORIES } from '@/data/categories';
import { Card } from '@/components/ui/Card';
import { StackBar } from '@/components/charts/StackBar';
import type { CategoryTotal } from '@/lib/stats';

type Props = {
  total: number;
  segments: CategoryTotal[];
  monthLabel: string;
  ytdChange?: { value: number; direction: 'up' | 'down' };
};

export function TotalExpenseBreakdown({ total, segments, monthLabel, ytdChange }: Props) {
  const currency = useSettings((s) => s.currencyMode);
  return (
    <Card size="lg" className="stack">
      <div className="between">
        <div>
          <div className="meta">{monthLabel} 전체 지출</div>
          <div className="hero-money num" style={{ marginTop: 8 }}>
            {fmt.money(total, currency)}
          </div>
          {ytdChange && (
            <div
              className="meta"
              style={{
                color:
                  ytdChange.direction === 'up' ? 'var(--coral-2)' : 'var(--sage-2)',
                marginTop: 4,
              }}
            >
              전월 대비 {ytdChange.direction === 'up' ? '▲' : '▼'} {ytdChange.value}%
            </div>
          )}
        </div>
      </div>
      <StackBar segments={segments} />
      <div className="grid cols-4" style={{ gap: 12 }}>
        {segments.slice(0, 8).map((seg) => {
          const cat = CATEGORIES[seg.cat];
          return (
            <div
              key={seg.cat}
              style={{
                padding: 14,
                borderRadius: 12,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="row"
                style={{ gap: 6, marginBottom: 6, fontSize: 'var(--fs-xs)' }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: cat.color,
                  }}
                />
                <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>
                  {cat.label}
                </span>
              </div>
              <div className="num" style={{ fontWeight: 700, fontSize: 'var(--fs-base)' }}>
                {fmt.money(seg.amount, currency)}
              </div>
              <div className="meta num">{fmt.percent(seg.ratio * 100, 1)}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
