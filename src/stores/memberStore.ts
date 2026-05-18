import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Member } from '@/types/domain';
import { MEMBERS } from '@/data/members';
import { isServerConfigured } from '@/lib/supabase';

type State = {
  members: Member[];
  selectedMember: string;
  setMembers: (members: Member[]) => void;
  addMember: (m: Omit<Member, 'id'>) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  removeMember: (id: string) => void;
  selectMember: (id: string) => void;
};

// 서버 모드에선 시드 멤버를 사용하지 않음 (server household_members가 source of truth)
// 로컬 모드 + DEV에서만 시드 사용 — 시드 ID('appa' 등)는 서버 UUID와 호환되지 않음
const initialMembers: Member[] =
  isServerConfigured ? [] : import.meta.env.DEV ? MEMBERS : [];

export const useMembers = create<State>()(
  persist(
    (set) => ({
      members: initialMembers,
      selectedMember: 'all',
      setMembers: (members) => set({ members }),
      addMember: (m) =>
        set((s) => ({
          members: [
            ...s.members,
            { ...m, id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` },
          ],
        })),
      updateMember: (id, patch) =>
        set((s) => ({
          members: s.members.map((mem) => (mem.id === id ? { ...mem, ...patch } : mem)),
        })),
      removeMember: (id) =>
        set((s) => ({
          members: s.members.filter((mem) => mem.id !== id),
        })),
      selectMember: (id) => set({ selectedMember: id }),
    }),
    { name: 'gagyebu-members', skipHydration: isServerConfigured },
  ),
);
