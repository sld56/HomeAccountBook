// Supabase ↔ Zustand 동기화 어댑터
// 사용 방침: isServerConfigured + 인증 사용자가 있을 때만 활성.
// transactions / accounts / budgets / goals / upcoming 5개 테이블을 모두 fetch + realtime 구독.

import { supabase, isServerConfigured } from '@/lib/supabase';
import { useAuth } from '@/features/auth/authStore';
import { useTransactions } from './transactionStore';
import { useAccounts } from './accountStore';
import { useBudgets } from './budgetStore';
import { useGoals } from './goalStore';
import { useUpcoming } from './upcomingStore';
import { useMembers } from './memberStore';
import type { Transaction, Account, Budget, Goal, Upcoming, Member } from '@/types/domain';

const channels: ReturnType<typeof supabase.channel>[] = [];

// 동시 start 호출 (StrictMode dev double-effect / 빠른 household_id 토글)이
// 채널을 중복 추가하지 않도록 토큰으로 직렬화. 가장 최근 호출만 살아남고
// 이전 호출이 만든 채널은 모두 unsubscribe.
let syncToken = 0;

// 동기화 상태 — 외부에서 에러 표시용으로 구독 가능
let syncError: string | null = null;
const syncErrorListeners = new Set<(err: string | null) => void>();
function setSyncError(err: string | null) {
  syncError = err;
  for (const l of syncErrorListeners) l(err);
}
export function subscribeSyncError(cb: (err: string | null) => void): () => void {
  syncErrorListeners.add(cb);
  cb(syncError);
  return () => syncErrorListeners.delete(cb);
}

// ──────────────────────────────────────────────────────────────
// 변환 헬퍼
// ──────────────────────────────────────────────────────────────

type DbTx = {
  id: string; household_id: string; date: string;
  kind: 'in' | 'out'; amount: number; cat: string;
  title: string; memo: string | null;
  member_id: string | null; account_id: string | null;
};

function txFromDb(r: DbTx): Transaction {
  return {
    id: r.id, date: r.date, kind: r.kind, amount: r.amount,
    cat: r.cat as Transaction['cat'], title: r.title,
    memo: r.memo ?? undefined,
    member: r.member_id ?? '', account: r.account_id ?? '',
  };
}

type DbAccount = {
  id: string; label: string; type: Account['type']; bank: string;
  balance: number; color: string; card_limit: number | null;
};

function accountFromDb(r: DbAccount): Account {
  return {
    id: r.id, label: r.label, type: r.type, bank: r.bank,
    balance: r.balance, color: r.color,
    limit: r.card_limit ?? undefined,
  };
}

type DbBudget = { cat: string; budget_limit: number; ym: string | null };

function budgetFromDb(r: DbBudget): Budget {
  return { cat: r.cat as Budget['cat'], limit: r.budget_limit, ym: r.ym ?? undefined };
}

type DbGoal = {
  id: string; title: string; saved: number; target: number;
  monthly: number; color: string;
};

function goalFromDb(r: DbGoal): Goal {
  return { id: r.id, title: r.title, saved: r.saved, target: r.target, monthly: r.monthly, color: r.color };
}

type DbUpcoming = {
  id: string; label: string; due_date: string; amount: number;
  cat: string; autopay: boolean;
};

function upcomingFromDb(r: DbUpcoming): Upcoming {
  return {
    id: r.id, label: r.label, date: r.due_date, amount: r.amount,
    cat: r.cat as Upcoming['cat'], autopay: r.autopay,
  };
}

type DbMember = {
  household_id: string;
  user_id: string;
  role: 'owner' | 'member';
  display_name: string;
  short: string;
  color_key: 'appa' | 'eomma' | 'deahyun' | 'jiwon';
};

function memberFromDb(r: DbMember): Member {
  return {
    id: r.user_id,
    name: r.display_name,
    short: r.short,
    role: r.role === 'owner' ? '가장' : '자녀',
    colorKey: r.color_key,
  };
}

// ──────────────────────────────────────────────────────────────
// 초기 fetch + realtime 구독
// ──────────────────────────────────────────────────────────────

