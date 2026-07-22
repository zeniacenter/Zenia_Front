import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const CANCEL_REASONS = [
  { value: 'cliente_solicita', label: 'El cliente solicitó la cancelación' },
  { value: 'terapeuta_no_disponible', label: 'El terapeuta no está disponible' },
  { value: 'problema_personal', label: 'Problema personal / fuerza mayor' },
  { value: 'cambio_planes', label: 'El cliente cambió de planes' },
  { value: 'duplicado', label: 'Cita duplicada' },
  { value: 'otro', label: 'Otro motivo' },
];

export default function CancelAppointmentModal({ open, appointment, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  if (!open || !appointment) return null;

  const clientName = appointment.person?.name || appointment.clientName || 'N/A';
  const services = appointment.services?.length
    ? appointment.services.map((s) => s.name).join(', ')
    : 'N/A';

  const handleConfirm = () => {
    const finalReason = reason === 'otro' ? customReason : reason;
    if (!finalReason.trim()) return;
    onConfirm(finalReason.trim());
    setReason('');
    setCustomReason('');
  };

  const handleClose = () => {
    setReason('');
    setCustomReason('');
    onCancel();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#FFFFFF', borderRadius: '14px', padding: '1.5rem',
          width: '100%', maxWidth: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ color: '#B85C4C' }}><AlertTriangle size={28} /></div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#3D2E24' }}>Cancelar Cita</h3>
        </div>
        <p style={{ margin: '0 0 0.25rem', fontSize: '0.8rem', color: '#6B5B4E' }}>
          <strong>{clientName}</strong> — {services}
        </p>
        <p style={{ margin: '0 0 1rem', fontSize: '0.78rem', color: '#A89888' }}>
          {appointment.date} · {appointment.start_time} - {appointment.end_time}
        </p>

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#6B5B4E', marginBottom: '0.5rem' }}>
            Motivo de la cancelación <span style={{ color: '#B85C4C' }}>*</span>
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {CANCEL_REASONS.map((r) => (
              <label
                key={r.value}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.45rem 0.65rem', borderRadius: '8px',
                  border: reason === r.value ? '1.5px solid #C9944A' : '1px solid #E8E0D6',
                  background: reason === r.value ? '#FDF6E9' : '#FFFFFF',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  fontSize: '0.8rem', color: '#3D2E24',
                }}
              >
                <input
                  type="radio"
                  name="cancel_reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  style={{ accentColor: '#C9944A' }}
                />
                {r.label}
              </label>
            ))}
          </div>
          {reason === 'otro' && (
            <input
              type="text"
              placeholder="Especifica el motivo..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              style={{
                width: '100%', marginTop: '0.5rem', padding: '0.55rem 0.75rem',
                borderRadius: '8px', border: '1px solid #E8E0D6', background: '#FFFFFF',
                color: '#3D2E24', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none',
              }}
            />
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={handleClose}>
            Volver
          </button>
          <button
            className="btn btn-danger"
            disabled={!reason || (reason === 'otro' && !customReason.trim())}
            style={{
              opacity: (!reason || (reason === 'otro' && !customReason.trim())) ? 0.5 : 1,
              cursor: (!reason || (reason === 'otro' && !customReason.trim())) ? 'not-allowed' : 'pointer',
            }}
            onClick={handleConfirm}
          >
            Confirmar Cancelación
          </button>
        </div>
      </div>
    </div>
  );
}
