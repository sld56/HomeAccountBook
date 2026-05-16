import React from 'react';
import './Tabs.css';

type Props = {
  tabs: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
};

export function Tabs({ tabs, value, onChange }: Props) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={t.value === value}
          className={`tabs-trigger ${t.value === value ? 'is-active' : ''}`}
          onClick={() => onChange(t.value)}
          type="button"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  if (!active) return null;
  return <div role="tabpanel">{children}</div>;
}
