import type { Category, CategoryId } from '@/types/domain';

export const CATEGORIES: Record<CategoryId, Category> = {
  food: { id: 'food', label: '식비', color: 'var(--cat-food)', emoji: '🍚', kind: 'out' },
  transport: {
    id: 'transport',
    label: '교통',
    color: 'var(--cat-transport)',
    emoji: '🚌',
    kind: 'out',
  },
  medical: {
    id: 'medical',
    label: '의료/약',
    color: 'var(--cat-medical)',
    emoji: '💊',
    kind: 'out',
  },
  utility: {
    id: 'utility',
    label: '공과금',
    color: 'var(--cat-utility)',
    emoji: '💡',
    kind: 'out',
  },
  leisure: {
    id: 'leisure',
    label: '여가',
    color: 'var(--cat-leisure)',
    emoji: '🎬',
    kind: 'out',
  },
  shopping: {
    id: 'shopping',
    label: '쇼핑',
    color: 'var(--cat-shopping)',
    emoji: '🛍️',
    kind: 'out',
  },
  edu: { id: 'edu', label: '교육', color: 'var(--cat-edu)', emoji: '📚', kind: 'out' },
  other: { id: 'other', label: '기타', color: 'var(--cat-other)', emoji: '📌', kind: 'out' },
  salary: { id: 'salary', label: '월급', color: 'var(--sage)', emoji: '💼', kind: 'in' },
  pension: { id: 'pension', label: '연금', color: 'var(--sky)', emoji: '🏦', kind: 'in' },
  side: { id: 'side', label: '부수입', color: 'var(--amber)', emoji: '💰', kind: 'in' },
};

export const EXPENSE_CATEGORIES: CategoryId[] = [
  'food',
  'transport',
  'medical',
  'utility',
  'leisure',
  'shopping',
  'edu',
  'other',
];

export const INCOME_CATEGORIES: CategoryId[] = ['salary', 'pension', 'side'];
