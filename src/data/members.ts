import type { Member } from '@/types/domain';

export const MEMBERS: Member[] = [
  { id: 'appa', name: '아버지', short: '父', role: '가장', colorKey: 'appa' },
  { id: 'eomma', name: '어머니', short: '母', role: '가장', colorKey: 'eomma' },
  { id: 'deahyun', name: '대현', short: '대', role: '자녀', colorKey: 'deahyun' },
  { id: 'jiwon', name: '지원', short: '지', role: '자녀', colorKey: 'jiwon' },
];

export const MEMBERS_BY_ID: Record<string, Member> = Object.fromEntries(
  MEMBERS.map((m) => [m.id, m]),
);
