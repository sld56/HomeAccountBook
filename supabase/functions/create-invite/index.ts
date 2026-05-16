// POST /functions/v1/create-invite
// body: { household_id, email, role? }
// owner만 호출 가능. raw 토큰은 응답에만 노출, DB에는 hash만 저장.

import { handle, json, getCurrentUser, getServiceClient, HttpError, audit } from '../_shared/supabase.ts';

const APP_URL = Deno.env.get('APP_URL') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const MAIL_FROM = Deno.env.get('MAIL_FROM') ?? 'noreply@example.com';

Deno.serve((req) => handle(req, async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'method not allowed');

  const user = await getCurrentUser(req);
  const body = await req.json().catch(() => ({}));
  const household_id: string = body.household_id;
  const email: string | undefined = body.email?.trim().toLowerCase();
  const role: 'owner' | 'member' = body.role ?? 'member';

  if (!household_id) throw new HttpError(400, 'household_id required');
  if (role !== 'owner' && role !== 'member') throw new HttpError(400, 'invalid role');

  const service = getServiceClient();

  // 호출자가 owner인지 검증
  const { data: caller, error: callerErr } = await service
    .from('household_members')
    .select('role')
    .eq('household_id', household_id)
    .eq('user_id', user.id)
    .single();
  if (callerErr || !caller) throw new HttpError(403, 'not a member of this household');
  if (caller.role !== 'owner') throw new HttpError(403, 'only owner can invite');

  // 동일 이메일로 활성 초대 24h 내 N개 이상이면 차단
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

  // 32-byte 랜덤 토큰
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

  // 이메일 발송 (Resend)
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
    if (!res.ok) {
      console.warn(`Resend failed: ${res.status} ${await res.text()}`);
    }
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
}));
