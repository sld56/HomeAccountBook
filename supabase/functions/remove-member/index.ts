// POST /functions/v1/remove-member
// body: { household_id, user_id }
// owner만 호출 가능. 본인을 제거하려면 별도 leave-household 엔드포인트.

import { handle, json, getCurrentUser, getServiceClient, HttpError, audit } from '../_shared/supabase.ts';

Deno.serve((req) => handle(req, async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'method not allowed');

  const user = await getCurrentUser(req);
  const body = await req.json().catch(() => ({}));
  const household_id: string = body.household_id;
  const target_user_id: string = body.user_id;

  if (!household_id || !target_user_id) throw new HttpError(400, 'household_id and user_id required');
  if (target_user_id === user.id) {
    throw new HttpError(400, '자신을 추방할 수 없습니다. leave-household 사용');
  }

  const service = getServiceClient();

  // 호출자 owner 검증
  const { data: caller } = await service
    .from('household_members')
    .select('role')
    .eq('household_id', household_id)
    .eq('user_id', user.id)
    .single();
  if (!caller || caller.role !== 'owner') throw new HttpError(403, 'owner only');

  // 대상이 마지막 owner면 차단
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
}));
