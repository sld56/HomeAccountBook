// 통화 포맷, 날짜 헬퍼, 집계 함수

const fmt = {
  // 금액 표시: 'won' | 'symbol' | 'korean'
  money(n, mode = 'won') {
    const abs = Math.abs(Math.round(n));
    if (mode === 'korean') {
      const eok = Math.floor(abs / 100_000_000);
      const man = Math.floor((abs % 100_000_000) / 10_000);
      const rem = abs % 10_000;
      const parts = [];
      if (eok) parts.push(`${eok}억`);
      if (man) parts.push(`${man.toLocaleString()}만`);
      if (rem || (!eok && !man)) parts.push(`${rem.toLocaleString()}원`);
      else if (!rem) parts[parts.length - 1] = parts[parts.length - 1].replace('만', '만원');
      return parts.join(' ');
    }
    const formatted = abs.toLocaleString('ko-KR');
    if (mode === 'symbol') return `₩${formatted}`;
    return `${formatted}원`;
  },

  // 부호 포함 (수입은 +, 지출은 -)
  signed(n, kind, mode) {
    const s = kind === 'in' ? '+' : '−';
    return `${s}${fmt.money(n, mode)}`;
  },

  // 짧은 금액 (차트용)
  short(n) {
    const abs = Math.abs(n);
    if (abs >= 100_000_000) return `${(abs/100_000_000).toFixed(1)}억`;
    if (abs >= 10_000)     return `${Math.round(abs/10_000)}만`;
    if (abs >= 1_000)      return `${(abs/1_000).toFixed(0)}천`;
    return abs.toString();
  },

  date(d) {
    const dt = typeof d === 'string' ? new Date(d) : d;
    return `${dt.getMonth() + 1}월 ${dt.getDate()}일`;
  },

  dateLong(d) {
    const dt = typeof d === 'string' ? new Date(d) : d;
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${dt.getMonth() + 1}월 ${dt.getDate()}일 ${days[dt.getDay()]}요일`;
  },

  dayLabel(d) {
    const dt = typeof d === 'string' ? new Date(d) : d;
    const today = new Date('2026-05-12');
    const diff = Math.floor((today - dt) / 86400000);
    if (diff === 0) return '오늘';
    if (diff === 1) return '어제';
    if (diff < 7)   return `${diff}일 전`;
    return fmt.date(d);
  },

  percent(n) { return `${Math.round(n)}%`; },
};

// 집계
const stats = {
  monthSummary(txs) {
    let income = 0, expense = 0;
    for (const t of txs) {
      if (t.kind === 'in') income += t.amount;
      else expense += t.amount;
    }
    return { income, expense, net: income - expense };
  },

  byCategory(txs, kind = 'out') {
    const map = {};
    for (const t of txs) {
      if (t.kind !== kind) continue;
      map[t.cat] = (map[t.cat] || 0) + t.amount;
    }
    return Object.entries(map)
      .map(([cat, amount]) => ({ cat, amount, info: CATEGORIES[cat] }))
      .sort((a, b) => b.amount - a.amount);
  },

  byMember(txs, kind = 'out') {
    const map = {};
    for (const t of txs) {
      if (t.kind !== kind) continue;
      map[t.member] = (map[t.member] || 0) + t.amount;
    }
    return Object.entries(map)
      .map(([m, amount]) => ({ member: m, amount, info: MEMBERS[m] }))
      .sort((a, b) => b.amount - a.amount);
  },

  groupByDate(txs) {
    const map = new Map();
    for (const t of txs) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date).push(t);
    }
    return Array.from(map.entries())
      .map(([date, items]) => ({
        date,
        items,
        totalIn:  items.filter(i => i.kind === 'in').reduce((s, i) => s + i.amount, 0),
        totalOut: items.filter(i => i.kind === 'out').reduce((s, i) => s + i.amount, 0),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  },
};

Object.assign(window, { fmt, stats });
