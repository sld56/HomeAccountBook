import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // PKCE: ?code=...
      const code = search.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setErr(error.message);
          return;
        }
      }
      const redirect = search.get('redirect') ?? '/';
      navigate(redirect, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [search, navigate]);

  return (
    <div className="auth-shell">
      <div style={{ textAlign: 'center', padding: 40 }}>
        {err ? (
          <>
            <h2 style={{ color: 'var(--coral-2)' }}>로그인 실패</h2>
            <p className="meta">{err}</p>
            <a href="/login" className="meta" style={{ textDecoration: 'underline' }}>다시 시도</a>
          </>
        ) : (
          <p className="meta">잠시만요…</p>
        )}
      </div>
    </div>
  );
}