async function fetchAndSubscribe<DbT, T>(opts: {
  table: string;
  household_id: string;
  order?: { column: string; ascending: boolean };
  fromDb: (row: DbT) => T;
  getId: (item: T) => string;
  setAll: (items: T[]) => void;
  insertOne: (item: T) => void;
  updateOne: (item: T) => void;
  removeOne: (id: string) => void;
}) {
  // 초기 fetch
  let q = supabase.from(opts.table).select('*').eq('household_id', opts.household_id);
  if (opts.order) q = q.order(opts.order.column, { ascending: opts.order.ascending });
  const { data, error } = await q;
  if (error) {
    console.error(`[sync] ${opts.table} fetch failed`, error);
    // 부분 실패 시 stale 데이터로 오해받지 않도록 비움 + 사용자 알림
    opts.setAll([]);
    setSyncError(`동기화 실패 (${opts.table}). 네트워크 또는 권한 문제일 수 있어요.`);
    return;
  }
  opts.setAll((data as DbT[]).map(opts.fromDb));

  // realtime 구독
  const ch = supabase
    .channel(`${opts.table}-${opts.household_id}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: opts.table,
        filter: `household_id=eq.${opts.household_id}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const item = opts.fromDb(payload.new as DbT);
          opts.insertOne(item);
        } else if (payload.eventType === 'UPDATE') {
          const item = opts.fromDb(payload.new as DbT);
          opts.updateOne(item);
        } else if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id: string }).id;
          opts.removeOne(id);
        }
      },
    )
    .subscribe();
  channels.push(ch);
}

