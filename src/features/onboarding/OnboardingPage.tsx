import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export function OnboardingPage() {
  const navigate = useNavigate();
  const refresh = useAuth((s) => s.refreshMembership);
  const [mode, setMode] = useState<'choose' | 'create' | 'invite'>('choose');

  return (
    <div className="auth-shell">
      <Card size="lg" className="auth-card">
        <h1 className="auth-title">시작하기</h1>
        <p className="meta">가족 가계부를 새로 만들거나 초대받은 토큰으로 합류하세요.</p>

        {mode === 'choose' && (
          <div className="stack" style={{ marginTop: 24 }}>
            <Button variant="primary" size="lg" onClick={() => setMode('create')}>
              새 가족 만들기
            </Button>
            <Button variant="default" size="lg" onClick={() => setMode('invite')}>
              초대받았어요 (토큰 입력)
            </Button>
          </div>
        )}

        {mode === 'create' && (
          <CreateHouseholdForm
            onCancel={() => setMode('choose')}
            onSuccess={async () => {
              await refresh();
              navigate('/', { replace: true });
            }}
          />
        )}

        {mode === 'invite' && (
          <AcceptInviteForm
            onCancel={() => setMode('choose')}
            onSuccess={async () => {
              await refresh();
              navigate('/', { replace: true });
            }}
          />
        )}
      </Card>
    </div>
  );
}

function CreateHouseholdForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('우리집');
  const [display, setDisplay] = useState('');
  const [color, setColor] = useState<MemberColorKey>('appa');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const trimmedName = name.trim();
      const trimmedDisplay = display.trim();
      if (!trimmedName) throw new Error('가족 이름을 입력해주세요');
      if (!trimmedDisplay) throw new Error('내 표시 이름을 입력해주세요');
      await callFunction('create-household', {
        name: trimmedName,
        display_name: trimmedDisplay,
        short: trimmedDisplay.slice(0, 1),
        color_key: color,
      });
      onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ marginTop: 24 }}>
      <label className="field">
        <span className="label">가족 이름</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} />
      </label>
      <label className="field">
        <span className="label">내 표시 이름 (가족에게 보이는 이름)</span>
        <input
          className="input"
          value={display}
          onChange={(e) => setDisplay(e.target.value)}
          placeholder="예: 아버지"
          required
          maxLength={20}
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
      <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
        <Button variant="ghost" type="button" onClick={onCancel}>뒤로</Button>
        <Button variant="primary" type="submit" disabled={busy}>{busy ? '만드는 중…' : '만들기'}</Button>
      </div>
    </form>
  );
}

function AcceptInviteForm({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) {
  const [token, setToken] = useState('');
  const [display, setDisplay] = useState('');
  const [color, setColor] = useState<MemberColorKey>('deahyun');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const trimmedToken = token.trim();
      const trimmedDisplay = display.trim();
      if (!/^[A-Za-z0-9_-]{64}$/.test(trimmedToken)) {
        throw new Error('초대 토큰은 64자리 영숫자입니다');
      }
      if (!trimmedDisplay) throw new Error('내 표시 이름을 입력해주세요');
      await callFunction('accept-invite', {
        token: trimmedToken,
        display_name: trimmedDisplay,
        short: trimmedDisplay.slice(0, 1),
        color_key: color,
      });
      onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="stack" style={{ marginTop: 24 }}>
      <label className="field">
        <span className="label">초대 토큰</span>
        <input
          className="input"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="64자리 영숫자"
          required
          minLength={64}
          maxLength={64}
        />
      </label>
      <label className="field">
        <span className="label">내 표시 이름</span>
        <input
          className="input"
          value={display}
          onChange={(e) => setDisplay(e.target.value)}
          placeholder="예: 대현"
          required
          maxLength={20}
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
      <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
        <Button variant="ghost" type="button" onClick={onCancel}>뒤로</Button>
        <Button variant="primary" type="submit" disabled={busy}>{busy ? '합류 중…' : '합류하기'}</Button>
      </div>
    </form>
  );
}
