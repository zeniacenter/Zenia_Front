export default function Pagination({ total, page, onPageChange, rowsPerPage, onRowsPerPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  if (total === 0) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0.75rem 1rem', borderTop: '1px solid #E8E0D6', flexWrap: 'wrap', gap: '0.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#6B5B4E' }}>
        <span>Filas:</span>
        <select
          value={rowsPerPage}
          onChange={(e) => { onRowsPerPageChange(Number(e.target.value)); onPageChange(0); }}
          style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #E8E0D6', background: '#FFFFFF', color: '#3D2E24', fontSize: '0.8rem', cursor: 'pointer' }}
        >
          {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#6B5B4E' }}>
        <span>{page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, total)} de {total}</span>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button
            disabled={page === 0}
            onClick={() => onPageChange(page - 1)}
            style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #E8E0D6', background: page === 0 ? '#F5F0E8' : '#FFFFFF', color: page === 0 ? '#C8C0BA' : '#3D2E24', cursor: page === 0 ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
          >← Ant</button>
          <span style={{ padding: '0.3rem 0.4rem' }}>{page + 1} / {totalPages}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
            style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #E8E0D6', background: page >= totalPages - 1 ? '#F5F0E8' : '#FFFFFF', color: page >= totalPages - 1 ? '#C8C0BA' : '#3D2E24', cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
          >Sig →</button>
        </div>
      </div>
    </div>
  );
}
