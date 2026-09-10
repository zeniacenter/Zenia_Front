import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import useEscClose from '../hooks/useEscClose';

const TYPE_CONFIG = {
  success: { icon: CheckCircle2, color: '#2E7D52', bg: '#EAF4EE' },
  error: { icon: XCircle, color: '#B85C4C', bg: '#FCEEED' },
  warning: { icon: AlertTriangle, color: '#B8812A', bg: '#FBF3E3' },
  info: { icon: Info, color: '#4A7A9A', bg: '#EAF2F6' },
};

export default function NotificationModal({ open, type = 'info', title, message, onClose }) {
  useEscClose(open, onClose);
  if (!open) return null;

  const { icon: Icon, color, bg } = TYPE_CONFIG[type] || TYPE_CONFIG.info;
  const isSuccess = type === 'success';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="notification-card modal" style={{ maxWidth: '420px', textAlign: 'center' }}>
        <button
          type="button"
          className="modal-close"
          style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}
          onClick={onClose}
          aria-label="Cerrar notificación"
        >
          <X size={18} />
        </button>
        <div
          style={{
            width: '72px', height: '72px', margin: '0 auto 1rem',
            borderRadius: '50%', background: bg, color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon size={36} />
        </div>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
          {message}
        </p>
        <div className="modal-actions" style={{ justifyContent: 'center' }}>
          <button type="button" className={`btn ${isSuccess ? 'btn-primary' : 'btn-secondary'}`} onClick={onClose}>
            {isSuccess ? 'Entendido' : 'Cerrar'}
          </button>
        </div>
      </div>
    </div>
  );
}