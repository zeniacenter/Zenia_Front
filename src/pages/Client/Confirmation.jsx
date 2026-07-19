import { Link, useLocation } from 'react-router-dom';

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
          <div className="detail-row">
            <strong>Cabina:</strong>
            <span>{state.cabin}</span>
          </div>
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
          <div className="detail-row">
            <strong>Fecha:</strong>
            <span>{state.date}</span>
          </div>
          <div className="detail-row">
            <strong>Hora:</strong>
            <span>{state.time}</span>
          </div>
          <div className="detail-row">
            <strong>Duración:</strong>
            <span>{state.hours} {state.hours === 1 ? 'hora' : 'horas'}</span>
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
