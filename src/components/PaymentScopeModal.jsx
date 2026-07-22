import { X, CreditCard, Package } from 'lucide-react';

export default function PaymentScopeModal({ open, onClose, appointment, onPaySession, onPayAllSessions }) {
  if (!open || !appointment) return null;

  const apt = appointment;
  const isGroupSession = !!apt.group_id && apt.session_number && apt.total_sessions;
  const isPackage = (apt.package_id && apt.package) || isGroupSession;
  const packageName = isGroupSession
    ? `Multi-sesión (${apt.total_sessions} sesiones)`
    : (apt.package?.name || '');
  const totalSessions = isGroupSession ? apt.total_sessions : (apt.package?.total_sessions || 1);
  const currentSession = isGroupSession ? apt.session_number : 1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Seleccionar Alcance del Pago</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div style={{ padding: '1rem 0' }}>
          {isPackage && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid #bae6fd'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{packageName}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Sesión {currentSession} de {totalSessions}
              </div>
            </div>
          )}

          <p style={{ marginBottom: '1rem', color: '#64748b' }}>
            {isPackage
              ? '¿Desea pagar solo esta sesión o todas las sesiones del paquete?'
              : 'Seleccione cómo desea registrar el pago:'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0 0 1rem' }}>
          <button
            className="btn btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '1rem',
              textAlign: 'left',
              justifyContent: 'flex-start'
            }}
            onClick={() => {
              onPaySession(appointment);
              onClose();
            }}
          >
            <CreditCard size={20} />
            <div>
              <div style={{ fontWeight: 600 }}>Pagar solo esta sesión</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Registra el pago únicamente para esta sesión
              </div>
            </div>
          </button>

          {isPackage && (
            <button
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                textAlign: 'left',
                justifyContent: 'flex-start'
              }}
              onClick={() => {
                onPayAllSessions(appointment);
                onClose();
              }}
            >
              <Package size={20} />
              <div>
                <div style={{ fontWeight: 600 }}>Pagar todas las sesiones del paquete</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  Marca todas las sesiones restantes como pagadas
                </div>
              </div>
            </button>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
