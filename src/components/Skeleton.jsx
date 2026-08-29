export default function Skeleton({ width, height, circle, radius, style, className = '', ...props }) {
  return (
    <span
      className={`skeleton ${circle ? 'skeleton-circle' : ''} ${className}`}
      style={{
        width: width || (circle ? '1em' : '100%'),
        height: height || (circle ? '1em' : '1em'),
        borderRadius: circle ? '50%' : radius || '6px',
        ...style,
      }}
      {...props}
    />
  );
}

export function TableSkeleton({ columns = 6, rows = 8 }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8E0D6', borderRadius: '14px', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E8E0D6' }}>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} style={{ padding: '0.7rem 1rem' }}>
                  <Skeleton width="80%" height="14px" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} style={{ borderBottom: '1px solid #F0EBE3' }}>
                {Array.from({ length: columns }).map((_, c) => (
                  <td key={c} style={{ padding: '0.85rem 1rem' }}>
                    {c === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Skeleton circle width="30px" height="30px" />
                        <Skeleton width="70%" height="14px" />
                      </div>
                    ) : (
                      <Skeleton width={c % 3 === 0 ? '55%' : '80%'} height="14px" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ columns = 3, rows = 2 }) {
  return (
    <div
      className="therapists-grid"
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(220px, 1fr))` }}
    >
      {Array.from({ length: columns * rows }).map((_, i) => (
        <div className="card therapist-card" key={i}>
          <Skeleton circle width="100px" height="100px" style={{ margin: '0 auto 0.75rem', display: 'block' }} />
          <Skeleton width="70%" height="16px" style={{ margin: '0 auto 0.4rem', display: 'block' }} />
          <Skeleton width="50%" height="12px" style={{ margin: '0 auto 0.4rem', display: 'block' }} />
          <Skeleton width="60%" height="12px" style={{ margin: '0 auto', display: 'block' }} />
          <Skeleton width="90px" height="22px" radius="11px" style={{ margin: '0.75rem auto', display: 'block' }} />
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <Skeleton width="70px" height="30px" radius="8px" />
            <Skeleton width="70px" height="30px" radius="8px" />
          </div>
        </div>
      ))}
    </div>
  );
}
