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
  let ipHash: Uint8Array | null = null;
  if (ip) {
    const salt = new Date().toISOString().slice(0, 10);
    const data = new TextEncoder().encode(ip + salt);
    const buf = await crypto.subtle.digest('SHA-256', data);
    ipHash = new Uint8Array(buf);
  }
  await service.from('audit_log').insert({
    household_id: opts.household_id,
    actor_user_id: opts.actor_user_id,
    action: opts.action,
    target_table: opts.target_table,
    target_id: opts.target_id,
    diff: opts.diff ?? null,
    ip_hash: ipHash,
    user_agent: opts.req?.headers.get('user-agent')?.slice(0, 200),
  });
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
  const tokenHash = new Uint8Array(await crypto.subtle.digest('SHA-256', raw));
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: inv, error: invErr } = await service.from('invitations').insert({
    household_id,
    invited_by: user.id,
    email: email ?? null,
    token_hash: tokenHash,
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
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', rawBytes));

  const { data: inv, error: invErr } = await service
    .from('invitations')
    .select('id, household_id, role, expires_at, consumed_at, revoked_at')
    .eq('token_hash', hash)
    .single();

  if (invErr || !inv) throw new HttpError(404, 'invite not found');
  if (inv.consumed_at) throw new HttpError(410, 'invite already used');
  if (inv.revoked_at) throw new HttpError(410, 'invite revoked');
  if (new Date(inv.expires_at) <= new Date()) throw new HttpError(410, 'invite expired');

  const { data: existing } = await service
    .from('household_members')
    .select('user_id')
    .eq('household_id', inv.household_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) throw new HttpError(409, 'already a member');

  const { error: memErr } = await service.from('household_members').insert({
    household_id: inv.household_id,
    user_id: user.id,
    role: inv.role,
    display_name: displayName,
    short,
    color_key: colorKey,
  });
  if (memErr) throw new HttpError(500, `failed to join: ${memErr.message}`);

  await service
    .from('invitations')
    .update({ consumed_at: new Date().toISOString(), consumed_by: user.id })
    .eq('id', inv.id);

  await audit({
    household_id: inv.household_id,
    actor_user_id: user.id,
    action: 'invite.consume',
    target_table: 'invitations',
    target_id: inv.id,
    req,
  });

  return json({ household_id: inv.household_id, role: inv.role });
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

  if (!household_id) throw new HttpError(400, 'household_id required');
  if (txs.length > 10000) throw new HttpError(413, 'too many transactions');

  const service = getServiceClient();

  const { data: mem } = await service
    .from('household_members')
    .select('user_id')
    .eq('household_id', household_id)
    .eq('user_id', user.id)
    .single();
  if (!mem) throw new HttpError(403, 'not a member');

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
      return {
        household_id,
        date, kind, amount, cat, title,
        memo: typeof t.memo === 'string' ? t.memo.slice(0, 140) : null,
        member_id: null,
        account_id: null,
        created_by: user.id,
      };
    });
    const { error } = await service.from('transactions').insert(rows);
    if (error) throw new HttpError(500, `transactions: ${error.message}`);
  }

  await audit({
    household_id,
    actor_user_id: user.id,
    action: 'import.local',
    diff: { count: txs.length },
    req,
  });

  return json({ imported: { transactions: txs.length } });
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
      await service.from('households').delete().eq('id', row.household_id);
      await audit({
        household_id: row.household_id,
        actor_user_id: user.id,
        action: 'household.delete',
        req,
      });
    }
  }

  await service.from('household_members').delete().eq('user_id', user.id);
  await service.from('audit_log').update({ actor_user_id: null }).eq('actor_user_id', user.id);

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
