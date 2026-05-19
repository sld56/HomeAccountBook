import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { callFunction, supabase, isServerConfigured } from '@/lib/supabase';
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

type Step = 'form' | 'otp';

export function InviteAcceptPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const token = search.get('t') ?? '';

  const loading = useAuth((s) => s.loading);
  const user = useAuth((s) => s.user);
  const init = useAuth((s) => s.init);
  const refresh = useAuth((s) => s.refreshMembership);

  useEffect(() => {
    init();
  }, [init]);

  if (!isServerConfigured) {
    return (
      <div className="auth-shell">
        <Card size="lg" className="auth-card">
          <h2 className="auth-title">서버 미설정</h2>
          <p className="meta">로컬 모드에서는 초대 합류를 지원하지 않습니다.</p>
        </Card>
      </div>
    );
  }
  if (!token) {
    return <Navigate to="/" replace />;
  }
  if (loading) {
    return (
      <div className="auth-shell">
        <p className="meta">불러오는 중…</p>
      </div>
    );
  }

  // 이미 로그인된 사용자: 기존 합류 흐름 (표시이름·색상만)
  if (user) {
    return (
      <AlreadyLoggedInForm
        token={token}
        onSuccess={async () => {
          await refresh();
          navigate('/', { replace: true });
        }}
      />
    );
  }

  // 미로그인: 통합 흐름 (이메일+표시이름+색상 → OTP → 자동 합류)
  return (
    <NewUserInviteFlow
      token={token}
      onSuccess={async () => {
        await refresh();
        navigate('/', { replace: true });
      }}
    />
  );
}

// ──────────────────────────────────────────────────────────────
// 1. 새 가족 멤버용 통합 등록 + 합류 흐름
// ──────────────────────────────────────────────────────────────

function NewUserInviteFlow({ token, onSuccess }: { token: string; onSuccess: () => Promise<void> | void }) {
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [display, setDisplay] = useState('');
  const [color, setColor] = useState<MemberColorKey>('deahyun');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) throw new Error('이메일을 입력해주세요');
      if (!display.trim()) throw new Error('내 표시 이름을 입력해주세요');
      // shouldCreateUser=true (기본값) — 신규 가족도 이 한 번으로 계정 생성
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          // 이 페이지로 다시 보내도 OTP 흐름이라 사실상 사용 X. 안전한 폴백.
          emailRedirectTo: `${window.location.origin}/invite?t=${encodeURIComponent(token)}`,
        },
      });
      if (error) throw error;
      setStep('otp');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패');
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndJoin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanCode = code.trim();
      if (cleanCode.length !== 6) throw new Error('6자리 코드를 입력해주세요');
      // 1) OTP 검증 — 성공하면 계정이 자동 생성/로그인됨
      const { error: otpErr } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'email',
      });
      if (otpErr) throw otpErr;
      // 2) accept-invite 호출 — 가족 합류
      await callFunction('accept-invite', {
        token,
        display_name: display.trim(),
        short: display.trim().slice(0, 1),
        color_key: color,
      });
      await onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <Card size="lg" className="auth-card">
        <div className="auth-brand">
          <span className="auth-mark">💰</span>
          <span>우리집 가계부</span>
        </div>
        <h1 className="auth-title">가족 합류</h1>
        <p className="meta">초대받은 가족 가계부에 합류합니다.</p>

        {step === 'form' && (
          <form onSubmit={requestCode} className="stack" style={{ marginTop: 24 }}>
            <label className="field">
              <span className="label">이메일</span>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                inputMode="email"
              />
            </label>
            <label className="field">
              <span className="label">내 표시 이름</span>
              <input
                className="input"
                value={display}
                onChange={(e) => setDisplay(e.target.value)}
                placeholder="가족에게 보일 이름"
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
            <Button variant="primary" size="lg" type="submit" disabled={busy || !email.trim() || !display.trim()}>
              {busy ? '발송 중…' : '인증 코드 받기'}
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyAndJoin} className="stack" style={{ marginTop: 24 }}>
            <p className="meta">
              <strong>{email}</strong>로 6자리 코드를 보냈습니다. 메일이 안 보이면 스팸함도 확인해주세요.
            </p>
            <label className="field">
              <span className="label">6자리 코드</span>
              <input
                type="text"
                className="input num"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                autoFocus
                style={{ fontSize: 24, textAlign: 'center', letterSpacing: '0.4em' }}
              />
            </label>
            {err && <div className="auth-error">{err}</div>}
            <Button variant="primary" size="lg" type="submit" disabled={busy || code.length !== 6}>
              {busy ? '합류 중…' : '합류하기'}
            </Button>
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setStep('form');
                setCode('');
                setErr(null);
              }}
            >
              이메일 다시 입력
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 2. 이미 로그인된 사용자가 초대 링크 클릭한 경우 — 표시이름·색상만
// ──────────────────────────────────────────────────────────────

function AlreadyLoggedInForm({ token, onSuccess }: { token: string; onSuccess: () => Promise<void> | void }) {
  const [display, setDisplay] = useState('');
  const [color, setColor] = useState<MemberColorKey>('deahyun');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      await onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패');
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <Card size="lg" className="auth-card">
        <h1 className="auth-title">가족 합류</h1>
        <p className="meta">표시 이름과 색상을 정해 합류하세요.</p>
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
