import { CATEGORIES } from '@/data/categories';
import type { CategoryId } from '@/types/domain';

type Props = { catId: CategoryId; size?: number };

export function CategoryIcon({ catId, size = 36 }: Props) {
  const cat = CATEGORIES[catId];
  return (
    <span
      aria-label={cat.label}
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: cat.color,
        color: '#fff',
        display: 'inline-grid',
        placeItems: 'center',
        fontSize: size * 0.55,
        flexShrink: 0,
      }}
    >
      <span aria-hidden>{cat.emoji}</span>
    </span>
  );
}
