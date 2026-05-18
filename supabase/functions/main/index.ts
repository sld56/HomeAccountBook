// Edge Function 통합 라우터
// 모든 함수를 이 파일 한곳에서 처리 — 워커 디스패치 없음, 상대 import 없음.
// supabase/edge-runtime이 이 main만 실행하고, 경로에서 함수 이름을 뽑아 직접 분기.

import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';

console.log('main edge function started');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const APP_URL = Deno.env.get('APP_URL') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const MAIL_FROM = Deno.env.get('MAIL_FROM') ?? 'noreply@example.com';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function getAuthedClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new HttpError(401, 'Missing Authorization header');
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
}

function getServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getCurrentUser(req: Request): Promise<{ id: string; email?: string }> {
  const client = getAuthedClient(req);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, 'Not authenticated');
  return { id: data.user.id, email: data.user.email };
}

async function audit(opts: {
  household_id: string | null;
  actor_user_id: string | null;
  action: string;
  target_table?: string;
  target_id?: string;
  diff?: Record<string, unknown>;
  req?: Request;
}): Promise<void> {
  const service = getServiceClient();
  const ip = opts.req?.headers.get('cf-connecting-ip') ?? opts.req?.headers.get('x-forwarded-for');
  // token_hash와 같은 직렬화 버그 회피 — Uint8Array 대신 hex string.
  // (migration 0005: ip_hash 컬럼을 text로 변경한 짝)
  let ipHashHex: string | null = null;
  if (ip) {
    const salt = new Date().toISOString().slice(0, 10);
    const data = new TextEncoder().encode(ip + salt);
    const buf = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(buf);
    ipHashHex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  const { error } = await service.from('audit_log').insert({
    household_id: opts.household_id,
    actor_user_id: opts.actor_user_id,
    action: opts.action,
    target_table: opts.target_table,
    target_id: opts.target_id,
    diff: opts.diff ?? null,
    ip_hash: ipHashHex,
    user_agent: opts.req?.headers.get('user-agent')?.slice(0, 200),
  });
  // 사용자 mutation은 성공해도 감사 로그가 silently 깨지지 않도록 명시 로그
  if (error) console.error('[audit] insert failed:', error.message);
}

// ──────────────────────────────────────────────────────────────
// 핸들러
// ──────────────────────────────────────────────────────────────

async function createHousehold(req: Request): Promise<Response> {
  const user = await getCurrentUser(req);
  const body = await req.json().catch(() => ({}));
  const name = (body.name ?? '').trim();
  const displayName = (body.display_name ?? '').trim();
  const short = (body.short ?? '').trim().slice(0, 2);
  const colorKey = body.color_key ?? 'appa';

  if (!name || name.length > 40) throw new HttpError(400, 'invalid household name');
  if (!displayName || displayName.length > 20) throw new HttpError(400, 'invalid display_name');
  if (!short) throw new HttpError(400, 'invalid short');
  if (!['appa', 'eomma', 'deahyun', 'jiwon'].includes(colorKey)) {
    throw new HttpError(400, 'invalid color_key');
  }

  const service = getServiceClient();

  const { data: hh, error: hhErr } = await service
    .from('households')
    .insert({ name, created_by: user.id })
    .select('id')
    .single();
  if (hhErr || !hh) throw new HttpError(500, `failed to create household: ${hhErr?.message}`);

  const { error: memErr } = await service.from('household_members').insert({
    household_id: hh.id,
    user_id: user.id,
    role: 'owner',
    display_name: displayName,
    short,
    color_key: colorKey,
  });
  if (memErr) {
    await service.from('households').delete().eq('id', hh.id);
    throw new HttpError(500, `failed to add owner: ${memErr.message}`);
  }

  await audit({
    household_id: hh.id,
    actor_user_id: user.id,
    action: 'household.create',
    target_table: 'households',
    target_id: hh.id,
    diff: { name },
    req,
  });

  return json({ household_id: hh.id });
}

async function createInvite(req: Request): Promise<Response> {
  const user = await getCurrentUser(req);
  const body = await req.json().catch(() => ({}));
  const household_id: string = body.household_id;
  const email: string | undefined = body.email?.trim().toLowerCase();
  const role: 'owner' | 'member' = body.role ?? 'member';

  if (!household_id) throw new HttpError(400, 'household_id required');
  if (role !== 'owner' && role !== 'member') throw new HttpError(400, 'invalid role');

  const service = getServiceClient();

  const { data: caller } = await service
    .from('household_members')
    .select('role')
    .eq('household_id', household_id)
    .eq('user_id', user.id)
    .single();
  if (!caller) throw new HttpError(403, 'not a member of this household');
  if (caller.role !== 'owner') throw new HttpError(403, 'only owner can invite');

  if (email) {
    const { count } = await service
      .from('invitations')
      .select('id', { count: 'exact', head: true })
      .eq('household_id', household_id)
      .eq('email', email)
      .is('consumed_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString());
    if ((count ?? 0) >= 3) throw new HttpError(429, 'too many active invites for this email');
  }

  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  const tokenHex = Array.from(raw).map((b) => b.toString(16).padStart(2, '0')).join('');
  const hashBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', raw));
  // supabase-js가 Uint8Array를 PostgreSQL bytea로 변환 못 해 JSON으로
  // 직렬화하던 버그 회피 — hex string으로 보내고 컬럼도 text. (0004 마이그레이션 짝)
  const tokenHashHex = Array.from(hashBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: inv, error: invErr } = await service.from('invitations').insert({
    household_id,
    invited_by: user.id,
    email: email ?? null,
    token_hash: tokenHashHex,
    role,
    expires_at: expiresAt,
  }).select('id').single();
  if (invErr) throw new HttpError(500, `failed to create invite: ${invErr.message}`);

  const inviteUrl = `${APP_URL}/invite?t=${tokenHex}`;

  if (email && RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `우리집 가계부 <${MAIL_FROM}>`,
        to: [email],
        subject: '우리집 가계부에 초대했어요',
        html: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#2A2521;">가족 가계부 초대</h2>
          <p>아래 링크를 누르면 가족 가계부에 합류할 수 있습니다.</p>
          <p>이 링크는 <strong>24시간</strong> 동안만 유효합니다.</p>
          <p><a href="${inviteUrl}" style="display:inline-block;background:#E5765E;color:#fff;padding:12px 24px;border-radius:14px;text-decoration:none;font-weight:600;">초대 수락하기</a></p>
          <p style="color:#9A8F82;font-size:13px;margin-top:24px;">잘못 받으셨다면 이 메일을 무시하시면 됩니다.</p>
        </div>`,
      }),
    });
    if (!res.ok) console.warn(`Resend failed: ${res.status} ${await res.text()}`);
  }

  await audit({
    household_id,
    actor_user_id: user.id,
    action: 'invite.create',
    target_table: 'invitations',
    target_id: inv.id,
    diff: { role, email: email ? email.replace(/(.{2}).+(@.+)/, '$1***$2') : null },
    req,
  });

  return json({ id: inv.id, url: inviteUrl, expires_at: expiresAt });
}

async function acceptInvite(req: Request): Promise<Response> {
  const user = await getCurrentUser(req);
  const body = await req.json().catch(() => ({}));
  const token: string = body.token;
  const displayName: string = (body.display_name ?? '').trim();
  const short: string = (body.short ?? '').trim().slice(0, 2);
  const colorKey: string = body.color_key ?? 'deahyun';

  if (!token || token.length !== 64) throw new HttpError(400, 'invalid token');
  if (!displayName || displayName.length > 20) throw new HttpError(400, 'invalid display_name');
  if (!short) throw new HttpError(400, 'invalid short');
  if (!['appa', 'eomma', 'deahyun', 'jiwon'].includes(colorKey)) {
    throw new HttpError(400, 'invalid color_key');
  }

  const service = getServiceClient();
  const rawBytes = new Uint8Array(token.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const hashBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', rawBytes));
  const hashHex = Array.from(hashBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

  // 1) 먼저 검증용 read (사용자 친화적 에러를 위해)
  const { data: peek } = await service
    .from('invitations')
    .select('id, household_id, role, expires_at, consumed_at, revoked_at')
    .eq('token_hash', hashHex)
    .maybeSingle();

  if (!peek) throw new HttpError(404, 'invite not found');
  if (peek.consumed_at) throw new HttpError(410, 'invite already used');
  if (peek.revoked_at) throw new HttpError(410, 'invite revoked');
  if (new Date(peek.expires_at) <= new Date()) throw new HttpError(410, 'invite expired');

  // 2) 이미 멤버인지 (다른 토큰으로 가입한 경우)
  const { data: existing } = await service
    .from('household_members')
    .select('user_id')
    .eq('household_id', peek.household_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) throw new HttpError(409, 'already a member');

  // 3) atomic "소비" — consumed_at IS NULL 조건으로 update. 두 사용자가 동시에
  //    같은 링크를 눌러도 한 명만 RETURNING으로 row를 가져감. 패자는 빈 결과 → 410.
  const { data: claimed, error: claimErr } = await service
    .from('invitations')
    .update({ consumed_at: new Date().toISOString(), consumed_by: user.id })
    .eq('id', peek.id)
    .is('consumed_at', null)
    .is('revoked_at', null)
    .select('id, household_id, role')
    .maybeSingle();
  if (claimErr) throw new HttpError(500, claimErr.message);
  if (!claimed) throw new HttpError(410, 'invite already used');

  // 4) 이제서야 멤버 행 삽입. 실패하면 invitation을 되돌려야 함.
  const { error: memErr } = await service.from('household_members').insert({
    household_id: claimed.household_id,
    user_id: user.id,
    role: claimed.role,
    display_name: displayName,
    short,
    color_key: colorKey,
  });
  if (memErr) {
    // 보상 — 소비를 되돌려 다른 사용자가 다시 시도할 수 있게
    await service
      .from('invitations')
      .update({ consumed_at: null, consumed_by: null })
      .eq('id', claimed.id);
    throw new HttpError(500, `failed to join: ${memErr.message}`);
  }

  await audit({
    household_id: claimed.household_id,
    actor_user_id: user.id,
    action: 'invite.consume',
    target_table: 'invitations',
    target_id: claimed.id,
    req,
  });

  return json({ household_id: claimed.household_id, role: claimed.role });
}

async function removeMember(req: Request): Promise<Response> {
  const user = await getCurrentUser(req);
  const body = await req.json().catch(() => ({}));
  const household_id: string = body.household_id;
  const target_user_id: string = body.user_id;

  if (!household_id || !target_user_id) throw new HttpError(400, 'household_id and user_id required');
  if (target_user_id === user.id) throw new HttpError(400, '자신을 추방할 수 없습니다');

  const service = getServiceClient();

  const { data: caller } = await service
    .from('household_members')
    .select('role')
    .eq('household_id', household_id)
    .eq('user_id', user.id)
    .single();
  if (!caller || caller.role !== 'owner') throw new HttpError(403, 'owner only');

  const { data: target } = await service
    .from('household_members')
    .select('role, display_name')
    .eq('household_id', household_id)
    .eq('user_id', target_user_id)
    .single();
  if (!target) throw new HttpError(404, 'member not found');

  const { error: delErr } = await service
    .from('household_members')
    .delete()
    .eq('household_id', household_id)
    .eq('user_id', target_user_id);
  if (delErr) throw new HttpError(500, `failed to remove: ${delErr.message}`);

  await audit({
    household_id,
    actor_user_id: user.id,
    action: 'member.remove',
    target_table: 'household_members',
    target_id: target_user_id,
    diff: { display_name: target.display_name, role: target.role },
    req,
  });

  return json({ removed: target_user_id });
}

const VALID_CATS = new Set([
  'food', 'transport', 'medical', 'utility', 'leisure', 'shopping', 'edu', 'other',
  'salary', 'pension', 'side',
]);

async function importLocal(req: Request): Promise<Response> {
  const user = await getCurrentUser(req);
  const body = await req.json().catch(() => ({}));
  const household_id: string = body.household_id;
  const txs: Array<Record<string, unknown>> = body.transactions ?? [];
  const accounts: Array<Record<string, unknown>> = body.accounts ?? [];
  const budgets: Array<Record<string, unknown>> = body.budgets ?? [];
  const goals: Array<Record<string, unknown>> = body.goals ?? [];
  const upcoming: Array<Record<string, unknown>> = body.upcoming ?? [];

  if (!household_id) throw new HttpError(400, 'household_id required');
  if (txs.length > 10000) throw new HttpError(413, 'too many transactions');
  if (accounts.length > 100) throw new HttpError(413, 'too many accounts');
  if (budgets.length > 100) throw new HttpError(413, 'too many budgets');
  if (goals.length > 100) throw new HttpError(413, 'too many goals');
  if (upcoming.length > 500) throw new HttpError(413, 'too many upcoming');

  const service = getServiceClient();

  const { data: mem } = await service
    .from('household_members')
    .select('user_id')
    .eq('household_id', household_id)
    .eq('user_id', user.id)
    .single();
  if (!mem) throw new HttpError(403, 'not a member');

  // 1) accounts 먼저 — local_id → new uuid 매핑 구축
  const VALID_ACC_TYPES = new Set(['입출금', '적금', '카드', '현금']);
  const accountIdMap: Record<string, string> = {};
  if (accounts.length) {
    const rows = accounts.map((a, i) => {
      const label = String(a.label ?? '').slice(0, 30);
      if (!label) throw new HttpError(400, `account[${i}]: label required`);
      const type = String(a.type ?? '');
      if (!VALID_ACC_TYPES.has(type)) throw new HttpError(400, `account[${i}]: invalid type`);
      const bank = String(a.bank ?? '').slice(0, 20) || '-';
      const balance = Math.round(Number(a.balance ?? 0));
      if (!Number.isFinite(balance)) throw new HttpError(400, `account[${i}]: invalid balance`);
      const color = String(a.color ?? 'var(--sky)');
      const card_limit =
        a.limit !== undefined && a.limit !== null ? Math.round(Number(a.limit)) : null;
      return { household_id, label, type, bank, balance, color, card_limit, created_by: user.id };
    });
    const { data: inserted, error } = await service.from('accounts').insert(rows).select('id');
    if (error) throw new HttpError(500, `accounts: ${error.message}`);
    (inserted ?? []).forEach((row, i) => {
      const localId = accounts[i].id;
      if (typeof localId === 'string' && localId) accountIdMap[localId] = row.id as string;
    });
  }

  // 2) transactions — account_id 매핑 적용, member_id는 null (시드 ID와 호환 불가)
  if (txs.length) {
    const rows = txs.map((t, i) => {
      const date = String(t.date ?? '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, `tx[${i}]: invalid date`);
      const kind = String(t.kind ?? '');
      if (kind !== 'in' && kind !== 'out') throw new HttpError(400, `tx[${i}]: invalid kind`);
      const cat = String(t.cat ?? '');
      if (!VALID_CATS.has(cat)) throw new HttpError(400, `tx[${i}]: invalid cat`);
      const amount = Math.abs(Math.round(Number(t.amount)));
      if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, `tx[${i}]: invalid amount`);
      const title = String(t.title ?? '').slice(0, 40);
      if (!title) throw new HttpError(400, `tx[${i}]: title required`);
      const localAccount = typeof t.account === 'string' ? t.account : '';
      return {
        household_id,
        date, kind, amount, cat, title,
        memo: typeof t.memo === 'string' ? t.memo.slice(0, 140) : null,
        member_id: null,
        account_id: accountIdMap[localAccount] ?? null,
        created_by: user.id,
      };
    });
    const { error } = await service.from('transactions').insert(rows);
    if (error) throw new HttpError(500, `transactions: ${error.message}`);
  }

  // 3) budgets — upsert (cat, ym)
  if (budgets.length) {
    const rows = budgets.map((b, i) => {
      const cat = String(b.cat ?? '');
      if (!VALID_CATS.has(cat)) throw new HttpError(400, `budget[${i}]: invalid cat`);
      const limit = Math.round(Number(b.limit ?? 0));
      if (!Number.isFinite(limit) || limit < 0) throw new HttpError(400, `budget[${i}]: invalid limit`);
      const ym = typeof b.ym === 'string' && /^\d{4}-\d{2}$/.test(b.ym) ? b.ym : null;
      return { household_id, cat, budget_limit: limit, ym };
    });
    const { error } = await service
      .from('budgets')
      .upsert(rows, { onConflict: 'household_id,cat,ym' });
    if (error) throw new HttpError(500, `budgets: ${error.message}`);
  }

  // 4) goals
  if (goals.length) {
    const rows = goals.map((g, i) => {
      const title = String(g.title ?? '').slice(0, 30);
      if (!title) throw new HttpError(400, `goal[${i}]: title required`);
      const target = Math.round(Number(g.target ?? 0));
      if (!Number.isFinite(target) || target <= 0) throw new HttpError(400, `goal[${i}]: invalid target`);
      const saved = Math.max(0, Math.round(Number(g.saved ?? 0)));
      const monthly = Math.max(0, Math.round(Number(g.monthly ?? 0)));
      const color = String(g.color ?? 'var(--sage)');
      return { household_id, title, saved, target, monthly, color };
    });
    const { error } = await service.from('goals').insert(rows);
    if (error) throw new HttpError(500, `goals: ${error.message}`);
  }

  // 5) upcoming
  if (upcoming.length) {
    const rows = upcoming.map((u, i) => {
      const label = String(u.label ?? '').slice(0, 30);
      if (!label) throw new HttpError(400, `upcoming[${i}]: label required`);
      const date = String(u.date ?? '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, `upcoming[${i}]: invalid date`);
      const amount = Math.abs(Math.round(Number(u.amount ?? 0)));
      if (!Number.isFinite(amount) || amount <= 0) throw new HttpError(400, `upcoming[${i}]: invalid amount`);
      const cat = String(u.cat ?? '');
      if (!VALID_CATS.has(cat)) throw new HttpError(400, `upcoming[${i}]: invalid cat`);
      const autopay = Boolean(u.autopay);
      return { household_id, label, due_date: date, amount, cat, autopay };
    });
    const { error } = await service.from('upcoming').insert(rows);
    if (error) throw new HttpError(500, `upcoming: ${error.message}`);
  }

  await audit({
    household_id,
    actor_user_id: user.id,
    action: 'import.local',
    diff: {
      transactions: txs.length,
      accounts: accounts.length,
      budgets: budgets.length,
      goals: goals.length,
      upcoming: upcoming.length,
    },
    req,
  });

  return json({
    imported: {
      transactions: txs.length,
      accounts: accounts.length,
      budgets: budgets.length,
      goals: goals.length,
      upcoming: upcoming.length,
    },
  });
}

async function revokeInvite(req: Request): Promise<Response> {
  const user = await getCurrentUser(req);
  const body = await req.json().catch(() => ({}));
  const invite_id: string = body.invite_id;
  if (!invite_id) throw new HttpError(400, 'invite_id required');

  const service = getServiceClient();

  // 초대가 본인이 owner인 가족 소속인지 확인
  const { data: inv, error: fetchErr } = await service
    .from('invitations')
    .select('id, household_id, consumed_at, revoked_at')
    .eq('id', invite_id)
    .maybeSingle();
  if (fetchErr) throw new HttpError(500, fetchErr.message);
  if (!inv) throw new HttpError(404, 'invitation not found');
  if (inv.consumed_at) throw new HttpError(409, 'already consumed');
  if (inv.revoked_at) return json({ revoked: true }); // 이미 취소됨 — 멱등

  const { data: ownership } = await service
    .from('household_members')
    .select('user_id')
    .eq('household_id', inv.household_id)
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle();
  if (!ownership) throw new HttpError(403, 'not an owner of this household');

  // 소비/취소된 사이에 race가 일어나면 update를 건너뛰도록 조건부
  const { error: updErr } = await service
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invite_id)
    .is('consumed_at', null)
    .is('revoked_at', null);
  if (updErr) throw new HttpError(500, updErr.message);

  await audit({
    household_id: inv.household_id,
    actor_user_id: user.id,
    action: 'invite.revoke',
    target_table: 'invitations',
    target_id: invite_id,
    req,
  });

  return json({ revoked: true });
}

async function deleteAccount(req: Request): Promise<Response> {
  const user = await getCurrentUser(req);
  const service = getServiceClient();

  const { data: myOwnerships } = await service
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .eq('role', 'owner');

  for (const row of myOwnerships ?? []) {
    const { count } = await service
      .from('household_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('household_id', row.household_id)
      .eq('role', 'owner')
      .neq('user_id', user.id);
    if ((count ?? 0) === 0) {
      const { error: hhDelErr } = await service
        .from('households')
        .delete()
        .eq('id', row.household_id);
      if (hhDelErr) {
        console.error('[deleteAccount] household delete failed:', hhDelErr.message);
        throw new HttpError(500, `failed to delete household: ${hhDelErr.message}`);
      }
      await audit({
        household_id: row.household_id,
        actor_user_id: user.id,
        action: 'household.delete',
        req,
      });
    }
  }

  const { error: memDelErr } = await service
    .from('household_members')
    .delete()
    .eq('user_id', user.id);
  if (memDelErr) {
    console.error('[deleteAccount] member delete failed:', memDelErr.message);
    throw new HttpError(500, `failed to leave households: ${memDelErr.message}`);
  }
  const { error: auditUpdErr } = await service
    .from('audit_log')
    .update({ actor_user_id: null })
    .eq('actor_user_id', user.id);
  if (auditUpdErr) console.error('[deleteAccount] audit anon failed:', auditUpdErr.message);

  const { error: delErr } = await service.auth.admin.deleteUser(user.id);
  if (delErr) throw new HttpError(500, `failed to delete user: ${delErr.message}`);

  return json({ deleted: true });
}

// ──────────────────────────────────────────────────────────────
// 라우터
// ──────────────────────────────────────────────────────────────

const HANDLERS: Record<string, (req: Request) => Promise<Response>> = {
  'create-household': createHousehold,
  'create-invite': createInvite,
  'accept-invite': acceptInvite,
  'remove-member': removeMember,
  'revoke-invite': revokeInvite,
  'import-local': importLocal,
  'delete-account': deleteAccount,
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter((p) => p);
  const fn = parts[0] ?? '';

  const handler = HANDLERS[fn];
  if (!handler) return json({ error: `unknown function: ${fn}` }, 404);

  try {
    return await handler(req);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    const message = e instanceof Error ? e.message : 'internal error';
    console.error(`[${fn}] ${status} ${message}`);
    return json({ error: message }, status);
  }
});
