import type { Upcoming } from '@/types/domain';

export const UPCOMING: Upcoming[] = [
  { id: 'u1', label: '아파트 관리비', date: '2026-05-25', amount: 145_000, cat: 'utility', autopay: true },
  { id: 'u2', label: '인터넷 + TV', date: '2026-05-26', amount: 42_000, cat: 'utility', autopay: true },
  { id: 'u3', label: '실손보험', date: '2026-05-27', amount: 88_000, cat: 'medical', autopay: true },
  { id: 'u4', label: '대현 학원비', date: '2026-05-28', amount: 320_000, cat: 'edu', autopay: false },
  { id: 'u5', label: '휴대폰 요금', date: '2026-05-30', amount: 56_000, cat: 'utility', autopay: true },
];
