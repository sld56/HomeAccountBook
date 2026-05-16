import { useMembers } from '@/stores/memberStore';
import { Chip } from '@/components/ui/Chip';

export function MemberPills() {
  const members = useMembers((s) => s.members);
  const selected = useMembers((s) => s.selectedMember);
  const select = useMembers((s) => s.selectMember);

  return (
    <div className="row" style={{ gap: 8 }}>
      <Chip as="button" active={selected === 'all'} onClick={() => select('all')}>
        전체
      </Chip>
      {members.map((m) => (
        <Chip
          key={m.id}
          as="button"
          active={selected === m.id}
          onClick={() => select(m.id)}
        >
          {m.name}
        </Chip>
      ))}
    </div>
  );
}
