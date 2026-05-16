// POST /functions/v1/accept-invite
// body: { token, display_name, short, color_key }

import { handle, json, getCurrentUser, getServiceClient, HttpError, audit } from '../_shared/supabase.ts';

Deno.serve((req) => handle(req, async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'method not allowed');

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

  // hex → bytes → sha256
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

  // 이미 가족인지
  const { data: existing } = await service
    .from('household_members')
    .select('user_id')
    .eq('household_id', inv.household_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (existing) throw new HttpError(409, 'already a member');

  // 가족 합류 + 초대 소진 (트랜잭션 대신 순차)
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
}));