export async function startServerSync() {
  if (!isServerConfigured) return;
  const { household_id, user } = useAuth.getState();
  if (!household_id || !user) return;

  // 동시 start 호출 직렬화 — 가장 최근 호출만 유효
  const myToken = ++syncToken;
  await stopServerSync(); // 기존 채널 정리
  setSyncError(null);
  if (myToken !== syncToken) return; // 그 사이 더 새 호출이 들어왔으면 중단

  await Promise.all([
    // household_members (PK = household_id+user_id, id 컬럼 없음 — 별도 처리)
    (async () => {
      const { data, error } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', household_id);
      if (error) {
        console.error('[sync] household_members fetch failed', error);
        return;
      }
      useMembers.setState({
        members: (data as DbMember[]).map(memberFromDb),
      });

      const ch = supabase
        .channel(`household_members-${household_id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'household_members',
            filter: `household_id=eq.${household_id}`,
          },
          async () => {
            // PK 복합키라 단순 재fetch (멤버 수 적음)
            const { data: fresh } = await supabase
              .from('household_members')
              .select('*')
              .eq('household_id', household_id);
            if (fresh) {
              const memberRows = fresh as DbMember[];
              useMembers.setState({
                members: memberRows.map(memberFromDb),
              });
              // 본 PC user가 명단에서 사라졌으면 = 추방됨 → 멤버십 재조회로
              // household_id를 null로 떨어뜨려 AuthGuard가 onboarding으로 안내.
              const currentUserId = useAuth.getState().user?.id;
              if (currentUserId && !memberRows.some((r) => r.user_id === currentUserId)) {
                await useAuth.getState().refreshMembership();
              }
            }
          },
        )
        .subscribe();
      channels.push(ch);
    })(),

    // transactions
    fetchAndSubscribe<DbTx, Transaction>({
      table: 'transactions',
      household_id,
      order: { column: 'date', ascending: false },
      fromDb: txFromDb,
      getId: (t) => t.id,
      setAll: (items) => useTransactions.setState({ transactions: items }),
      insertOne: (tx) => {
        const s = useTransactions.getState();
        if (!s.transactions.find((t) => t.id === tx.id)) {
          useTransactions.setState({ transactions: [tx, ...s.transactions] });
        }
      },
      updateOne: (tx) => {
        useTransactions.setState((s) => ({
          transactions: s.transactions.map((t) => (t.id === tx.id ? tx : t)),
        }));
      },
      removeOne: (id) => {
        useTransactions.setState((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        }));
      },
    }),

    // accounts
    fetchAndSubscribe<DbAccount, Account>({
      table: 'accounts',
      household_id,
      fromDb: accountFromDb,
      getId: (a) => a.id,
      setAll: (items) => useAccounts.setState({ accounts: items }),
      insertOne: (a) => {
        const s = useAccounts.getState();
        if (!s.accounts.find((x) => x.id === a.id)) {
          useAccounts.setState({ accounts: [...s.accounts, a] });
        }
      },
      updateOne: (a) => {
        useAccounts.setState((s) => ({
          accounts: s.accounts.map((x) => (x.id === a.id ? a : x)),
        }));
      },
      removeOne: (id) => {
        useAccounts.setState((s) => ({ accounts: s.accounts.filter((x) => x.id !== id) }));
      },
    }),

    // budgets (id 컬럼이 없는 upsert 패턴이라 별도 처리)
    (async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('household_id', household_id);
      if (error) {
        console.error('[sync] budgets fetch failed', error);
        return;
      }
      useBudgets.setState({ budgets: (data as DbBudget[]).map(budgetFromDb) });

      const ch = supabase
        .channel(`budgets-${household_id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'budgets',
            filter: `household_id=eq.${household_id}`,
          },
          async () => {
            // 단순히 전체 재fetch (예산은 양 적음)
            const { data: fresh } = await supabase
              .from('budgets')
              .select('*')
              .eq('household_id', household_id);
            if (fresh) useBudgets.setState({ budgets: (fresh as DbBudget[]).map(budgetFromDb) });
          },
        )
        .subscribe();
      channels.push(ch);
    })(),

    // goals
    fetchAndSubscribe<DbGoal, Goal>({
      table: 'goals',
      household_id,
      fromDb: goalFromDb,
      getId: (g) => g.id,
      setAll: (items) => useGoals.setState({ goals: items }),
      insertOne: (g) => {
        const s = useGoals.getState();
        if (!s.goals.find((x) => x.id === g.id)) {
          useGoals.setState({ goals: [...s.goals, g] });
        }
      },
      updateOne: (g) => {
        useGoals.setState((s) => ({
          goals: s.goals.map((x) => (x.id === g.id ? g : x)),
        }));
      },
      removeOne: (id) => {
        useGoals.setState((s) => ({ goals: s.goals.filter((x) => x.id !== id) }));
      },
    }),

    // upcoming
    fetchAndSubscribe<DbUpcoming, Upcoming>({
      table: 'upcoming',
      household_id,
      order: { column: 'due_date', ascending: true },
      fromDb: upcomingFromDb,
      getId: (u) => u.id,
      setAll: (items) => useUpcoming.setState({ upcoming: items }),
      insertOne: (u) => {
        const s = useUpcoming.getState();
        if (!s.upcoming.find((x) => x.id === u.id)) {
          useUpcoming.setState({ upcoming: [...s.upcoming, u] });
        }
      },
      updateOne: (u) => {
        useUpcoming.setState((s) => ({
          upcoming: s.upcoming.map((x) => (x.id === u.id ? u : x)),
        }));
      },
      removeOne: (id) => {
        useUpcoming.setState((s) => ({ upcoming: s.upcoming.filter((x) => x.id !== id) }));
      },
    }),
  ]);

  // 직렬화 토큰 확인 — Promise.all 동안 새 호출이 들어왔다면 우리가 만든 채널만 정리
  if (myToken !== syncToken) {
    // 우리가 만든 채널은 channels 배열에 푸시됐을 텐데, 새 호출의 stopServerSync에서
    // 이미 비웠을 가능성이 큼. 안전을 위해 한 번 더 정리.
    await stopServerSync();
  }
}

export async function stopServerSync() {
  for (const ch of channels) {
    try { await ch.unsubscribe(); } catch { /* ignore */ }
  }
  channels.length = 0;
}

// CRUD 함수들 (호환성)
export { serverAddTx, serverUpdateTx, serverRemoveTx } from './txServer';
