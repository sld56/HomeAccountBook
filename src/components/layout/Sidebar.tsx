import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useMembers } from '@/stores/memberStore';
import { useAuth } from '@/features/auth/authStore';
import { isServerConfigured } from '@/lib/supabase';

type Props = { onAddTransaction: () => void };

const LINKS = [
  { to: '/', label: '홈', icon: '🏠', end: true },
  { to: '/transactions', label: '거래 내역', icon: '📋' },
  { to: '/reports', label: '리포트', icon: '📊' },
  { to: '/budget', label: '예산 · 목표', icon: '🎯' },
  { to: '/settings', label: '설정', icon: '⚙️' },
];

export function Sidebar({ onAddTransaction }: Props) {
  const navigate = useNavigate();
  const members = useMembers((s) => s.members);
  const selected = useMembers((s) => s.selectedMember);
  const select = useMembers((s) => s.selectMember);
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);

  const handleSignOut = async () => {
    if (!confirm('로그아웃 하시겠습니까?')) return;
    await signOut();
    navigate('/login', { replace: true });
  };
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark" aria-hidden>
          💰
        </span>
        <span>우리집 가계부</span>
      </div>
      <nav className="sidebar-nav">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span aria-hidden>{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-cta">
        <Button variant="primary" size="md" onClick={onAddTransaction} style={{ width: '100%' }}>
          + 새 거래 입력
        </Button>
      </div>
      <div>
        <div className="sidebar-section-title">가족 구성원</div>
        <div className="sidebar-members">
          <button
            className={`sidebar-member ${selected === 'all' ? 'active' : ''}`}
            onClick={() => select('all')}
            type="button"
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--member-all)',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              全
            </span>
            <span>전체</span>
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              className={`sidebar-member ${selected === m.id ? 'active' : ''}`}
              onClick={() => select(m.id)}
              type="button"
            >
              <Avatar name={m.name} short={m.short} colorKey={m.colorKey} size="sm" />
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      </div>
      {isServerConfigured && user && (
        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div className="meta" style={{ fontSize: 'var(--fs-xs)', marginBottom: 6, wordBreak: 'break-all' }}>
            {user.email}
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} style={{ width: '100%' }}>
            로그아웃
          </Button>
        </div>
      )}
    </aside>
  );
}
