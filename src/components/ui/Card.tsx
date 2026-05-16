import React from 'react';
import './Card.css';

type Props = React.HTMLAttributes<HTMLDivElement> & {
  size?: 'default' | 'lg';
  as?: 'div' | 'section' | 'article';
};

export function Card({ size = 'default', as = 'div', className = '', ...props }: Props) {
  const El = as;
  return <El className={`card card-${size} ${className}`} {...props} />;
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="card-header">
      <div>
        <div className="card-title">{title}</div>
        {subtitle && <div className="card-subtitle">{subtitle}</div>}
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}
