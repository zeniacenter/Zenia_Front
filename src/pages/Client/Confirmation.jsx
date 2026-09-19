import { Link, useLocation } from 'react-router-dom';
import { formatHours } from '../../utils/hours';

export default function Confirmation() {
  const { state } = useLocation();

  if (!state) {
    return (
      <div className="section" style={{ textAlign: 'center' }}>
        <h2>No hay datos de reserva</h2>
        <Link to="/agendar" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Agendar una cita
        </Link>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="confirmation-container">
        <div className="confirmation-icon">✓</div>
        <h2>¡Reserva Confirmada!</h2>
        <p style={{ color: 'var(--land-text-sec)', marginTop: '0.5rem' }}>
          Tu cita ha sido registrada exitosamente
        </p>

        <div className="confirmation-details">
          <div className="detail-row">
            <strong>Cliente:</strong>
            <span>{state.clientName}</span>
          </div>
          <div className="detail-row">
            <strong>Teléfono:</strong>
            <span>{state.clientPhone}</span>
          </div>
          <div className="detail-row">
            <strong>Terapeuta:</strong>
            <span>{state.therapist}</span>
          </div>
          {state.cabin && (
            <div className="detail-row">
              <strong>Cabina:</strong>
              <span>{state.cabin}</span>
            </div>
          )}
          {state.branch && (
            <div className="detail-row">
              <strong>Sede:</strong>
              <span>{state.branch}</span>
            </div>
          )}
          <div className="detail-row">
            <strong>Servicios:</strong>
            <span>{state.services?.join(', ')}</span>
          </div>
          {state.packageName && (
            <div className="detail-row">
              <strong>Paquete:</strong>
              <span>{state.packageName}</span>
            </div>
          )}
          {state.sessions && state.sessions.length > 1 ? (
            state.sessions.map((s, i) => (
              <div key={i} className="detail-row">
                <strong>Sesión {i + 1}:</strong>
                <span>{s.name} — {s.date && s.time ? `${s.date} ${s.time}` : 'Por coordinar'} ({formatHours(s.hours)} h)</span>
              </div>
            ))
          ) : (
            <>
              <div className="detail-row">
                <strong>Fecha:</strong>
                <span>{state.date}</span>
              </div>
              <div className="detail-row">
                <strong>Hora:</strong>
                <span>{state.time}</span>
              </div>
            </>
          )}
          {state.pendingSessions > 0 && (
            <div style={{
              margin: '0.75rem 0', padding: '0.75rem 1rem', borderRadius: '8px',
              background: '#FDF6E9', border: '1px solid #E8E0D6', fontSize: '0.85rem', color: '#8B6520',
            }}>
              💡 Tu reserva incluye <strong>{state.totalSessions} sesiones</strong> en total. Has programado <strong>{state.sessions?.length || 1}</strong> y tienes <strong>{state.pendingSessions} {state.pendingSessions === 1 ? 'sesión pendiente' : 'sesiones pendientes'}</strong> por programar. Podrás coordinarlas con nosotros cuando desees.
            </div>
          )}
          <div className="detail-row">
            <strong>Duración:</strong>
            <span>{formatHours(state.hours)} h</span>
          </div>
          {state.originalPrice > state.total && (
            <div className="detail-row">
              <span style={{ textDecoration: 'line-through', color: 'var(--land-text-muted)' }}>Precio original</span>
              <span style={{ textDecoration: 'line-through', color: 'var(--land-text-muted)' }}>S/ {state.originalPrice}</span>
            </div>
          )}
          <div className="detail-row" style={{ borderBottom: 'none', fontSize: '1.2rem', fontWeight: '700', color: 'var(--amber)' }}>
            <strong>Total:</strong>
            <span>S/ {state.total}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
          <Link to="/" className="btn btn-primary">Volver al Inicio</Link>
          <Link to="/agendar" className="btn btn-outline">Agendar otra cita</Link>
        </div>
      </div>
    </div>
  );
}
