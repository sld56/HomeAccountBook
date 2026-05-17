import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Budget } from '@/types/domain';
import { BUDGETS as seedBudgets } from '@/data/budgets';
import { isServerConfigured } from '@/lib/supabase';
import { useAuth } from '@/features/auth/authStore';
import { serverUpdateBudget, serverRemoveBudget } from './budgetServer';

type State = {
  budgets: Budget[];
  upsert: (cat: string, ym: string | null, limit: number) => Promise<void>;
  remove: (cat: string, ym: string | null) => Promise<void>;
};

const initialBudgets: Budget[] =
  isServerConfigured ? [] : import.meta.env.DEV ? seedBudgets : [];

function isServerActive(): boolean {
  return isServerConfigured && useAuth.getState().household_id !== null;
}

export const useBudgets = create<State>()(
  persist(
    (set, get) => ({
      budgets: initialBudgets,
      upsert: async (cat, ym, limit) => {
        if (isServerActive()) {
          await serverUpdateBudget(cat, ym, limit);
          return;
        }
        const exists = get().budgets.find((b) => b.cat === cat && (b.ym ?? null) === ym);
        if (exists) {
          set((s) => ({
            budgets: s.budgets.map((b) =>
              b.cat === cat && (b.ym ?? null) === ym ? { ...b, limit } : b,
            ),
          }));
        } else {
          set((s) => ({
            budgets: [...s.budgets, { cat: cat as Budget['cat'], limit, ym: ym ?? undefined }],
          }));
        }
      },
      remove: async (cat, ym) => {
        if (isServerActive()) {
          await serverRemoveBudget(cat, ym);
          return;
        }
        set((s) => ({
          budgets: s.budgets.filter((b) => !(b.cat === cat && (b.ym ?? null) === ym)),
        }));
      },
    }),
    { name: 'gagyebu-budgets', skipHydration: isServerConfigured },
  ),
);
