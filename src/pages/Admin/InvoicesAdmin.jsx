import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { invoicesAPI } from '../../services/api';
import { TableSkeleton } from '../../components/Skeleton';
import useEscClose from '../../hooks/useEscClose';
import { FileText, FileCode, Mail, RefreshCw, Receipt, Send } from 'lucide-react';

const formatMoney = (n) => Number(n || 0).toFixed(2);

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const statusBadge = (status) => {
  if (status === 'emitido') return 'badge badge-confirmed';
  if (status === 'error') return 'badge badge-cancelled';
  return 'badge badge-pending';
};

export default function InvoicesAdmin() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [emailTarget, setEmailTarget] = useState(null);
  const [emailValue, setEmailValue] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEscClose(!!emailTarget, () => setEmailTarget(null));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await invoicesAPI.list();
      setInvoices(res.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudieron cargar los comprobantes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async (inv, kind) => {
    setError('');
    try {
      const res = kind === 'pdf' ? await invoicesAPI.pdf(inv.id) : await invoicesAPI.xml(inv.id);
      const ext = kind === 'pdf' ? 'pdf' : 'xml';
      downloadBlob(res.data, `${inv.documento_id}.${ext}`);
    } catch (e) {
      setError(e.response?.data?.message || `No se pudo descargar el ${kind.toUpperCase()}`);
    }
  };

  const openEmailModal = (inv) => {
    const registered = inv.client_email || inv.client?.email || '';
    setEmailValue(registered);
    setEmailTarget(inv);
  };

  const confirmSendEmail = async () => {
    if (!emailTarget) return;
    const to = emailValue.trim();
    setError('');
    setNotice('');
    if (!to) {
      setError('Ingresa un correo para el envío');
      return;
    }
    setSendingEmail(true);
    try {
      const res = await invoicesAPI.email(emailTarget.id, to);
      setNotice(res.data?.message || 'Correo encolado correctamente');
      setEmailTarget(null);
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudo enviar el correo');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div>
      <div className="admin-header">
        <h2>Comprobantes Electrónicos</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={16} style={{ marginRight: 6 }} /> Actualizar</button>
          <Link to="/admin/citas" className="btn btn-primary"><Receipt size={16} style={{ marginRight: 6 }} /> Emitir</Link>
        </div>
      </div>

      {notice && (
        <p style={{ color: '#2E7D32', background: '#E8F5E9', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
          {notice}
        </p>
      )}
      {error && (
        <p style={{ color: '#B85C4C', background: '#FCEEED', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      {loading ? (
        <TableSkeleton columns={6} rows={8} />
      ) : invoices.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Aún no se han emitido comprobantes. Ve a Citas para emitir una boleta o factura.
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Comprobante</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600 }}>{inv.documento_id}</td>
                  <td>{inv.tipoLabel || (inv.type === 'factura' ? 'Factura' : 'Boleta')}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{inv.cliente_nombre}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {inv.client_email || inv.client?.email || 'sin correo registrado'}
                    </div>
                  </td>
                  <td>{(inv.payload?.FechaEmision) || (inv.created_at ? new Date(inv.created_at).toLocaleDateString('es-PE') : '')}</td>
                  <td style={{ fontWeight: 500 }}>S/ {formatMoney(inv.monto_total)}</td>
                  <td><span className={statusBadge(inv.status)}>{inv.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-sm btn-outline" title="Descargar PDF" onClick={() => handleDownload(inv, 'pdf')}>
                        <FileText size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline" title="Descargar XML" onClick={() => handleDownload(inv, 'xml')}>
                        <FileCode size={14} />
                      </button>
                      <button className="btn btn-sm btn-outline" title="Enviar por correo" onClick={() => openEmailModal(inv)}>
                        <Mail size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {emailTarget && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3>Enviar {emailTarget.documento_id}</h3>
              <button className="modal-close" onClick={() => setEmailTarget(null)}>&times;</button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                confirmSendEmail();
              }}
            >
              <div className="form-group">
                <label>Correo del cliente</label>
                <input
                  type="email"
                  className="form-control"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  placeholder="cliente@correo.com"
                  autoFocus
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginTop: '0.3rem' }}>
                  Correo registrado en la cita: <strong>{emailTarget.client_email || emailTarget.client?.email || 'no registrado'}</strong>
                </small>
              </div>

              {error && (
                <p style={{ color: '#B85C4C', background: '#FCEEED', padding: '0.65rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                  {error}
                </p>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setEmailTarget(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={sendingEmail}>
                  <Send size={15} style={{ marginRight: 6 }} />
                  {sendingEmail ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
