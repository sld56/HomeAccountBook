// 서버 모드 거래 CRUD — transactionStore의 순환 import 회피용 별도 파일.
// 의존: supabase 클라이언트 + authStore. transactionStore에 의존하지 않음.

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/authStore';
import type { Transaction } from '@/types/domain';

export async function serverAddTx(tx: Omit<Transaction, 'id'>): Promise<void> {
  const { household_id, user } = useAuth.getState();
  if (!household_id || !user) throw new Error('not authenticated');
  const { error } = await supabase.from('transactions').insert({
    household_id,
    date: tx.date,
    kind: tx.kind,
    amount: tx.amount,
    cat: tx.cat,
    title: tx.title,
    memo: tx.memo ?? null,
    member_id: tx.member || user.id,
    account_id: tx.account || null,
    created_by: user.id,
  });
  if (error) throw error;
}

export async function serverUpdateTx(id: string, patch: Partial<Transaction>): Promise<void> {
  const { user } = useAuth.getState();
  if (!user) throw new Error('not authenticated');
  const payload: Record<string, unknown> = { updated_by: user.id };
  if (patch.date !== undefined) payload.date = patch.date;
  if (patch.kind !== undefined) payload.kind = patch.kind;
  if (patch.amount !== undefined) payload.amount = patch.amount;
  if (patch.cat !== undefined) payload.cat = patch.cat;
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.memo !== undefined) payload.memo = patch.memo ?? null;
  if (patch.account !== undefined) payload.account_id = patch.account || null;
  if (patch.member !== undefined) payload.member_id = patch.member || null;

  const { error } = await supabase.from('transactions').update(payload).eq('id', id);
  if (error) throw error;
}

export async function serverRemoveTx(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}
