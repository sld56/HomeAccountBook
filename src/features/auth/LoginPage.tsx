import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, isServerConfigured } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Step = 'email' | 'otp' | 'sent';

export function LoginPage() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const redirect = search.get('redirect') ?? '/';

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!isServerConfigured) {
    return (
      <div className="auth-shell">
        <Card size="lg" className="auth-card">
          <h1 className="auth-title">서버 미설정</h1>
          <p className="meta">
            클라이언트가 서버 모드로 빌드되었지만 <code>VITE_SUPABASE_URL</code>이
            설정되지 않았습니다. 로컬 모드로 사용하려면 환경변수를 비워두세요.
          </p>
        </Card>
      </div>
    );
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const cleaned = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email: cleaned,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setStep('otp');
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    navigate(redirect, { replace: true });
  }

  return (
    <div className="auth-shell">
      <Card size="lg" className="auth-card">
        <div className="auth-brand">
          <span className="auth-mark">💰</span>
          <span>우리집 가계부</span>
        </div>
        <h1 className="auth-title">로그인 / 가입</h1>
        <p className="meta">이메일 한 줄이면 됩니다. 비밀번호 없이 코드를 받아 들어오세요.</p>

        {step === 'email' && (
          <form onSubmit={sendOtp} className="stack" style={{ marginTop: 24 }}>
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
            {err && <div className="auth-error">{err}</div>}
            <Button variant="primary" size="lg" type="submit" disabled={busy || !email.trim()}>
              {busy ? '발송 중…' : '코드 받기'}
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOtp} className="stack" style={{ marginTop: 24 }}>
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
              {busy ? '확인 중…' : '입장하기'}
            </Button>
            <Button variant="ghost" type="button" onClick={() => { setStep('email'); setCode(''); }}>
              이메일 다시 입력
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
