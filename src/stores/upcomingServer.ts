import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/authStore';
import type { Upcoming } from '@/types/domain';

export async function serverAddUpcoming(input: Omit<Upcoming, 'id'>): Promise<void> {
  const { household_id } = useAuth.getState();
  if (!household_id) throw new Error('not authenticated');
  const { error } = await supabase.from('upcoming').insert({
    household_id,
    label: input.label,
    due_date: input.date,
    amount: input.amount,
    cat: input.cat,
    autopay: input.autopay ?? false,
  });
  if (error) throw error;
}

export async function serverUpdateUpcoming(id: string, patch: Partial<Upcoming>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.label !== undefined) payload.label = patch.label;
  if (patch.date !== undefined) payload.due_date = patch.date;
  if (patch.amount !== undefined) payload.amount = patch.amount;
  if (patch.cat !== undefined) payload.cat = patch.cat;
  if (patch.autopay !== undefined) payload.autopay = patch.autopay;
  const { error } = await supabase.from('upcoming').update(payload).eq('id', id);
  if (error) throw error;
}

export async function serverRemoveUpcoming(id: string): Promise<void> {
  const { error } = await supabase.from('upcoming').delete().eq('id', id);
  if (error) throw error;
}
