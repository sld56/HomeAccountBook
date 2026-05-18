import type { CategoryId, Transaction, TransactionKind } from '@/types/domain';

export type MonthSummary = {
  income: number;
  expense: number;
  net: number;
};

// ──────────────────────────────────────────────────────────────
// 월별 집계 (시드 MONTHLY 대신 실제 거래에서 동적 계산)
// ──────────────────────────────────────────────────────────────

export type MonthlyAggregate = {
  ym: string;
  income: number;
  expense: number;
  byCategory: Partial<Record<CategoryId, number>>;
  byMember: Record<string, number>;
};

export function aggregateMonthly(transactions: Transaction[]): MonthlyAggregate[] {
  const map = new Map<string, MonthlyAggregate>();
  for (const t of transactions) {
    const ym = t.date.slice(0, 7);
    let entry = map.get(ym);
    if (!entry) {
      entry = { ym, income: 0, expense: 0, byCategory: {}, byMember: {} };
      map.set(ym, entry);
    }
    if (t.kind === 'in') entry.income += t.amount;
    else {
      entry.expense += t.amount;
      entry.byCategory[t.cat] = (entry.byCategory[t.cat] ?? 0) + t.amount;
      if (t.member) {
        entry.byMember[t.member] = (entry.byMember[t.member] ?? 0) + t.amount;
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.ym.localeCompare(b.ym));
}

/** 최근 N개월을 빈 항목으로라도 채워서 반환 (오늘 기준 역순으로 N개월) */
export function lastNMonths(
  aggregate: MonthlyAggregate[],
  n: number,
  reference: Date = new Date(),
): MonthlyAggregate[] {
  const byYm = new Map(aggregate.map((a) => [a.ym, a]));
  const out: MonthlyAggregate[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(reference.getFullYear(), reference.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push(byYm.get(ym) ?? { ym, income: 0, expense: 0, byCategory: {}, byMember: {} });
  }
  return out;
}

/** 최근 12개월 (현재 달 포함) */
export function last12Months(aggregate: MonthlyAggregate[]): MonthlyAggregate[] {
  return lastNMonths(aggregate, 12);
}

export function monthSummary(txs: Transaction[]): MonthSummary {
  let income = 0;
  let expense = 0;
  for (const t of txs) {
    if (t.kind === 'in') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

export type CategoryTotal = {
  cat: CategoryId;
  amount: number;
  ratio: number;
};

export function byCategory(txs: Transaction[], kind: TransactionKind): CategoryTotal[] {
  const map = new Map<CategoryId, number>();
  let total = 0;
  for (const t of txs) {
    if (t.kind !== kind) continue;
    map.set(t.cat, (map.get(t.cat) ?? 0) + t.amount);
    total += t.amount;
  }
  const arr: CategoryTotal[] = [];
  for (const [cat, amount] of map) {
    arr.push({ cat, amount, ratio: total > 0 ? amount / total : 0 });
  }
  arr.sort((a, b) => b.amount - a.amount);
  return arr;
}

export type MemberTotal = {
  member: string;
  amount: number;
  ratio: number;
};

export function byMember(txs: Transaction[], kind: TransactionKind): MemberTotal[] {
  const map = new Map<string, number>();
  let total = 0;
  for (const t of txs) {
    if (t.kind !== kind) continue;
    map.set(t.member, (map.get(t.member) ?? 0) + t.amount);
    total += t.amount;
  }
  const arr: MemberTotal[] = [];
  for (const [member, amount] of map) {
    arr.push({ member, amount, ratio: total > 0 ? amount / total : 0 });
  }
  arr.sort((a, b) => b.amount - a.amount);
  return arr;
}

export type DayGroup = {
  date: string;
  items: Transaction[];
  totalIn: number;
  totalOut: number;
};

export function groupByDate(txs: Transaction[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const t of txs) {
    let g = map.get(t.date);
    if (!g) {
      g = { date: t.date, items: [], totalIn: 0, totalOut: 0 };
      map.set(t.date, g);
    }
    g.items.push(t);
    if (t.kind === 'in') g.totalIn += t.amount;
    else g.totalOut += t.amount;
  }
  const arr = Array.from(map.values());
  arr.sort((a, b) => (a.date < b.date ? 1 : -1));
  return arr;
}

export function filterByYM(txs: Transaction[], ym: string): Transaction[] {
  return txs.filter((t) => t.date.startsWith(ym));
}

export function filterByMember(txs: Transaction[], memberId: string | null): Transaction[] {
  if (!memberId || memberId === 'all') return txs;
  return txs.filter((t) => t.member === memberId);
}
