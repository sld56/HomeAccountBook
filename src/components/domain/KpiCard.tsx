import React from 'react';
import './KpiCard.css';
import { Card } from '@/components/ui/Card';

type Props = {
  eyebrow: string;
  value: React.ReactNode;
  trend?: { direction: 'up' | 'down' | 'flat'; text: string };
  icon?: React.ReactNode;
  accent?: string;
};

export function KpiCard({ eyebrow, value, trend, icon, accent }: Props) {
  return (
    <Card className="kpi-card">
      <div className="kpi-eyebrow-row">
        <span className="kpi-eyebrow">{eyebrow}</span>
        {icon && (
          <span className="kpi-icon" style={{ background: accent ?? 'var(--bg-2)' }}>
            {icon}
          </span>
        )}
      </div>
      <div className="kpi-value num">{value}</div>
      {trend && (
        <div className={`kpi-trend kpi-trend-${trend.direction}`}>
          <span aria-hidden>{trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '·'}</span>
          {trend.text}
        </div>
      )}
    </Card>
  );
}
