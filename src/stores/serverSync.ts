// Supabase ↔ Zustand 동기화 어댑터
// 사용 방침: isServerConfigured + 인증 사용자가 있을 때만 활성.
// 활성 시 transactionStore의 동작을 Supabase로 우회시키고, 초기 fetch + realtime을 구독.

import { supabase, isServerConfigured } from '@/lib/supabase';
import { useAuth } from '@/features/auth/authStore';
import { useTransactions } from './transactionStore';
import type { Transaction } from '@/types/domain';

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

type DbTx = {
  id: string;
  household_id: string;
  date: string;
  kind: 'in' | 'out';
  amount: number;
  cat: string;
  title: string;
  memo: string | null;
  member_id: string | null;
  account_id: string | null;
};

function fromDb(row: DbTx): Transaction {
  return {
    id: row.id,
    date: row.date,
    kind: row.kind,
    amount: row.amount,
    cat: row.cat as Transaction['cat'],
    title: row.title,
    memo: row.memo ?? undefined,
    member: row.member_id ?? '',
    account: row.account_id ?? '',
  };
}

export async function startServerSync() {
  if (!isServerConfigured) return;
  const { household_id, user } = useAuth.getState();
  if (!household_id || !user) return;

  // 1. 초기 fetch
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('household_id', household_id)
    .order('date', { ascending: false });

  if (error) {
    console.error('[sync] initial fetch failed', error);
    return;
  }

  useTransactions.setState({ transactions: (data as DbTx[]).map(fromDb) });

  // 2. 실시간 구독
  if (realtimeChannel) await realtimeChannel.unsubscribe();
  realtimeChannel = supabase
    .channel(`tx-${household_id}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transactions', filter: `household_id=eq.${household_id}` },
      (payload) => {
        const store = useTransactions.getState();
        if (payload.eventType === 'INSERT') {
          const tx = fromDb(payload.new as DbTx);
          if (!store.transactions.find((t) => t.id === tx.id)) {
            useTransactions.setState({ transactions: [tx, ...store.transactions] });
          }
        } else if (payload.eventType === 'UPDATE') {
          const tx = fromDb(payload.new as DbTx);
          useTransactions.setState({
            transactions: store.transactions.map((t) => (t.id === tx.id ? tx : t)),
          });
        } else if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id: string }).id;
          useTransactions.setState({
            transactions: store.transactions.filter((t) => t.id !== id),
          });
        }
      },
    )
    .subscribe();
}

export async function stopServerSync() {
  if (realtimeChannel) {
    await realtimeChannel.unsubscribe();
    realtimeChannel = null;
  }
}

// CRUD 함수들은 src/stores/txServer.ts에 분리되어 있음 (순환 import 회피)
export { serverAddTx, serverUpdateTx, serverRemoveTx } from './txServer';
