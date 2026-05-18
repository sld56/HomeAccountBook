import './ProgressBar.css';

type Props = {
  value: number;
  max?: number;
  thickness?: 'thin' | 'default' | 'thick';
  color?: string;
  label?: string;
};

export function ProgressBar({
  value,
  max = 100,
  thickness = 'default',
  color,
  label,
}: Props) {
  // max=0이면 (value/max)가 Infinity가 되어 clamp 후 100%로 표시되는 버그 방지
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  let fill = color ?? 'var(--coral)';
  if (!color) {
    if (pct >= 100) fill = 'var(--rose)';
    else if (pct >= 85) fill = 'var(--amber)';
  }
  return (
    <div
      className={`bar bar-${thickness}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
      aria-label={label}
    >
      <div className="bar-fill" style={{ width: `${pct}%`, background: fill }} />
    </div>
  );
}
