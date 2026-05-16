import type { Goal } from '@/types/domain';

export const GOALS: Goal[] = [
  {
    id: 'g1',
    title: '손주 학자금',
    saved: 6_400_000,
    target: 20_000_000,
    monthly: 300_000,
    color: 'var(--sage)',
  },
  {
    id: 'g2',
    title: '제주 가족여행',
    saved: 1_350_000,
    target: 3_000_000,
    monthly: 150_000,
    color: 'var(--sky)',
  },
  {
    id: 'g3',
    title: '비상금',
    saved: 4_650_000,
    target: 10_000_000,
    monthly: 200_000,
    color: 'var(--amber)',
  },
];
