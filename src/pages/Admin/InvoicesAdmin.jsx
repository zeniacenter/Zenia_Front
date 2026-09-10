import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { invoicesAPI } from '../../services/api';
import { TableSkeleton } from '../../components/Skeleton';
import { FileText, FileCode, RefreshCw, Receipt, Monitor } from 'lucide-react';

const RAPIFAC_PANEL_URL =
  import.meta.env.VITE_RAPIFAC_PANEL_URL || 'https://sistema-p1.rapifac.com/';

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

  const openRapifacPanel = () => {
    window.open(RAPIFAC_PANEL_URL, '_blank', 'noopener,noreferrer');
  };

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

  return (
    <div>
      <div className="admin-header">
        <h2>Comprobantes Electrónicos</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={openRapifacPanel}>
            <Monitor size={16} style={{ marginRight: 6 }} /> Panel RapiFac
          </button>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={16} style={{ marginRight: 6 }} /> Actualizar</button>
          <Link to="/admin/citas" className="btn btn-primary"><Receipt size={16} style={{ marginRight: 6 }} /> Emitir</Link>
        </div>
      </div>

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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
