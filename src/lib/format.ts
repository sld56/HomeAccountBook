import type { CurrencyMode, TransactionKind } from '@/types/domain';

export const fmt = {
  money(n: number, mode: CurrencyMode = 'won'): string {
    const abs = Math.abs(Math.round(n));
    const formatted = abs.toLocaleString('ko-KR');
    const sign = n < 0 ? '-' : '';
    if (mode === 'symbol') return `${sign}₩${formatted}`;
    if (mode === 'korean') return `${sign}${fmt.korean(abs)}`;
    return `${sign}${formatted}원`;
  },

  korean(n: number): string {
    if (n === 0) return '0원';
    const eok = Math.floor(n / 100_000_000);
    const man = Math.floor((n % 100_000_000) / 10_000);
    const rem = n % 10_000;
    const parts: string[] = [];
    if (eok) parts.push(`${eok}억`);
    if (man) parts.push(`${man.toLocaleString('ko-KR')}만`);
    if (rem || parts.length === 0) parts.push(`${rem.toLocaleString('ko-KR')}원`);
    return parts.join(' ');
  },

  signed(n: number, kind: TransactionKind, mode: CurrencyMode = 'won'): string {
    const s = kind === 'in' ? '+' : '−';
    return `${s}${fmt.money(n, mode)}`;
  },

  short(n: number): string {
    const abs = Math.abs(n);
    if (abs >= 100_000_000) return `${(abs / 100_000_000).toFixed(1)}억`;
    if (abs >= 10_000) return `${Math.round(abs / 10_000)}만`;
    return abs.toLocaleString('ko-KR');
  },

  date(d: string | Date, style: 'short' | 'long' | 'day' = 'short'): string {
    const dt = typeof d === 'string' ? new Date(d) : d;
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    if (style === 'long') {
      return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${dt.getDate()}일 ${days[dt.getDay()]}요일`;
    }
    if (style === 'day') {
      return `${dt.getDate()}일 ${days[dt.getDay()]}요일`;
    }
    return `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
  },

  dayLabel(dateStr: string): string {
    const dt = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - dt.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays > 1 && diffDays <= 6) return `${diffDays}일 전`;
    return fmt.date(dateStr);
  },

  percent(n: number, fractionDigits = 0): string {
    return `${n.toFixed(fractionDigits)}%`;
  },

  ym(date: Date | string): string {
    const dt = typeof date === 'string' ? new Date(date) : date;
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
  },

  ymLabel(ym: string): string {
    const [y, m] = ym.split('-');
    return `${y.slice(2)}년 ${Number(m)}월`;
  },
};
