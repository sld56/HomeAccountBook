// POST /functions/v1/create-household
// body: { name, display_name, short, color_key }
// 신규 가족 생성 + 호출자를 owner로 등록 (트랜잭션)

import { handle, json, getCurrentUser, getServiceClient, HttpError, audit } from '../_shared/supabase.ts';

Deno.serve((req) => handle(req, async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'method not allowed');

  const user = await getCurrentUser(req);
  const body = await req.json().catch(() => ({}));
  const name: string = (body.name ?? '').trim();
  const displayName: string = (body.display_name ?? '').trim();
  const short: string = (body.short ?? '').trim().slice(0, 2);
  const colorKey: string = body.color_key ?? 'appa';

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
}));
