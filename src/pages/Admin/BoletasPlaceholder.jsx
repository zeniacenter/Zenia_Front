import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { appointmentsAPI, invoicesAPI } from '../../services/api';
import useEscClose from '../../hooks/useEscClose';

const formatMoney = (n) => Number(n || 0).toFixed(2);

export default function BoletasPlaceholder() {
  const { id } = useParams();

  const [appointment, setAppointment] = useState(null);
  const [clientAppointments, setClientAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [type, setType] = useState('boleta');
  const [mode, setMode] = useState('individual');
  const [selectedIds, setSelectedIds] = useState([]);
  const [clientDocType, setClientDocType] = useState('dni');
  const [clientDocument, setClientDocument] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(null);

  useEscClose(!!confirmDuplicate, () => setConfirmDuplicate(null));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const aptRes = await appointmentsAPI.get(id);
        if (cancelled) return;

        const apt = aptRes.data;
        setAppointment(apt);

        const person = apt.person || apt.client;
        if (person) {
          setClientDocType(person.document_type === 'ruc' ? 'ruc' : 'dni');
          setClientDocument(person.ruc || person.dni || '');
          setClientName(`${person.name || ''}${person.last_name ? ' ' + person.last_name : ''}`.trim());
          setClientAddress(person.address || '');
          setClientEmail(person.email || '');
        }

        // Cargar las citas del mismo cliente para el modo agrupado
        const listRes = await appointmentsAPI.list();
        if (!cancelled) {
          const all = listRes.data || [];
          const sameClient = all.filter((a) => (a.person_id || a.person?.id) === (apt.person_id || apt.person?.id));
          setClientAppointments(sameClient);
          setSelectedIds([apt.id]);
        }
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.message || 'No se pudo cargar la cita');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (mode === 'individual' && appointment) {
      setSelectedIds([appointment.id]);
    }
  }, [mode, appointment]);

  const toggleSelection = (aptId) => {
    if (mode === 'individual') return;
    setSelectedIds((prev) =>
      prev.includes(aptId)
        ? prev.filter((x) => x !== aptId)
        : [...prev, aptId]
    );
  };

  const selected = clientAppointments.filter((a) => selectedIds.includes(a.id));
  const total = selected.reduce((sum, a) => sum + Number(a.total_price || 0), 0);

  const handleEmit = async () => {
    setError('');
    setResult(null);

    if (selectedIds.length === 0) {
      setError('Selecciona al menos una cita');
      return;
    }

    if (type === 'factura' && clientDocType !== 'ruc') {
      setError('Para emitir factura el cliente debe tener RUC');
      return;
    }
    if (type === 'factura' && !clientDocument) {
      setError('Ingresa el RUC del cliente para la factura');
      return;
    }
    if (!clientName) {
      setError('Ingresa el nombre o razón social del cliente');
      return;
    }

    // Detectar si alguna de las citas seleccionadas ya tiene un comprobante emitido
    try {
      const invRes = await invoicesAPI.list();
      const invoices = invRes.data || [];
      const existing = invoices.filter((inv) =>
        (inv.appointments || []).some((a) => selectedIds.includes(a.id))
      );
      if (existing.length > 0) {
        setConfirmDuplicate({
          type,
          existingDoc: existing.map((e) => e.documento_id).join(', '),
        });
        return;
      }
    } catch {
      // Si no se puede verificar, continúa con la emisión
    }

    await doEmit();
  };

  const doEmit = async () => {
    setError('');
    setEmitting(true);
    try {
      const res = await invoicesAPI.emit({
        appointment_ids: selectedIds,
        type,
        document_type: clientDocType,
        client_document: clientDocument,
        client_name: clientName,
        client_address: clientAddress,
        client_email: sendEmail ? clientEmail : undefined,
        send_email: sendEmail,
      });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Ocurrió un error al emitir el comprobante');
    } finally {
      setEmitting(false);
    }
  };

  const confirmDuplicateYes = () => {
    setConfirmDuplicate(null);
    doEmit();
  };

  if (loading) {
    return <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>Cargando cita...</div>;
  }

  if (error && !appointment) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>{error}</p>
        <Link to="/admin/citas" className="btn btn-primary" style={{ marginTop: '1rem' }}>Volver a Citas</Link>
      </div>
    );
  }

  const data = appointment && (appointment.person || appointment.client);

  return (
    <div>
      <div className="admin-header">
        <h2>Emisión de Comprobante</h2>
        <Link to="/admin/citas" className="btn btn-secondary">Volver a Citas</Link>
      </div>

      {result ? (
        <div className="card" style={{ padding: '2rem' }}>
          <h3>Comprobante emitido</h3>
          <p style={{ marginTop: '0.5rem' }}>
            <strong>{result.invoice?.documento_id || result.raifac_response?.xml_pdf?.Mensaje || 'Comprobante'}</strong>
          </p>
          <p style={{ color: 'var(--text-muted)' }}>
            {result.invoice?.cdr_mensaje || (result.raifac_response?.cdr?.Mensaje) || 'Documento procesado'}
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Emitir otro</button>
            <Link to="/admin/comprobantes" className="btn btn-secondary">Ver Comprobantes</Link>
            <Link to="/admin/citas" className="btn btn-secondary">Ir a Citas</Link>
          </div>
        </div>
      ) : (
        <>
          <section className="card" style={{ padding: '1.5rem' }}>
            <h3>Datos de la cita</h3>
            {data && (
              <p style={{ marginTop: '0.5rem' }}>
                Cliente: {data.name}{data.last_name ? ' ' + data.last_name : ''}
                {' · '}
                {data.document_type === 'ruc' ? 'RUC: ' + data.ruc : 'DNI: ' + data.dni}
              </p>
            )}
            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {appointment?.services?.map((s) => s.name).join(', ') || 'Servicio'} · {appointment?.date} {appointment?.start_time}
            </p>
          </section>

          <section className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
            <h3>Modo de emisión</h3>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input type="radio" name="mode" checked={mode === 'individual'} onChange={() => setMode('individual')} />
                Individual (solo esta cita)
              </label>
              <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input type="radio" name="mode" checked={mode === 'grouped'} onChange={() => setMode('grouped')} />
                Agrupado (varias sesiones)
              </label>
            </div>

            {mode === 'grouped' && (
              <div style={{ marginTop: '1rem', maxHeight: '240px', overflowY: 'auto' }}>
                {clientAppointments.map((a) => (
                  <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(a.id)}
                      onChange={() => toggleSelection(a.id)}
                    />
                    <span>
                      {a.date} {a.start_time} — {a.services?.map((s) => s.name).join(', ') || 'Servicio'} — S/ {formatMoney(a.total_price)}
                    </span>
                  </label>
                ))}
                {clientAppointments.length === 0 && (
                  <p style={{ color: 'var(--text-muted)' }}>No se encontraron otras citas del cliente</p>
                )}
              </div>
            )}
          </section>

          <section className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
            <h3>Tipo de documento</h3>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input type="radio" name="type" checked={type === 'boleta'} onChange={() => { setType('boleta'); if (clientDocType === 'ruc') setClientDocType('dni'); }} />
                Boleta
              </label>
              <label style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input type="radio" name="type" checked={type === 'factura'} onChange={() => setType('factura')} />
                Factura
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginTop: '1rem' }}>
              <label>
                Tipo de documento del cliente
                <select
                  className="form-input"
                  value={clientDocType}
                  onChange={(e) => {
                    setClientDocType(e.target.value);
                    if (e.target.value === 'dni' && type === 'factura') setType('boleta');
                  }}
                >
                  <option value="dni">DNI</option>
                  <option value="ruc">RUC</option>
                </select>
              </label>
              <label>
                Número de documento
                <input
                  className="form-input"
                  value={clientDocument}
                  onChange={(e) => setClientDocument(e.target.value)}
                  placeholder={type === 'factura' ? 'RUC' : 'DNI'}
                />
              </label>
              <label>
                Nombre / Razón social
                <input className="form-input" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </label>
              <label>
                Dirección (obligatoria en factura)
                <input className="form-input" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
              </label>
              <label>
                Correo del cliente (para envío)
                <input className="form-input" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="cliente@correo.com" />
              </label>
            </div>

            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
              />
              <span>Enviar comprobante por correo al cliente tras emitir</span>
            </label>
          </section>

          <section className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Resumen</h3>
                <p style={{ color: 'var(--text-muted)' }}>{selected.length} cita(s) seleccionada(s)</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '1.3rem', fontWeight: 700 }}>S/ {formatMoney(total)}</p>
              </div>
            </div>

            {error && (
              <p style={{ color: '#B85C4C', marginTop: '1rem', background: '#FCEEED', padding: '0.75rem', borderRadius: '6px' }}>
                {error}
              </p>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem' }}
              onClick={handleEmit}
              disabled={emitting}
            >
              {emitting ? 'Emitiendo...' : `Emitir ${type === 'factura' ? 'Factura' : 'Boleta'}`}
            </button>
          </section>
        </>
      )}

      {confirmDuplicate && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3>Comprobante ya emitido</h3>
              <button className="modal-close" onClick={() => setConfirmDuplicate(null)}>&times;</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ margin: 0 }}>
                Las citas seleccionadas ya tienen un comprobante emitido:
              </p>
              <p style={{ fontWeight: 600, margin: '0.5rem 0' }}>{confirmDuplicate.existingDoc}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                ¿Quieres volver a emitir {confirmDuplicate.type === 'factura' ? 'una factura' : 'una boleta'}? Esto podría generar un duplicado.
              </p>
            </div>
            <div className="modal-actions" style={{ borderTop: '1px solid var(--adm-border)', padding: '1rem 1.5rem' }}>
              <button className="btn btn-outline" onClick={() => setConfirmDuplicate(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={confirmDuplicateYes}>
                Sí, emitir {confirmDuplicate.type === 'factura' ? 'factura' : 'boleta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
