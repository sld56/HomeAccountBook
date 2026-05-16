// Supabase 자동 생성 타입을 위한 placeholder.
// M5 실배포 시 다음 명령으로 갱신:
//   npx supabase gen types typescript --local > src/types/supabase.ts

export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          created_by: string;
        };
        Update: Partial<{
          name: string;
        }>;
      };
      household_members: {
        Row: {
          household_id: string;
          user_id: string;
          role: 'owner' | 'member';
          display_name: string;
          short: string;
          color_key: 'appa' | 'eomma' | 'deahyun' | 'jiwon';
          joined_at: string;
        };
        Insert: {
          household_id: string;
          user_id: string;
          role: 'owner' | 'member';
          display_name: string;
          short: string;
          color_key: 'appa' | 'eomma' | 'deahyun' | 'jiwon';
        };
        Update: Partial<{
          display_name: string;
          short: string;
          color_key: 'appa' | 'eomma' | 'deahyun' | 'jiwon';
        }>;
      };
      accounts: {
        Row: {
          id: string;
          household_id: string;
          label: string;
          type: '입출금' | '적금' | '카드' | '현금';
          bank: string;
          balance: number;
          color: string;
          card_limit: number | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['accounts']['Row'],
          'id' | 'created_at' | 'updated_at' | 'updated_by'
        > & { id?: string };
        Update: Partial<Database['public']['Tables']['accounts']['Row']>;
      };
      transactions: {
        Row: {
          id: string;
          household_id: string;
          date: string;
          kind: 'in' | 'out';
          amount: number;
          cat: string;
          title: string;
          memo: string | null;
          member_id: string | null;
          account_id: string | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['transactions']['Row'],
          'id' | 'created_at' | 'updated_at' | 'updated_by'
        > & { id?: string };
        Update: Partial<Database['public']['Tables']['transactions']['Row']>;
      };
      budgets: {
        Row: {
          id: string;
          household_id: string;
          cat: string;
          budget_limit: number;
          ym: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['budgets']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string };
        Update: Partial<Database['public']['Tables']['budgets']['Row']>;
      };
      goals: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          saved: number;
          target: number;
          monthly: number;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['goals']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string };
        Update: Partial<Database['public']['Tables']['goals']['Row']>;
      };
      upcoming: {
        Row: {
          id: string;
          household_id: string;
          label: string;
          due_date: string;
          amount: number;
          cat: string;
          autopay: boolean;
          created_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['upcoming']['Row'],
          'id' | 'created_at'
        > & { id?: string };
        Update: Partial<Database['public']['Tables']['upcoming']['Row']>;
      };
    };
  };
};
