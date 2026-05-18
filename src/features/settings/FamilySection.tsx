import { useCallback, useEffect, useState } from 'react';
import { supabase, callFunction, isServerConfigured } from '@/lib/supabase';
import { useAuth } from '@/features/auth/authStore';
import { useMembers } from '@/stores/memberStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Member = {
  user_id: string;
  display_name: string;
  short: string;
  color_key: 'appa' | 'eomma' | 'deahyun' | 'jiwon';
  role: 'owner' | 'member';
  joined_at: string;
};

type Invitation = {
  id: string;
  email: string | null;
  expires_at: string;
  created_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
};

export function FamilySection() {
  const household_id = useAuth((s) => s.household_id);
  const myMembership = useAuth((s) => s.membership);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const isOwner = myMembership?.role === 'owner';

  const load = useCallback(async () => {
    if (!household_id) return;
    setLoading(true);
    setErr(null);
    const [memRes, invRes] = await Promise.all([
      supabase.from('household_members').select('*').eq('household_id', household_id),
      isOwner
        ? supabase
            .from('invitations')
            .select('*')
            .eq('household_id', household_id)
            .is('consumed_at', null)
            .is('revoked_at', null)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as Invitation[], error: null }),
    ]);
    if (memRes.error) {
      setErr(`구성원 조회 실패: ${memRes.error.message}`);
      setLoading(false);
      return;
    }
    if ('error' in invRes && invRes.error) {
      setErr(`초대 목록 조회 실패: ${invRes.error.message}`);
      setLoading(false);
      return;
    }
    setMembers((memRes.data ?? []) as Member[]);
    setInvites((invRes.data ?? []) as Invitation[]);
    setLoading(false);
  }, [household_id, isOwner]);

  useEffect(() => {
    load();
  }, [load]);

  // serverSync가 household_members를 Realtime으로 구독 중. 그쪽 store가
  // 갱신될 때마다 본 섹션도 다시 불러와서 (멤버 수가 바뀌면) 초대 목록까지
  // 새로 가져오게 함. 다른 PC에서 초대 수락/탈퇴 즉시 반영.
  const syncedMemberCount = useMembers((s) => s.members.length);
  useEffect(() => {
    if (!household_id) return;
    load();
  }, [syncedMemberCount, household_id, load]);

  if (!isServerConfigured) {
    return null;
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setInfo(null); setInviteUrl(null);
    try {
      const result = await callFunction<{ url: string }>('create-invite', {
        household_id,
        email: inviteEmail.trim() || null,
        role: 'member',
      });
      setInviteUrl(result.url);
      setInfo(inviteEmail.trim() ? '메일을 발송했습니다.' : '아래 링크를 가족에게 직접 전달해주세요.');
      setInviteEmail('');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패');
    } finally {
      setBusy(false);
    }
  }

  async function revokeInvite(id: string) {
    if (!confirm('이 초대를 취소할까요?')) return;
    try {
      await callFunction('revoke-invite', { invite_id: id });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '초대 취소 실패');
    }
  }

  async function removeMember(user_id: string, name: string) {
    if (!confirm(`${name}님을 가족에서 제외할까요? 거래 기록은 남습니다.`)) return;
    try {
      await callFunction('remove-member', { household_id, user_id });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '실패');
    }
  }

  return (
    <Card>
      <h3 className="section-title">가족 구성원 (서버)</h3>
      {loading ? (
        <p className="meta">불러오는 중…</p>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          {members.map((m) => (
            <div key={m.user_id} className="row" style={{ gap: 10, padding: '8px 0' }}>
              <span
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: `var(--member-${m.color_key})`,
                  color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800,
                }}
              >
                {m.short}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{m.display_name}</div>
                <div className="meta">{m.role === 'owner' ? '관리자' : '구성원'}</div>
              </div>
              {isOwner && m.role !== 'owner' && (
                <Button variant="ghost" size="sm" onClick={() => removeMember(m.user_id, m.display_name)}>
                  추방
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <h4 className="section-title" style={{ fontSize: 'var(--fs-base)' }}>초대 보내기</h4>
          <form onSubmit={sendInvite} className="row" style={{ gap: 8 }}>
            <input
              type="email"
              className="input"
              placeholder="이메일 (선택, 미입력 시 링크만 생성)"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? '발송 중…' : '초대'}
            </Button>
          </form>
          {info && <div className="auth-success" style={{ marginTop: 10 }}>{info}</div>}
          {err && <div className="auth-error" style={{ marginTop: 10 }}>{err}</div>}
          {inviteUrl && (
            <div style={{ marginTop: 10, padding: 12, background: 'var(--surface-2)', borderRadius: 12, fontSize: 'var(--fs-sm)', wordBreak: 'break-all' }}>
              <strong>링크:</strong> {inviteUrl}
              <Button
                variant="ghost"
                size="sm"
                style={{ marginLeft: 8 }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(inviteUrl);
                    setInfo('링크를 복사했습니다.');
                  } catch {
                    setErr('복사 권한이 거부되었습니다. 링크를 직접 선택해 복사해주세요.');
                  }
                }}
              >
                복사
              </Button>
            </div>
          )}

          {invites.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 className="section-title" style={{ fontSize: 'var(--fs-base)' }}>발급 중인 초대</h4>
              <div className="stack" style={{ gap: 6 }}>
                {invites.map((inv) => (
                  <div key={inv.id} className="between" style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 10 }}>
                    <div className="meta">
                      {inv.email ?? '(링크 전달용)'} · 만료 {new Date(inv.expires_at).toLocaleString('ko-KR')}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => revokeInvite(inv.id)}>취소</Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
