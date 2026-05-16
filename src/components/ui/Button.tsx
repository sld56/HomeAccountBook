import React from 'react';
import './Button.css';

type Variant = 'primary' | 'default' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}: Props) {
  return <button className={`btn btn-${variant} btn-${size} ${className}`} {...props} />;
}
