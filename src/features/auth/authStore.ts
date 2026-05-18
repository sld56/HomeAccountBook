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

// 로그아웃 시 비울 zustand persist 키. 가족이 같은 브라우저로 들어와도
// 이전 사용자 데이터가 잔존하지 않게 함. 서버 모드에선 sync가 다시
// 채워주므로 안전.
const PERSIST_KEYS_TO_CLEAR = [
  'gagyebu-transactions',
  'gagyebu-accounts',
  'gagyebu-budgets',
  'gagyebu-goals',
  'gagyebu-upcoming',
  'gagyebu-members',
  'gagyebu-migrated-at',
];

// HMR/StrictMode에서 init이 두 번 호출되면 listener도 중복 등록되는 문제
// 방지용 모듈 레벨 변수.
let authListener: { unsubscribe: () => void } | null = null;

export const useAuth = create<State>((set, get) => ({
  loading: true,
  membershipChecked: false,
  user: null,
  session: null,
  household_id: null,
  membership: null,

  init: async () => {
    // 이전 listener가 있으면 정리 (HMR/StrictMode 대비)
    if (authListener) {
      authListener.unsubscribe();
      authListener = null;
    }

    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user ?? null });

    const sub = supabase.auth.onAuthStateChange(async (_event, session) => {
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
    authListener = sub.data.subscription;

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
    // 로컬에 남은 이전 사용자 데이터 정리 — 다른 가족이 같은 브라우저로
    // 들어와도 직전 데이터가 잠시 비치지 않게.
    try {
      for (const k of PERSIST_KEYS_TO_CLEAR) {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      }
    } catch {
      /* 일부 브라우저에서 storage 접근 거부될 수 있음 — 무시 */
    }
    set({
      user: null,
      session: null,
      household_id: null,
      membership: null,
      membershipChecked: true,
    });
    // in-memory zustand 스토어들도 비우기 위해 가장 안전한 방법은 페이지 새로고침.
    // 직접 import하면 순환 의존이라, location.replace로 깔끔하게 초기화.
    if (typeof window !== 'undefined') {
      window.location.replace('/');
    }
  },
}));
