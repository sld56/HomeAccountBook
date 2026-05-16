import { CATEGORIES } from '@/data/categories';
import { fmt } from '@/lib/format';
import { useSettings } from '@/stores/settingsStore';
import type { CategoryId } from '@/types/domain';
import { CategoryIcon } from './CategoryIcon';
import { ProgressBar } from '@/components/ui/ProgressBar';

type Props = {
  cat: CategoryId;
  used: number;
  limit: number;
};

export function BudgetRow({ cat, used, limit }: Props) {
  const currency = useSettings((s) => s.currencyMode);
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const category = CATEGORIES[cat];

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '10px 0' }}>
      <CategoryIcon catId={cat} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="between" style={{ marginBottom: 6 }}>
          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{category.label}</span>
          <span className="num meta">
            {fmt.money(used, currency)} / {fmt.money(limit, currency)}
          </span>
        </div>
        <ProgressBar value={used} max={limit} thickness="default" label={`${category.label} 예산`} />
        <div className="meta num" style={{ marginTop: 4 }}>
          {fmt.percent(pct, 0)} 사용
        </div>
      </div>
    </div>
  );
}
