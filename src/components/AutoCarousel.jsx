import { useState, useEffect, useCallback } from 'react';

export default function AutoCarousel({ items, renderItem, visibleCount = 3, interval = 30000 }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(items.length / visibleCount);

  const nextPage = useCallback(() => {
    setPage((p) => (p + 1) % totalPages);
  }, [totalPages]);

  useEffect(() => {
    if (totalPages <= 1) return;
    const timer = setInterval(nextPage, interval);
    return () => clearInterval(timer);
  }, [nextPage, interval, totalPages]);

  if (items.length <= visibleCount) {
    return <>{items.map((item, i) => renderItem(item, i))}</>;
  }

  const start = page * visibleCount;
  const visible = items.slice(start, start + visibleCount);

  return (
    <>
      <div style={{ display: 'contents' }}>
        {visible.map((item, i) => renderItem(item, start + i))}
      </div>
      <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: 'var(--sp-6)' }}>
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i)}
            style={{
              width: i === page ? '24px' : '8px',
              height: '8px',
              borderRadius: '4px',
              border: 'none',
              background: i === page ? 'var(--amber)' : 'var(--land-border)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              padding: 0,
            }}
          />
        ))}
      </div>
    </>
  );
}
