import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { callFunction, isServerConfigured } from '@/lib/supabase';
import { useAuth } from '@/features/auth/authStore';

const MIGRATED_MARKER = 'gagyebu-migrated-at';

function readLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state ?? parsed;
  } catch {
    return null;
  }
}

export function MigrationModal() {
  const household_id = useAuth((s) => s.household_id);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ transactions: number } | null>(null);
  const [stats, setStats] = useState<{ tx: number } | null>(null);

  useEffect(() => {
    if (!isServerConfigured || !household_id) return;
    if (localStorage.getItem(MIGRATED_MARKER)) return;
    const txStore = readLocal<{ transactions: Array<unknown> }>('gagyebu-transactions');
    const txCount = txStore?.transactions?.length ?? 0;
    // 시드 데이터 26건은 무시 (정확히 26건이면 자동 건너뜀)
    if (txCount > 26) {
      setStats({ tx: txCount });
      setOpen(true);
    }
  }, [household_id]);

  async function importNow() {
    if (!household_id) return;
    setBusy(true); setErr(null);
    try {
      const tx = readLocal<{ transactions: Array<Record<string, unknown>> }>('gagyebu-transactions');
      const payload = {
        household_id,
        transactions: (tx?.transactions ?? []).map((t) => ({
          date: t.date,
          kind: t.kind,
          amount: t.amount,
          cat: t.cat,
          title: t.title,
          memo: t.memo,
        })),
      };
      const res = await callFunction<{ imported: { transactions: number } }>('import-local', payload);
      setResult({ transactions: res.imported.transactions });
      localStorage.setItem(MIGRATED_MARKER, new Date().toISOString());
      localStorage.removeItem('gagyebu-transactions');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패');
    } finally {
      setBusy(false);
    }
  }

  function skip() {
    localStorage.setItem(MIGRATED_MARKER, 'skipped');
    setOpen(false);
  }

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="기존 데이터 가져오기">
      <div className="stack">
        {result ? (
          <>
            <div className="auth-success">
              거래 {result.transactions}건을 서버로 옮겼습니다.
            </div>
            <Button variant="primary" onClick={() => setOpen(false)}>닫기</Button>
          </>
        ) : (
          <>
            <p>
              이 브라우저에 저장된 거래 <strong>{stats?.tx ?? 0}건</strong>을 발견했습니다.
              가족 가계부로 가져올까요?
            </p>
            <p className="meta">
              한 번만 옮기면 됩니다. 옮긴 데이터는 가족 모두에게 보입니다.
            </p>
            {err && <div className="auth-error">{err}</div>}
            <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={skip} disabled={busy}>다음에 하기</Button>
              <Button variant="primary" onClick={importNow} disabled={busy}>
                {busy ? '옮기는 중…' : '가져오기'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
