import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Inbox, Info } from 'lucide-react';
import TimeSlotPicker from '../../components/TimeSlotPicker';
import CancelAppointmentModal from '../../components/CancelAppointmentModal';
import AppointmentDetailModal from '../../components/AppointmentDetailModal';
import PaymentScopeModal from '../../components/PaymentScopeModal';
import { appointmentsAPI } from '../../services/api';

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: '#8B6520', bg: '#FDF6E9' },
  confirmada: { label: 'Confirmada', color: '#8B6A50', bg: '#F5EDE5' },
  cancelada: { label: 'Cancelada', color: '#B85C4C', bg: '#FCEEED' },
  realizada: { label: 'Realizada', color: '#6A4A3A', bg: '#F0EBE3' },
  postergada: { label: 'Postergada', color: '#4A7A9A', bg: '#EBF3F8' },
};

const PAYMENT_CONFIG = {
  pagado: { label: 'Pagado', color: '#2D7A3A', bg: '#E8F5E9' },
  pendiente: { label: 'Pendiente', color: '#B85C4C', bg: '#FCEEED' },
  parcial: { label: 'Parcial', color: '#B8860B', bg: '#FFF8E1' },
};

const FILTERS = [
  { key: 'todas', label: 'Activas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'confirmada', label: 'Confirmadas' },
  { key: 'realizada', label: 'Realizadas' },
  { key: 'postergada', label: 'Postergadas' },
  { key: 'cancelada', label: 'Canceladas' },
];

const inputStyle = {
  width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px',
  border: '1px solid #E8E0D6', background: '#FFFFFF', color: '#3D2E24',
  fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none',
};

export default function AppointmentsAdmin() {
  const { appointments, therapists, services, cabins, branches, updateAppointment } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('todas');
  const [postponeTarget, setPostponeTarget] = useState(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeTime, setPostponeTime] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterBranch, setFilterBranch] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [paymentScopeTarget, setPaymentScopeTarget] = useState(null);

  useEffect(() => { setPage(0); }, [filter]);

  const counts = useMemo(() => ({
    todas: appointments.filter((a) => a.status !== 'cancelada').length,
    pendiente: appointments.filter((a) => a.status === 'pendiente').length,
    confirmada: appointments.filter((a) => a.status === 'confirmada').length,
    realizada: appointments.filter((a) => a.status === 'realizada').length,
    postergada: appointments.filter((a) => a.status === 'postergada').length,
    cancelada: appointments.filter((a) => a.status === 'cancelada').length,
  }), [appointments]);

  const filtered = useMemo(() => {
    let list = filter === 'todas'
      ? appointments.filter((a) => a.status !== 'cancelada')
      : appointments.filter((a) => a.status === filter);
    if (filterBranch) {
      list = list.filter((a) => {
        const cabinId = a.cabinId || a.cabin_id;
        if (!cabinId) return false;
        const cabin = cabins.find((c) => c.id === cabinId);
        return cabin && String(c.branchId || c.branch_id) === String(filterBranch);
      });
    }
    return [...list].sort((a, b) => {
      const d = (a.date || '').localeCompare(b.date || '');
      if (d !== 0) return d;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });
  }, [appointments, filter, filterBranch, cabins]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paged = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const getName = (apt) => apt.person?.name || apt.clientName || 'N/A';
  const getTime = (apt) => apt.start_time || 'N/A';
  const getEndTime = (apt) => apt.end_time || '';
  const getServices = (apt) => {
    if (apt.services?.length) return apt.services.map((s) => s.name).join(', ');
    const ids = apt.service_ids || apt.serviceIds;
    if (ids?.length) return ids.map((id) => services.find((s) => s.id === id)?.name).filter(Boolean).join(', ');
    return 'N/A';
  };

  const getServiceLabel = (apt) => {
    if (apt.group_id && apt.session_number) {
      return {
        type: 'MULTI-SESIÓN',
        name: apt.services?.length ? apt.services.map((s) => s.name).join(', ') : getServices(apt),
        detail: `Sesión ${apt.session_number}/${apt.total_sessions}`,
      };
    }
    const pkgName = apt.package?.name;
    const svcName = getServices(apt);
    if (pkgName) return { type: 'PAQUETE', name: pkgName, detail: svcName };
    return { type: 'SERVICIO', name: svcName, detail: null };
  };

  const openPostpone = (apt) => {
    setPostponeTarget(apt);
    setPostponeDate(apt.date || '');
    setPostponeTime(apt.start_time || apt.time || '');
  };

  const confirmPostpone = async () => {
    if (!postponeDate || !postponeTime) return;
    const apt = postponeTarget;
    const hours = apt.hours || 1;
    const startMins = parseInt(postponeTime.split(':')[0]) * 60 + parseInt(postponeTime.split(':')[1]);
    const endMins = startMins + hours * 60;
    const endH = Math.floor(endMins / 60);
    const endM = endMins % 60;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const newStatus = apt.status === 'postergada' ? 'pendiente' : 'postergada';
    await updateAppointment(apt.id, {
      status: newStatus,
      date: postponeDate,
      start_time: postponeTime,
      end_time: endTime,
    });
    setPostponeTarget(null);
  };

  const handleCancelConfirm = async (reason) => {
    if (!cancelTarget) return;
    await updateAppointment(cancelTarget.id, {
      status: 'cancelada',
      cancellation_reason: reason,
    });
    setCancelTarget(null);
  };

  const handlePaymentPropagate = async (apt) => {
    const isGroup = !!apt.group_id;

    if (isGroup) {
      const siblings = appointments.filter(
        (a) => a.group_id === apt.group_id && a.person_id === apt.person_id && a.payment_status !== 'pagado'
      );
      try {
        await appointmentsAPI.propagatePaymentGroup(apt.group_id, apt.person_id);
      } catch {}
      for (const sib of [...siblings, apt]) {
        if (sib.payment_status !== 'pagado') {
          await updateAppointment(sib.id, { payment_status: 'pagado', paid_amount: sib.total_price });
        }
      }
    } else if (apt.package_id) {
      const siblings = appointments.filter(
        (a) => a.package_id === apt.package_id && a.person_id === apt.person_id && a.payment_status !== 'pagado'
      );
      try {
        await appointmentsAPI.propagatePayment(apt.package_id, apt.person_id);
      } catch {}
      for (const sib of [...siblings, apt]) {
        if (sib.payment_status !== 'pagado') {
          await updateAppointment(sib.id, { payment_status: 'pagado', paid_amount: sib.total_price });
        }
      }
    }
  };

  const handlePaySession = async (apt) => {
    await updateAppointment(apt.id, {
      payment_status: 'pagado',
      paid_amount: apt.total_price,
    });
  };

  const handlePayAllSessions = async (apt) => {
    await handlePaymentPropagate(apt);
  };

  const today = new Date().toISOString().split('T')[0];

  const thStyle = {
    padding: '0.7rem 1rem', fontSize: '0.7rem', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    color: '#A89888', textAlign: 'left', whiteSpace: 'nowrap',
  };

  return (
    <div>
      <div className="admin-header">
        <h2>Gestión de Citas</h2>
        <button className="btn btn-primary" onClick={() => navigate('/admin/agendar')}>
          + Agendar Cita
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', color: '#A89888' }}>Sede:</span>
        <select
          value={filterBranch}
          onChange={(e) => setFilterBranch(e.target.value)}
          style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #E8E0D6', background: '#fff', color: '#3D2E24', fontSize: '0.85rem', outline: 'none' }}
        >
          <option value="">Todas</option>
          {branches.filter((b) => b.is_active).map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '0.4rem 0.9rem', borderRadius: '20px',
              border: filter === f.key ? '1.5px solid #C9944A' : '1px solid #E8E0D6',
              background: filter === f.key ? '#FDF6E9' : '#FFFFFF',
              color: filter === f.key ? '#8B6520' : '#A89888',
              fontSize: '0.8rem', fontWeight: filter === f.key ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E8E0D6', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E8E0D6' }}>
                {['Cliente', 'Servicio / Paquete', 'Fecha', 'Hora', 'Estado', 'Estado de pago', 'Acciones'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((apt) => {
                const st = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pendiente;
                const svc = getServiceLabel(apt);
                return (
                  <tr
                    key={apt.id}
                    style={{ borderBottom: '1px solid #F0EBE3', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#FDFCFA'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 600, fontSize: '0.85rem', color: '#3D2E24' }}>
                      {getName(apt)}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{
                          display: 'inline-block', fontSize: '0.55rem', fontWeight: 700, padding: '1px 5px',
                          borderRadius: '4px', width: 'fit-content',
                          background: svc.type === 'PAQUETE' ? '#F5EDE5' : svc.type === 'MULTI-SESIÓN' ? '#E8F5E9' : '#EBF3F8',
                          color: svc.type === 'PAQUETE' ? '#8B6A50' : svc.type === 'MULTI-SESIÓN' ? '#2D7A3A' : '#4A7A9A',
                        }}>{svc.type}</span>
                        <span style={{ fontWeight: 600, color: '#3D2E24', fontSize: '0.82rem' }}>{svc.name}</span>
                        {svc.detail && <span style={{ fontSize: '0.7rem', color: '#A89888' }}>{svc.detail}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.8rem', color: '#3D2E24', whiteSpace: 'nowrap' }}>
                      {apt.date ? new Date(apt.date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.8rem', color: '#3D2E24', whiteSpace: 'nowrap' }}>
                      {getTime(apt)} - {getEndTime(apt)}
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span style={{
                        display: 'inline-block', fontSize: '0.7rem', fontWeight: 600,
                        padding: '0.2rem 0.6rem', borderRadius: '12px',
                        background: st.bg, color: st.color, whiteSpace: 'nowrap',
                      }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      {(() => {
                        const ps = PAYMENT_CONFIG[apt.payment_status] || PAYMENT_CONFIG.pendiente;
                        return (
                          <span style={{
                            display: 'inline-block', fontSize: '0.7rem', fontWeight: 600,
                            padding: '0.2rem 0.6rem', borderRadius: '12px',
                            background: ps.bg, color: ps.color, whiteSpace: 'nowrap', cursor: 'pointer',
                          }} onClick={() => setPaymentScopeTarget(apt)}>
                            {ps.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '0.65rem 0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <button
                          title="Ver detalle"
                          onClick={() => setDetailTarget(apt)}
                          style={{
                            background: 'none', border: '1px solid #E8E0D6', borderRadius: '6px',
                            cursor: 'pointer', padding: '0.3rem 0.4rem', color: '#6B5B4E',
                            display: 'flex', alignItems: 'center', transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C9944A'; e.currentTarget.style.color = '#8B6520'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E8E0D6'; e.currentTarget.style.color = '#6B5B4E'; }}
                        >
                          <Info size={14} />
                        </button>
                        <select
                          value=""
                          onChange={(e) => {
                            const action = e.target.value;
                            if (!action) return;
                            if (action === 'confirmar') updateAppointment(apt.id, { status: 'confirmada' });
                            else if (action === 'realizado') updateAppointment(apt.id, { status: 'realizada' });
                            else if (action === 'postergar') openPostpone(apt);
                            else if (action === 'cancelar') setCancelTarget(apt);
                            else if (action === 'pagar') setPaymentScopeTarget(apt);
                            else if (action === 'emitir_boleta') navigate(`/admin/boletas/${apt.id}`);
                            e.target.value = '';
                          }}
                          style={{
                            fontSize: '0.7rem', padding: '0.3rem 0.4rem', borderRadius: '6px',
                            border: '1px solid #E8E0D6', background: '#FFFFFF',
                            color: '#3D2E24', cursor: 'pointer', fontWeight: 500, minWidth: '100px',
                          }}
                        >
                          <option value="">Acciones...</option>
                          {apt.status === 'pendiente' && <option value="confirmar">Confirmar</option>}
                          {(apt.status === 'pendiente' || apt.status === 'confirmada') && <option value="realizado">Realizado</option>}
                          {(apt.status === 'pendiente' || apt.status === 'confirmada') && <option value="postergar">Postergar</option>}
                          {(apt.status === 'pendiente' || apt.status === 'confirmada' || apt.status === 'postergada') && <option value="cancelar">Cancelar</option>}
                          {apt.status === 'postergada' && <option value="postergar">Reprogramar</option>}
                          {apt.payment_status !== 'pagado' && <option value="pagar">Pagar</option>}
                          <option value="emitir_boleta">Boleta</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem', borderTop: '1px solid #E8E0D6', flexWrap: 'wrap', gap: '0.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#6B5B4E' }}>
              <span>Filas:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #E8E0D6', background: '#FFFFFF', color: '#3D2E24', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#6B5B4E' }}>
              <span>{page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, filtered.length)} de {filtered.length}</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #E8E0D6', background: page === 0 ? '#F5F0E8' : '#FFFFFF', color: page === 0 ? '#C8C0BA' : '#3D2E24', cursor: page === 0 ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
                >← Ant</button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #E8E0D6', background: page >= totalPages - 1 ? '#F5F0E8' : '#FFFFFF', color: page >= totalPages - 1 ? '#C8C0BA' : '#3D2E24', cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
                >Sig →</button>
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#A89888' }}>
            <div style={{ marginBottom: '0.5rem' }}><Inbox size={40} /></div>
            <p>No hay citas {filter !== 'todas' ? 'con este estado' : 'activas'}</p>
          </div>
        )}
      </div>

      {postponeTarget && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setPostponeTarget(null)}
        >
          <div
            style={{ background: '#FFFFFF', borderRadius: '14px', padding: '1.5rem', width: '100%', maxWidth: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', color: '#3D2E24' }}>
              {postponeTarget.status === 'postergada' ? 'Reprogramar Cita' : 'Postergar Cita'}
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#A89888' }}>
              {getName(postponeTarget)} — {getServices(postponeTarget)}
            </p>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B5B4E', marginBottom: '0.3rem' }}>Nueva fecha</label>
              <input type="date" value={postponeDate} min={today} onChange={(e) => { setPostponeDate(e.target.value); setPostponeTime(''); }} style={inputStyle} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B5B4E', marginBottom: '0.3rem' }}>Nueva hora</label>
              {postponeTarget.therapist_id && postponeDate ? (
                <TimeSlotPicker
                  therapistId={postponeTarget.therapist_id}
                  date={postponeDate}
                  value={postponeTime}
                  onChange={setPostponeTime}
                  excludeAppointmentId={postponeTarget.id}
                  hours={postponeTarget.hours || 1}
                  compact
                />
              ) : (
                <div className="wizard-time-placeholder" style={{ padding: '0.5rem', textAlign: 'center', color: '#A89888', fontSize: '0.8rem' }}>
                  Selecciona una fecha primero
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setPostponeTarget(null)}>Cancelar</button>
              <button className="btn btn-primary" disabled={!postponeDate || !postponeTime} onClick={confirmPostpone}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <CancelAppointmentModal
        open={!!cancelTarget}
        appointment={cancelTarget}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelTarget(null)}
      />

      <AppointmentDetailModal
        open={!!detailTarget}
        appointment={detailTarget}
        allAppointments={appointments}
        onClose={() => setDetailTarget(null)}
        onPaymentPropagate={handlePaymentPropagate}
        onSelectSession={(session) => setDetailTarget(session)}
      />

      <PaymentScopeModal
        open={!!paymentScopeTarget}
        appointment={paymentScopeTarget}
        onClose={() => setPaymentScopeTarget(null)}
        onPaySession={handlePaySession}
        onPayAllSessions={handlePayAllSessions}
      />
    </div>
  );
}
