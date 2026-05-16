import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Transaction } from '@/types/domain';
import { seedTransactions } from '@/data/transactions';
import { isServerConfigured } from '@/lib/supabase';
import { useAuth } from '@/features/auth/authStore';
import { serverAddTx, serverUpdateTx, serverRemoveTx } from './txServer';

type State = {
  transactions: Transaction[];
  add: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  update: (id: string, patch: Partial<Transaction>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

// 서버 모드에선 시드 데이터를 채우지 않음 (실데이터만)
// 로컬 모드에선 DEV 빌드에만 시드 채움
const initialTransactions: Transaction[] =
  isServerConfigured ? [] : import.meta.env.DEV ? seedTransactions : [];

function isServerActive(): boolean {
  return isServerConfigured && useAuth.getState().household_id !== null;
}

export const useTransactions = create<State>()(
  persist(
    (set) => ({
      transactions: initialTransactions,

      add: async (tx) => {
        if (isServerActive()) {
          await serverAddTx(tx);
          // 실시간 구독이 store를 갱신함 (낙관적 업데이트는 일관성 위해 생략)
          return;
        }
        set((s) => ({
          transactions: [
            { ...tx, id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
            ...s.transactions,
          ],
        }));
      },

      update: async (id, patch) => {
        if (isServerActive()) {
          await serverUpdateTx(id, patch);
          return;
        }
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        }));
      },

      remove: async (id) => {
        if (isServerActive()) {
          await serverRemoveTx(id);
          return;
        }
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== id),
        }));
      },
    }),
    {
      name: 'gagyebu-transactions',
      // 서버 모드에선 LocalStorage 사용 안 함 (서버가 source of truth)
      skipHydration: isServerConfigured,
    },
  ),
);
