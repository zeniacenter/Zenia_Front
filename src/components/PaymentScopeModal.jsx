import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Package, Receipt, FileText, CheckCircle2 } from 'lucide-react';
import useEscClose from '../hooks/useEscClose';

export default function PaymentScopeModal({ open, onClose, appointment, onPaySession, onPayAllSessions }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  useEscClose(open, onClose);

  useEffect(() => {
    if (open) {
      setStep(1);
      setError('');
    }
  }, [open]);

  if (!open || !appointment) return null;

  const runAction = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn(appointment);
      setStep(2);
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo registrar el pago. Inténtalo de nuevo.');
      setBusy(false);
    }
  };

  const goEmit = (type) => {
    const qs = type === 'factura' ? '?type=factura' : '';
    navigate(`/admin/boletas/${appointment.id}${qs}`);
    onClose();
  };

  const apt = appointment;
  const isGroupSession = !!apt.group_id && apt.session_number && apt.total_sessions;
  const isPackage = (apt.package_id && apt.package) || isGroupSession;
  const packageName = isGroupSession
    ? `Multi-sesión (${apt.total_sessions} sesiones)`
    : (apt.package?.name || '');
  const totalSessions = isGroupSession ? apt.total_sessions : (apt.package?.total_sessions || 1);
  const currentSession = isGroupSession ? apt.session_number : 1;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>{step === 1 ? 'Seleccionar Alcance del Pago' : 'Pago registrado'}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {step === 1 ? (
          <>
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
                  justifyContent: 'flex-start',
                  opacity: busy ? 0.6 : 1,
                  cursor: busy ? 'wait' : 'pointer',
                }}
                onClick={() => runAction(onPaySession)}
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
                    justifyContent: 'flex-start',
                    opacity: busy ? 0.6 : 1,
                    cursor: busy ? 'wait' : 'pointer',
                  }}
                  onClick={() => runAction(onPayAllSessions)}
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

              {error && (
                <p style={{ color: '#B85C4C', background: '#FCEEED', padding: '0.65rem', borderRadius: '6px', fontSize: '0.85rem', margin: 0 }}>
                  {error}
                </p>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={onClose} disabled={busy}>
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '1rem 0', textAlign: 'center' }}>
              <CheckCircle2 size={36} color="#2D7A3A" style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontWeight: 600, color: '#3D2E24', margin: '0 0 0.25rem' }}>
                El pago fue registrado correctamente
              </p>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                ¿Deseas emitir el comprobante?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0 0 1rem' }}>
              <button
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                }}
                onClick={() => goEmit('boleta')}
              >
                <Receipt size={20} />
                <div>
                  <div style={{ fontWeight: 600 }}>Boleta</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                    Emitir boleta de venta para el cliente
                  </div>
                </div>
              </button>

              <button
                className="btn btn-outline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                }}
                onClick={() => goEmit('factura')}
              >
                <FileText size={20} />
                <div>
                  <div style={{ fontWeight: 600 }}>Factura</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Requiere RUC y datos fiscales del cliente
                  </div>
                </div>
              </button>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={onClose}>
                Ahora no
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}