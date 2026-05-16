export type CategoryId =
  | 'food'
  | 'transport'
  | 'medical'
  | 'utility'
  | 'leisure'
  | 'shopping'
  | 'edu'
  | 'other'
  | 'salary'
  | 'pension'
  | 'side';

export type Category = {
  id: CategoryId;
  label: string;
  color: string;
  emoji: string;
  kind: 'in' | 'out';
};

export type MemberRole = '가장' | '자녀';
export type MemberColorKey = 'appa' | 'eomma' | 'deahyun' | 'jiwon';

export type Member = {
  id: string;
  name: string;
  short: string;
  role: MemberRole;
  colorKey: MemberColorKey;
};

export type AccountType = '입출금' | '적금' | '카드' | '현금';

export type Account = {
  id: string;
  label: string;
  type: AccountType;
  bank: string;
  balance: number;
  color: string;
  limit?: number;
};

export type TransactionKind = 'in' | 'out';

export type Transaction = {
  id: string;
  date: string;
  kind: TransactionKind;
  amount: number;
  cat: CategoryId;
  title: string;
  memo?: string;
  member: string;
  account: string;
};

export type Budget = {
  cat: CategoryId;
  limit: number;
  ym?: string;
};

export type Goal = {
  id: string;
  title: string;
  saved: number;
  target: number;
  monthly: number;
  color: string;
};

export type Upcoming = {
  id: string;
  label: string;
  date: string;
  amount: number;
  cat: CategoryId;
  autopay?: boolean;
};

export type CurrencyMode = 'won' | 'symbol' | 'korean';
export type DashboardLayout = 'card' | 'big' | 'family';
export type FontSizeMode = 'normal' | 'large' | 'xlarge';
