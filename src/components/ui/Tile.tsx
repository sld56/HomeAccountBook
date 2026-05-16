import './Tile.css';

type Props = {
  emoji: string;
  label: string;
  color?: string;
  selected?: boolean;
  onClick?: () => void;
};

export function Tile({ emoji, label, color, selected, onClick }: Props) {
  return (
    <button
      type="button"
      className={`tile ${selected ? 'is-selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className="tile-icon" style={{ background: color ?? 'var(--bg-2)' }}>
        <span aria-hidden>{emoji}</span>
      </span>
      <span className="tile-label">{label}</span>
    </button>
  );
}
