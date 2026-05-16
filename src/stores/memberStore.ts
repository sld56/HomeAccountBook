import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Member } from '@/types/domain';
import { MEMBERS } from '@/data/members';

type State = {
  members: Member[];
  selectedMember: string;
  addMember: (m: Omit<Member, 'id'>) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  removeMember: (id: string) => void;
  selectMember: (id: string) => void;
};

export const useMembers = create<State>()(
  persist(
    (set) => ({
      members: MEMBERS,
      selectedMember: 'all',
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
    { name: 'gagyebu-members' },
  ),
);
