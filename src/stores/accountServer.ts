// 서버 모드 계좌 CRUD — 순환 import 회피를 위해 분리

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/authStore';
import type { Account } from '@/types/domain';

export type AccountInput = Omit<Account, 'id'>;

export async function serverAddAccount(input: AccountInput): Promise<void> {
  const { household_id, user } = useAuth.getState();
  if (!household_id || !user) throw new Error('not authenticated');
  const { error } = await supabase.from('accounts').insert({
    household_id,
    label: input.label,
    type: input.type,
    bank: input.bank,
    balance: input.balance,
    color: input.color,
    card_limit: input.limit ?? null,
    created_by: user.id,
  });
  if (error) throw error;
}

export async function serverUpdateAccount(id: string, patch: Partial<Account>): Promise<void> {
  const { user } = useAuth.getState();
  if (!user) throw new Error('not authenticated');
  const payload: Record<string, unknown> = { updated_by: user.id };
  if (patch.label !== undefined) payload.label = patch.label;
  if (patch.type !== undefined) payload.type = patch.type;
  if (patch.bank !== undefined) payload.bank = patch.bank;
  if (patch.balance !== undefined) payload.balance = patch.balance;
  if (patch.color !== undefined) payload.color = patch.color;
  if (patch.limit !== undefined) payload.card_limit = patch.limit;
  const { error } = await supabase.from('accounts').update(payload).eq('id', id);
  if (error) throw error;
}

export async function serverRemoveAccount(id: string): Promise<void> {
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw error;
}
