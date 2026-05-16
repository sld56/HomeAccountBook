import type { Budget } from '@/types/domain';

export const BUDGETS: Budget[] = [
  { cat: 'food', limit: 800_000 },
  { cat: 'transport', limit: 200_000 },
  { cat: 'medical', limit: 300_000 },
  { cat: 'utility', limit: 350_000 },
  { cat: 'leisure', limit: 200_000 },
  { cat: 'shopping', limit: 250_000 },
  { cat: 'edu', limit: 400_000 },
  { cat: 'other', limit: 100_000 },
];

export const TOTAL_BUDGET = BUDGETS.reduce((sum, b) => sum + b.limit, 0);
