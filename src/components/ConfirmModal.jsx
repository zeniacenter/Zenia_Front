import { AlertTriangle } from 'lucide-react';
import useEscClose from '../hooks/useEscClose';

export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm, onCancel }) {
  useEscClose(open, onCancel);
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div
        className="modal"
        style={{ maxWidth: '400px', textAlign: 'center' }}
      >
        <div style={{ marginBottom: '0.75rem', color: '#B85C4C' }}><AlertTriangle size={42} /></div>
        <h3 style={{ marginBottom: '0.5rem' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem', whiteSpace: 'pre-line' }}>
          {message}
        </p>
        <div className="modal-actions" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}