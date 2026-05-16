import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { callFunction } from '@/lib/supabase';
import { useAuth } from '@/features/auth/authStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { MemberColorKey } from '@/types/domain';

const COLOR_OPTIONS: { key: MemberColorKey; label: string }[] = [
  { key: 'appa', label: '아버지 색' },
  { key: 'eomma', label: '어머니 색' },
  { key: 'deahyun', label: '자녀 색 1' },
  { key: 'jiwon', label: '자녀 색 2' },
];

export function InviteAcceptPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const token = search.get('t') ?? '';

  const loading = useAuth((s) => s.loading);
  const user = useAuth((s) => s.user);
  const init = useAuth((s) => s.init);
  const refresh = useAuth((s) => s.refreshMembership);

  const [display, setDisplay] = useState('');
  const [color, setColor] = useState<MemberColorKey>('deahyun');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  if (!token) {
    return <Navigate to="/" replace />;
  }
  if (loading) {
    return <div className="auth-shell"><p className="meta">불러오는 중…</p></div>;
  }
  if (!user) {
    const target = `/invite?t=${token}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(target)}`} replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await callFunction('accept-invite', {
        token,
        display_name: display.trim(),
        short: display.trim().slice(0, 1),
        color_key: color,
      });
      await refresh();
      navigate('/', { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패');
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <Card size="lg" className="auth-card">
        <h1 className="auth-title">초대 수락</h1>
        <p className="meta">가족 가계부에 합류하기 위해 표시 이름과 색상을 정해주세요.</p>
        <form onSubmit={submit} className="stack" style={{ marginTop: 24 }}>
          <label className="field">
            <span className="label">내 표시 이름</span>
            <input
              className="input"
              value={display}
              onChange={(e) => setDisplay(e.target.value)}
              placeholder="가족에게 보일 이름"
              required
              maxLength={20}
              autoFocus
            />
          </label>
          <div className="field">
            <span className="label">내 색상</span>
            <div className="row" style={{ gap: 8 }}>
              {COLOR_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setColor(o.key)}
                  aria-pressed={color === o.key}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `var(--member-${o.key})`,
                    border: color === o.key ? '3px solid var(--ink)' : '3px solid transparent',
                    cursor: 'pointer',
                  }}
                  title={o.label}
                />
              ))}
            </div>
          </div>
          {err && <div className="auth-error">{err}</div>}
          <Button variant="primary" size="lg" type="submit" disabled={busy || !display.trim()}>
            {busy ? '합류 중…' : '합류하기'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
