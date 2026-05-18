import { useEffect, useMemo, useState } from 'react';
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

type Counts = {
  transactions: number;
  accounts: number;
  budgets: number;
  goals: number;
  upcoming: number;
};

type Imported = Counts;

function looksLikeUserData(items: Array<{ id?: unknown }> | undefined): boolean {
  // 시드 데이터의 id는 't1', 'goal-edu' 등 단순 문자열.
  // 사용자가 추가한 데이터는 'xxx-{timestamp}-{rand}' 형태로 대시 2개 이상.
  if (!items || items.length === 0) return false;
  return items.some((it) => typeof it.id === 'string' && (it.id.match(/-/g)?.length ?? 0) >= 2);
}

type LocalSnapshot = {
  transactions: Array<Record<string, unknown>>;
  accounts: Array<Record<string, unknown>>;
  budgets: Array<Record<string, unknown>>;
  goals: Array<Record<string, unknown>>;
  upcoming: Array<Record<string, unknown>>;
};

function collectLocal(): LocalSnapshot {
  const tx = readLocal<{ transactions: Array<Record<string, unknown>> }>('gagyebu-transactions');
  const ac = readLocal<{ accounts: Array<Record<string, unknown>> }>('gagyebu-accounts');
  const bg = readLocal<{ budgets: Array<Record<string, unknown>> }>('gagyebu-budgets');
  const gl = readLocal<{ goals: Array<Record<string, unknown>> }>('gagyebu-goals');
  const up = readLocal<{ upcoming: Array<Record<string, unknown>> }>('gagyebu-upcoming');
  const transactions = tx?.transactions ?? [];
  const accounts = ac?.accounts ?? [];
  const budgets = bg?.budgets ?? [];
  const goals = gl?.goals ?? [];
  const upcoming = up?.upcoming ?? [];
  return {
    transactions,
    accounts,
    budgets,
    goals,
    upcoming,
  };
}

export function MigrationModal() {
  const household_id = useAuth((s) => s.household_id);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Imported | null>(null);

  // 마운트 1회만 LocalStorage 스냅샷 — 마이그레이션은 한 번이라 충분
  const data = useMemo(() => collectLocal(), []);
  const counts: Counts = useMemo(
    () => ({
      transactions: data.transactions.length,
      accounts: data.accounts.length,
      budgets: data.budgets.length,
      goals: data.goals.length,
      upcoming: data.upcoming.length,
    }),
    [data],
  );

  const hasUserData = useMemo(() => {
    // 어느 한 컬렉션에라도 "사용자가 만든 ID 패턴"이 있으면 진짜 데이터.
    return (
      looksLikeUserData(data.transactions as Array<{ id?: unknown }>) ||
      looksLikeUserData(data.accounts as Array<{ id?: unknown }>) ||
      looksLikeUserData(data.goals as Array<{ id?: unknown }>) ||
      looksLikeUserData(data.upcoming as Array<{ id?: unknown }>)
    );
  }, [data]);

  useEffect(() => {
    if (!isServerConfigured || !household_id) return;
    if (localStorage.getItem(MIGRATED_MARKER)) return;
    // 사용자 패턴 ID가 한 건이라도 있을 때만 모달 자동 표시
    if (hasUserData) setOpen(true);
  }, [household_id, hasUserData]);

  async function importNow() {
    if (!household_id) return;
    setBusy(true);
    setErr(null);
    try {
      const payload = {
        household_id,
        transactions: data.transactions.map((t) => ({
          id: t.id,
          date: t.date,
          kind: t.kind,
          amount: t.amount,
          cat: t.cat,
          title: t.title,
          memo: t.memo,
          account: t.account,
        })),
        accounts: data.accounts.map((a) => ({
          id: a.id,
          label: a.label,
          type: a.type,
          bank: a.bank,
          balance: a.balance,
          color: a.color,
          limit: a.limit,
        })),
        budgets: data.budgets.map((b) => ({
          cat: b.cat,
          limit: b.limit,
          ym: b.ym ?? null,
        })),
        goals: data.goals.map((g) => ({
          title: g.title,
          saved: g.saved,
          target: g.target,
          monthly: g.monthly,
          color: g.color,
        })),
        upcoming: data.upcoming.map((u) => ({
          label: u.label,
          date: u.date,
          amount: u.amount,
          cat: u.cat,
          autopay: u.autopay,
        })),
      };
      const res = await callFunction<{ imported: Imported }>('import-local', payload);
      setResult(res.imported);
      localStorage.setItem(MIGRATED_MARKER, new Date().toISOString());
      // 가져온 컬렉션의 로컬 저장소만 비움 (멤버/설정은 유지)
      localStorage.removeItem('gagyebu-transactions');
      localStorage.removeItem('gagyebu-accounts');
      localStorage.removeItem('gagyebu-budgets');
      localStorage.removeItem('gagyebu-goals');
      localStorage.removeItem('gagyebu-upcoming');
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
              가져오기 완료 — 거래 {result.transactions}건, 계좌 {result.accounts}개,
              예산 {result.budgets}개, 목표 {result.goals}개, 다가오는 결제 {result.upcoming}건
            </div>
            <p className="meta">
              거래의 "누가"와 "결제 수단"은 안전을 위해 비워뒀습니다. 필요하면 거래를 열어
              다시 지정해주세요.
            </p>
            <Button variant="primary" onClick={() => setOpen(false)}>
              닫기
            </Button>
          </>
        ) : (
          <>
            <p>이 브라우저에 저장된 기존 데이터가 있습니다. 가족 가계부로 가져올까요?</p>
            <div
              className="stack"
              style={{
                gap: 4,
                padding: 12,
                background: 'var(--surface-2)',
                borderRadius: 10,
                fontSize: 'var(--fs-sm)',
              }}
            >
              <div className="between">
                <span>거래</span>
                <span className="num">{counts.transactions.toLocaleString('ko-KR')}건</span>
              </div>
              <div className="between">
                <span>계좌</span>
                <span className="num">{counts.accounts.toLocaleString('ko-KR')}개</span>
              </div>
              <div className="between">
                <span>예산</span>
                <span className="num">{counts.budgets.toLocaleString('ko-KR')}개</span>
              </div>
              <div className="between">
                <span>저축 목표</span>
                <span className="num">{counts.goals.toLocaleString('ko-KR')}개</span>
              </div>
              <div className="between">
                <span>다가오는 결제</span>
                <span className="num">{counts.upcoming.toLocaleString('ko-KR')}건</span>
              </div>
            </div>
            <p className="meta">
              한 번만 옮기면 됩니다. 옮긴 데이터는 가족 모두에게 보입니다. 거래의 "누가"는
              비워둔 채로 들어가니, 가져온 뒤 거래를 열어 가족 구성원을 지정해주세요.
            </p>
            {err && <div className="auth-error">{err}</div>}
            <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={skip} disabled={busy}>
                다음에 하기
              </Button>
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
