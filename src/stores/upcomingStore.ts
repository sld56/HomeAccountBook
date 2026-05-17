import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Upcoming } from '@/types/domain';
import { UPCOMING as seedUpcoming } from '@/data/upcoming';
import { isServerConfigured } from '@/lib/supabase';
import { useAuth } from '@/features/auth/authStore';
import { serverAddUpcoming, serverUpdateUpcoming, serverRemoveUpcoming } from './upcomingServer';

type State = {
  upcoming: Upcoming[];
  add: (u: Omit<Upcoming, 'id'>) => Promise<void>;
  update: (id: string, patch: Partial<Upcoming>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const initialUpcoming: Upcoming[] =
  isServerConfigured ? [] : import.meta.env.DEV ? seedUpcoming : [];

function isServerActive(): boolean {
  return isServerConfigured && useAuth.getState().household_id !== null;
}

export const useUpcoming = create<State>()(
  persist(
    (set) => ({
      upcoming: initialUpcoming,
      add: async (u) => {
        if (isServerActive()) {
          await serverAddUpcoming(u);
          return;
        }
        set((s) => ({
          upcoming: [
            ...s.upcoming,
            { ...u, id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
          ],
        }));
      },
      update: async (id, patch) => {
        if (isServerActive()) {
          await serverUpdateUpcoming(id, patch);
          return;
        }
        set((s) => ({
          upcoming: s.upcoming.map((u) => (u.id === id ? { ...u, ...patch } : u)),
        }));
      },
      remove: async (id) => {
        if (isServerActive()) {
          await serverRemoveUpcoming(id);
          return;
        }
        set((s) => ({ upcoming: s.upcoming.filter((u) => u.id !== id) }));
      },
    }),
    { name: 'gagyebu-upcoming', skipHydration: isServerConfigured },
  ),
);
