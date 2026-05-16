// POST /functions/v1/import-local
// body: { household_id, accounts: [...], transactions: [...], budgets: [...], goals: [...], upcoming: [...] }
// 클라이언트의 LocalStorage 데이터를 일괄 가져오기. 검증 후 INSERT.

import { handle, json, getCurrentUser, getServiceClient, HttpError, audit } from '../_shared/supabase.ts';

const MAX_TX = 10_000;

type Tx = {
  date: string; kind: 'in' | 'out'; amount: number; cat: string; title: string;
  memo?: string; member_id?: string; account_id?: string;
};

Deno.serve((req) => handle(req, async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'method not allowed');

  const user = await getCurrentUser(req);
  const body = await req.json().catch(() => ({}));
  const household_id: string = body.household_id;
  const txs: Tx[] = body.transactions ?? [];
  const accounts: any[] = body.accounts ?? [];
  const budgets: any[] = body.budgets ?? [];
  const goals: any[] = body.goals ?? [];
  const upcoming: any[] = body.upcoming ?? [];

  if (!household_id) throw new HttpError(400, 'household_id required');
  if (txs.length > MAX_TX) throw new HttpError(413, `too many transactions (max ${MAX_TX})`);

  const service = getServiceClient();

  // 호출자가 가족 멤버인지 검증
  const { data: mem } = await service
    .from('household_members')
    .select('user_id')
    .eq('household_id', household_id)
    .eq('user_id', user.id)
    .single();
  if (!mem) throw new HttpError(403, 'not a member of this household');

  // accounts 먼저 (transactions가 참조)
  const accountIdMap = new Map<string, string>();
  if (accounts.length) {
    const rows = accounts.map((a) => ({
      household_id,
      label: String(a.label ?? '').slice(0, 30),
      type: a.type,
      bank: String(a.bank ?? '').slice(0, 20),
      balance: Number(a.balance ?? 0),
      color: a.color ?? '#999',
      card_limit: a.limit ?? null,
      created_by: user.id,
    }));
    const { data, error } = await service.from('accounts').insert(rows).select('id');
    if (error) throw new HttpError(500, `accounts: ${error.message}`);
    accounts.forEach((a, i) => accountIdMap.set(a.id, data![i].id));
  }

  // transactions
  if (txs.length) {
    const validKinds = new Set(['in', 'out']);
    const validCats = new Set([
      'food','transport','medical','utility','leisure','shopping','edu','other',
      'salary','pension','side',
    ]);

    const rows = txs.map((t, i) => {
      if (!t.date || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) {
        throw new HttpError(400, `tx[${i}]: invalid date`);
      }
      if (!validKinds.has(t.kind)) throw new HttpError(400, `tx[${i}]: invalid kind`);
      if (!validCats.has(t.cat)) throw new HttpError(400, `tx[${i}]: invalid cat`);
      const amount = Math.abs(Math.round(Number(t.amount)));
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new HttpError(400, `tx[${i}]: invalid amount`);
      }
      const title = String(t.title ?? '').slice(0, 40);
      if (!title) throw new HttpError(400, `tx[${i}]: title required`);
      return {
        household_id,
        date: t.date,
        kind: t.kind,
        amount,
        cat: t.cat,
        title,
        memo: t.memo?.slice(0, 140) ?? null,
        member_id: null,                 // 로컬 데이터는 user_id 매핑이 없음
        account_id: t.account_id ? accountIdMap.get(t.account_id) ?? null : null,
        created_by: user.id,
      };
    });
    const { error } = await service.from('transactions').insert(rows);
    if (error) throw new HttpError(500, `transactions: ${error.message}`);
  }

  // budgets / goals / upcoming — 단순 매핑
  if (budgets.length) {
    const rows = budgets.map((b) => ({
      household_id,
      cat: b.cat,
      budget_limit: Number(b.limit ?? 0),
      ym: b.ym ?? null,
    }));
    await service.from('budgets').upsert(rows, { onConflict: 'household_id,cat,ym' });
  }
  if (goals.length) {
    const rows = goals.map((g) => ({
      household_id,
      title: String(g.title ?? '').slice(0, 30),
      saved: Number(g.saved ?? 0),
      target: Number(g.target ?? 1),
      monthly: Number(g.monthly ?? 0),
      color: g.color ?? '#9B8AC2',
    }));
    await service.from('goals').insert(rows);
  }
  if (upcoming.length) {
    const rows = upcoming.map((u) => ({
      household_id,
      label: String(u.label ?? '').slice(0, 30),
      due_date: u.date,
      amount: Number(u.amount ?? 0),
      cat: u.cat,
      autopay: !!u.autopay,
    }));
    await service.from('upcoming').insert(rows);
  }

  await audit({
    household_id,
    actor_user_id: user.id,
    action: 'import.local',
    diff: {
      counts: {
        accounts: accounts.length,
        transactions: txs.length,
        budgets: budgets.length,
        goals: goals.length,
        upcoming: upcoming.length,
      },
    },
    req,
  });

  return json({ imported: {
    accounts: accounts.length,
    transactions: txs.length,
    budgets: budgets.length,
    goals: goals.length,
    upcoming: upcoming.length,
  } });
}));
