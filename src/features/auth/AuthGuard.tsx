import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './authStore';

type Props = { children: React.ReactNode };

export function AuthGuard({ children }: Props) {
  const loading = useAuth((s) => s.loading);
  const membershipChecked = useAuth((s) => s.membershipChecked);
  const user = useAuth((s) => s.user);
  const household_id = useAuth((s) => s.household_id);
  const init = useAuth((s) => s.init);
  const location = useLocation();

  useEffect(() => {
    init();
  }, [init]);

  // 초기 로딩 + 로그인 후 멤버십 fetch 완료까지 대기 — race condition 방지
  if (loading || (user && !membershipChecked)) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <p className="meta">불러오는 중…</p>
      </div>
    );
  }

  if (!user) {
    const target = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(target)}`} replace />;
  }

  if (!household_id && location.pathname !== '/onboarding' && !location.pathname.startsWith('/invite')) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
