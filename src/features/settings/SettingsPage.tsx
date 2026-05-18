import { useState } from 'react';
import { useSettings } from '@/stores/settingsStore';
import { useMembers } from '@/stores/memberStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { FamilySection } from './FamilySection';
import { AccountsSection } from './AccountsSection';
import { isServerConfigured } from '@/lib/supabase';
import type { CurrencyMode, FontSizeMode, Member, MemberColorKey } from '@/types/domain';

const FONT_SIZES: { key: FontSizeMode; label: string; px: number }[] = [
  { key: 'normal', label: '보통', px: 16 },
  { key: 'large', label: '크게', px: 18 },
  { key: 'xlarge', label: '아주 크게', px: 20 },
];

const CURRENCY: { key: CurrencyMode; label: string; sample: string }[] = [
  { key: 'won', label: '한국식', sample: '1,234,567원' },
  { key: 'symbol', label: '기호 (₩)', sample: '₩1,234,567' },
  { key: 'korean', label: '한글 단위', sample: '123만 4,567원' },
];

const COLOR_KEYS: MemberColorKey[] = ['appa', 'eomma', 'deahyun', 'jiwon'];

export function SettingsPage() {
  const fontSizeMode = useSettings((s) => s.fontSizeMode);
  const setFontSizeMode = useSettings((s) => s.setFontSizeMode);
  const hiContrast = useSettings((s) => s.hiContrast);
  const toggleHiContrast = useSettings((s) => s.toggleHiContrast);
  const currencyMode = useSettings((s) => s.currencyMode);
  const setCurrencyMode = useSettings((s) => s.setCurrencyMode);

  const members = useMembers((s) => s.members);
  const updateMember = useMembers((s) => s.updateMember);
  const removeMember = useMembers((s) => s.removeMember);
  const addMember = useMembers((s) => s.addMember);

  const [newName, setNewName] = useState('');

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">설정</h1>
          <div className="page-greet">가족 가계부 환경 설정</div>
        </div>
      </header>

      <div className="stack">
        <Card>
          <h3 className="section-title">화면 보기</h3>
          <div className="stack">
            <div className="field">
              <label className="label">글자 크기</label>
              <div className="row" style={{ gap: 8 }}>
                {FONT_SIZES.map((f) => (
                  <Button
                    key={f.key}
                    variant={fontSizeMode === f.key ? 'primary' : 'default'}
                    size={f.key === 'xlarge' ? 'lg' : f.key === 'large' ? 'md' : 'sm'}
                    onClick={() => setFontSizeMode(f.key)}
                  >
                    {f.label} ({f.px}px)
                  </Button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="label">고대비 모드</label>
              <Button
                variant={hiContrast ? 'primary' : 'default'}
                onClick={toggleHiContrast}
              >
                {hiContrast ? '✓ 켜짐' : '꺼짐'}
              </Button>
              <div className="meta" style={{ marginTop: 6 }}>
                테두리와 글자색을 진하게 표시합니다.
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="section-title">금액 표시 방식</h3>
          <div className="stack" style={{ gap: 8 }}>
            {CURRENCY.map((c) => (
              <label
                key={c.key}
                className="row"
                style={{
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: currencyMode === c.key ? 'var(--coral-soft)' : 'var(--surface-2)',
                  border: `1px solid ${currencyMode === c.key ? 'var(--coral)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="currency"
                  checked={currencyMode === c.key}
                  onChange={() => setCurrencyMode(c.key)}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>{c.label}</div>
                  <div className="meta num">{c.sample}</div>
                </div>
              </label>
            ))}
          </div>
        </Card>

        <AccountsSection />

        {isServerConfigured && <FamilySection />}

        {/* 로컬 모드에서만 로컬 멤버 편집 노출.
            서버 모드에선 FamilySection이 진실의 원천이라 여기서 편집하면
            Realtime sync로 즉시 덮어써져 사용자가 본 편집이 사라지는 환각. */}
        {!isServerConfigured && (
          <Card>
            <h3 className="section-title">가족 구성원</h3>
            <div className="stack" style={{ gap: 10 }}>
              {members.map((m, idx) => (
                <MemberEditor
                  key={m.id}
                  member={m}
                  onChange={(patch) => updateMember(m.id, patch)}
                  onRemove={members.length > 1 ? () => removeMember(m.id) : undefined}
                  fallbackColor={COLOR_KEYS[idx % COLOR_KEYS.length]}
                />
              ))}
              <div
                className="row"
                style={{
                  gap: 8,
                  marginTop: 8,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border)',
                }}
              >
                <input
                  className="input"
                  placeholder="새 가족 이름"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={20}
                />
                <Button
                  onClick={() => {
                    const trimmed = newName.trim();
                    if (!trimmed) return;
                    if (members.some((m) => m.name === trimmed)) {
                      alert('같은 이름의 가족이 이미 있어요.');
                      return;
                    }
                    addMember({
                      name: trimmed,
                      short: trimmed.slice(0, 1),
                      role: '자녀',
                      colorKey: COLOR_KEYS[members.length % COLOR_KEYS.length],
                    });
                    setNewName('');
                  }}
                >
                  추가
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function MemberEditor({
  member,
  onChange,
  onRemove,
  fallbackColor,
}: {
  member: Member;
  onChange: (patch: Partial<Member>) => void;
  onRemove?: () => void;
  fallbackColor: MemberColorKey;
}) {
  const colorKey = member.colorKey ?? fallbackColor;
  return (
    <div
      className="row"
      style={{
        gap: 10,
        padding: 12,
        background: 'var(--surface-2)',
        borderRadius: 12,
        border: '1px solid var(--border)',
      }}
    >
      <Avatar name={member.name} short={member.short} colorKey={colorKey} size="md" />
      <input
        className="input"
        value={member.name}
        onChange={(e) => onChange({ name: e.target.value, short: e.target.value.slice(0, 1) })}
        style={{ flex: 1, minWidth: 120 }}
        maxLength={20}
      />
      <select
        className="select"
        value={member.role}
        onChange={(e) => onChange({ role: e.target.value as Member['role'] })}
        style={{ width: 110 }}
      >
        <option value="가장">가장</option>
        <option value="자녀">자녀</option>
      </select>
      {onRemove && (
        <Button variant="ghost" onClick={onRemove}>
          삭제
        </Button>
      )}
    </div>
  );
}
