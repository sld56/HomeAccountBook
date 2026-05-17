import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Membership = {
  household_id: string;
  role: 'owner' | 'member';
  display_name: string;
  short: string;
  color_key: 'appa' | 'eomma' | 'deahyun' | 'jiwon';
};

type State = {
  loading: boolean;
  membershipChecked: boolean;
  user: User | null;
  session: Session | null;
  household_id: string | null;
  membership: Membership | null;
  init: () => Promise<void>;
  refreshMembership: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<State>((set, get) => ({
  loading: true,
  membershipChecked: false,
  user: null,
  session: null,
  household_id: null,
  membership: null,

  init: async () => {
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        // 새 로그인/세션 변경 — 멤버십 다시 조회 (await로 race 방지)
        set({ membershipChecked: false });
        await get().refreshMembership();
        set({ membershipChecked: true });
      } else {
        set({ household_id: null, membership: null, membershipChecked: true });
      }
    });

    if (data.session?.user) {
      await get().refreshMembership();
    }
    set({ loading: false, membershipChecked: true });
  },

  refreshMembership: async () => {
    const user = get().user;
    if (!user) {
      set({ household_id: null, membership: null });
      return;
    }
    const { data, error } = await supabase
      .from('household_members')
      .select('household_id, role, display_name, short, color_key')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('[auth] refreshMembership', error);
      return;
    }
    if (data) {
      set({ household_id: data.household_id, membership: data as Membership });
    } else {
      set({ household_id: null, membership: null });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      user: null,
      session: null,
      household_id: null,
      membership: null,
      membershipChecked: true,
    });
  },
}));
