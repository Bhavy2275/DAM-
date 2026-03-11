export const MACADAM_CONFIG = {
  '1A': { label: '1A', space: 40, bg: '#ef4444', color: '#fff' },
  '2A': { label: '2A', space: 50, bg: '#f97316', color: '#fff' },
  '3A': { label: '3A', space: 75, bg: '#f59e0b', color: '#fff' },
  '4A': { label: '4A', space: 90, bg: '#14b8a6', color: '#fff' },
  '5A': { label: '5A', space: 100, bg: '#22c55e', color: '#fff' },
};

export default function MacadamBadge({ step, showSpace = true }) {
  if (!step || !MACADAM_CONFIG[step]) {
    return (
      <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>—</span>
    );
  }
  const cfg = MACADAM_CONFIG[step];
  return (
    <span
      title={`Macadam ${step} — Space Match: ${cfg.space}%`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 20,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
      {showSpace && (
        <span style={{ opacity: 0.85, fontWeight: 500, fontSize: 10 }}>
          {cfg.space}%
        </span>
      )}
    </span>
  );
}
