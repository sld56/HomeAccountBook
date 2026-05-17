import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Account } from '@/types/domain';
import { ACCOUNTS as seedAccounts } from '@/data/accounts';
import { isServerConfigured } from '@/lib/supabase';
import { useAuth } from '@/features/auth/authStore';
import { serverAddAccount, serverUpdateAccount, serverRemoveAccount } from './accountServer';

type State = {
  accounts: Account[];
  add: (a: Omit<Account, 'id'>) => Promise<void>;
  update: (id: string, patch: Partial<Account>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const initialAccounts: Account[] =
  isServerConfigured ? [] : import.meta.env.DEV ? seedAccounts : [];

function isServerActive(): boolean {
  return isServerConfigured && useAuth.getState().household_id !== null;
}

export const useAccounts = create<State>()(
  persist(
    (set) => ({
      accounts: initialAccounts,
      add: async (a) => {
        if (isServerActive()) {
          await serverAddAccount(a);
          return;
        }
        set((s) => ({
          accounts: [
            ...s.accounts,
            { ...a, id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
          ],
        }));
      },
      update: async (id, patch) => {
        if (isServerActive()) {
          await serverUpdateAccount(id, patch);
          return;
        }
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }));
      },
      remove: async (id) => {
        if (isServerActive()) {
          await serverRemoveAccount(id);
          return;
        }
        set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) }));
      },
    }),
    { name: 'gagyebu-accounts', skipHydration: isServerConfigured },
  ),
);

export function accountById(id: string): Account | undefined {
  return useAccounts.getState().accounts.find((a) => a.id === id);
}
