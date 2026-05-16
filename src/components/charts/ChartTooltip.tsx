import React from 'react';
import './ChartTooltip.css';

type Props = {
  x: number;
  y: number;
  containerWidth?: number;
  children: React.ReactNode;
  placement?: 'top' | 'bottom';
};

export function ChartTooltip({ x, y, containerWidth = 800, children, placement = 'top' }: Props) {
  const flipX = x > containerWidth - 120 ? 'right' : x < 120 ? 'left' : 'center';
  return (
    <div
      className={`chart-tooltip chart-tooltip-${placement} chart-tooltip-x-${flipX}`}
      style={{ left: x, top: y }}
      role="tooltip"
    >
      <div className="chart-tooltip-body">{children}</div>
    </div>
  );
}
