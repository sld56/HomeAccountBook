import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/authStore';
import type { Goal } from '@/types/domain';

export async function serverAddGoal(input: Omit<Goal, 'id'>): Promise<void> {
  const { household_id } = useAuth.getState();
  if (!household_id) throw new Error('not authenticated');
  const { error } = await supabase.from('goals').insert({
    household_id,
    title: input.title,
    saved: input.saved,
    target: input.target,
    monthly: input.monthly,
    color: input.color,
  });
  if (error) throw error;
}

export async function serverUpdateGoal(id: string, patch: Partial<Goal>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.saved !== undefined) payload.saved = patch.saved;
  if (patch.target !== undefined) payload.target = patch.target;
  if (patch.monthly !== undefined) payload.monthly = patch.monthly;
  if (patch.color !== undefined) payload.color = patch.color;
  const { error } = await supabase.from('goals').update(payload).eq('id', id);
  if (error) throw error;
}

export async function serverRemoveGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) throw error;
}
