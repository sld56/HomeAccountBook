// POST /functions/v1/delete-account
// 본인 계정 삭제. 본인이 유일한 owner인 가족은 함께 삭제.

import { handle, json, getCurrentUser, getServiceClient, HttpError, audit } from '../_shared/supabase.ts';

Deno.serve((req) => handle(req, async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'method not allowed');

  const user = await getCurrentUser(req);
  const service = getServiceClient();

  // 본인이 owner로 있는 가족 목록
  const { data: myOwnerships } = await service
    .from('household_members')
    .select('household_id')
    .eq('user_id', user.id)
    .eq('role', 'owner');

  // 각 가족에 다른 owner가 있는지 확인
  for (const row of myOwnerships ?? []) {
    const { count } = await service
      .from('household_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('household_id', row.household_id)
      .eq('role', 'owner')
      .neq('user_id', user.id);
    if ((count ?? 0) === 0) {
      // 본인이 유일한 owner → 가족 삭제 (cascade로 모든 데이터 삭제)
      await service.from('households').delete().eq('id', row.household_id);
      await audit({
        household_id: row.household_id,
        actor_user_id: user.id,
        action: 'household.delete',
        target_table: 'households',
        target_id: row.household_id,
        diff: { reason: 'account_deletion_sole_owner' },
        req,
      });
    }
  }

  // 모든 가족 멤버십 제거
  await service.from('household_members').delete().eq('user_id', user.id);

  // audit_log의 user_id 익명화 (NULL)
  await service.from('audit_log').update({ actor_user_id: null }).eq('actor_user_id', user.id);

  // auth.users 삭제 (Admin API)
  const { error: delErr } = await service.auth.admin.deleteUser(user.id);
  if (delErr) throw new HttpError(500, `failed to delete user: ${delErr.message}`);

  return json({ deleted: true });
}));
