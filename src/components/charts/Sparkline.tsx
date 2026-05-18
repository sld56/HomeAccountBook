type Props = {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  ariaLabel?: string;
};

export function Sparkline({
  values,
  width = 140,
  height = 36,
  color = 'var(--coral)',
  ariaLabel = '추이 스파크라인',
}: Props) {
  if (!values.length) return null;
  const allZero = values.every((v) => v === 0);
  if (allZero) {
    return (
      <div
        style={{
          width,
          height,
          display: 'grid',
          placeItems: 'center',
          fontSize: 'var(--fs-xs)',
          color: 'var(--ink-3)',
        }}
        role="img"
        aria-label={`${ariaLabel}: 데이터 없음`}
      >
        — 거래 없음
      </div>
    );
  }
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const x = (i: number) => pad + (i / Math.max(1, values.length - 1)) * innerW;
  const y = (v: number) => pad + innerH - ((v - min) / range) * innerH;
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const last = values.length - 1;
  const summary = `${ariaLabel}: 최소 ${min.toLocaleString('ko-KR')}, 최대 ${max.toLocaleString('ko-KR')}, 최근 ${values[last].toLocaleString('ko-KR')}`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }} role="img" aria-label={summary}>
      <title>{summary}</title>
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <circle cx={x(last)} cy={y(values[last])} r={3} fill={color} />
    </svg>
  );
}
