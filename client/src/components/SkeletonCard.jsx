export function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 24,
        overflow: 'hidden',
      }}
    >
      {[70, 90, 50, 80].map((w, i) => (
        <div
          key={i}
          className="skeleton-shimmer"
          style={{
            height: i === 0 ? 18 : 12,
            width: `${w}%`,
            borderRadius: 6,
            marginBottom: i === 0 ? 16 : 8,
            background: 'var(--color-elevated)',
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 1,
          background: 'var(--color-base)',
          padding: '12px 16px',
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer"
            style={{ height: 10, borderRadius: 4, background: 'var(--color-elevated)', width: '60%' }}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 1,
            padding: '10px 16px',
            borderTop: '1px solid var(--color-border)',
            background: r % 2 === 0 ? 'var(--color-surface)' : 'var(--color-base)',
          }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="skeleton-shimmer"
              style={{
                height: 10,
                borderRadius: 4,
                background: 'var(--color-elevated)',
                width: `${50 + Math.random() * 40}%`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
