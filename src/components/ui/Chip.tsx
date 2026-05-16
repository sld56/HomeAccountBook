import React from 'react';
import './Chip.css';

type Tone = 'default' | 'sage' | 'coral' | 'rose' | 'amber' | 'sky' | 'lavender';

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone;
  as?: 'span' | 'button';
  active?: boolean;
};

export function Chip({ tone = 'default', as = 'span', active, className = '', ...props }: Props) {
  const El = as as 'span';
  return (
    <El
      className={`chip chip-${tone} ${active ? 'is-active' : ''} ${className}`}
      {...(props as React.HTMLAttributes<HTMLSpanElement>)}
    />
  );
}
