import './Avatar.css';
import type { MemberColorKey } from '@/types/domain';

type Props = {
  name: string;
  short: string;
  colorKey: MemberColorKey;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
};

export function Avatar({ name, short, colorKey, size = 'md', showName = false }: Props) {
  return (
    <div className={`avatar-wrap avatar-${size}`} title={name}>
      <div className={`avatar avatar-${size}`} style={{ background: `var(--member-${colorKey})` }}>
        {short}
      </div>
      {showName && <span className="avatar-name">{name}</span>}
    </div>
  );
}
