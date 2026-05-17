import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/authStore';
import type { Budget } from '@/types/domain';

export async function serverAddBudget(input: Budget): Promise<void> {
  const { household_id } = useAuth.getState();
  if (!household_id) throw new Error('not authenticated');
  const { error } = await supabase.from('budgets').upsert(
    {
      household_id,
      cat: input.cat,
      budget_limit: input.limit,
      ym: input.ym ?? null,
    },
    { onConflict: 'household_id,cat,ym' },
  );
  if (error) throw error;
}

export async function serverUpdateBudget(cat: string, ym: string | null, limit: number): Promise<void> {
  const { household_id } = useAuth.getState();
  if (!household_id) throw new Error('not authenticated');
  // upsert로 같은 cat+ym 있으면 갱신, 없으면 생성
  const { error } = await supabase.from('budgets').upsert(
    { household_id, cat, ym, budget_limit: limit },
    { onConflict: 'household_id,cat,ym' },
  );
  if (error) throw error;
}

export async function serverRemoveBudget(cat: string, ym: string | null): Promise<void> {
  const { household_id } = useAuth.getState();
  if (!household_id) throw new Error('not authenticated');
  let q = supabase.from('budgets').delete().eq('household_id', household_id).eq('cat', cat);
  q = ym ? q.eq('ym', ym) : q.is('ym', null);
  const { error } = await q;
  if (error) throw error;
}
