import type { Account } from '@/types/domain';

export const ACCOUNTS: Account[] = [
  {
    id: 'kb-main',
    label: '국민은행 주거래',
    type: '입출금',
    bank: '국민',
    balance: 8_520_000,
    color: '#f6c200',
  },
  {
    id: 'shinhan',
    label: '신한 생활비',
    type: '입출금',
    bank: '신한',
    balance: 2_180_000,
    color: '#0046ff',
  },
  {
    id: 'nh-saving',
    label: '농협 적금',
    type: '적금',
    bank: '농협',
    balance: 12_400_000,
    color: '#3aa15f',
  },
  {
    id: 'kb-card',
    label: 'KB국민카드',
    type: '카드',
    bank: '국민',
    balance: -728_400,
    color: '#444',
    limit: 3_000_000,
  },
  { id: 'cash', label: '현금', type: '현금', bank: '현금', balance: 134_000, color: '#a0958a' },
];

export const ACCOUNTS_BY_ID: Record<string, Account> = Object.fromEntries(
  ACCOUNTS.map((a) => [a.id, a]),
);
