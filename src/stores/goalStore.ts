import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Goal } from '@/types/domain';
import { GOALS as seedGoals } from '@/data/goals';
import { isServerConfigured } from '@/lib/supabase';
import { useAuth } from '@/features/auth/authStore';
import { serverAddGoal, serverUpdateGoal, serverRemoveGoal } from './goalServer';

type State = {
  goals: Goal[];
  add: (g: Omit<Goal, 'id'>) => Promise<void>;
  update: (id: string, patch: Partial<Goal>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const initialGoals: Goal[] =
  isServerConfigured ? [] : import.meta.env.DEV ? seedGoals : [];

function isServerActive(): boolean {
  return isServerConfigured && useAuth.getState().household_id !== null;
}

export const useGoals = create<State>()(
  persist(
    (set) => ({
      goals: initialGoals,
      add: async (g) => {
        if (isServerActive()) {
          await serverAddGoal(g);
          return;
        }
        set((s) => ({
          goals: [
            ...s.goals,
            { ...g, id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
          ],
        }));
      },
      update: async (id, patch) => {
        if (isServerActive()) {
          await serverUpdateGoal(id, patch);
          return;
        }
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        }));
      },
      remove: async (id) => {
        if (isServerActive()) {
          await serverRemoveGoal(id);
          return;
        }
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
      },
    }),
    { name: 'gagyebu-goals', skipHydration: isServerConfigured },
  ),
);
