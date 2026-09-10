import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Package, CreditCard, Clock, MapPin, User, Phone, Scissors, AlertTriangle, Mail, Hash, Home,
  Check, CheckCircle2, CalendarClock, XCircle, Receipt,
} from 'lucide-react';
import useEscClose from '../hooks/useEscClose';
import { useApp } from '../context/AppContext';
import { appointmentsAPI } from '../services/api';
import { clearBusyCache } from '../utils/busyCache';
import TimeSlotPicker from './TimeSlotPicker';
import CancelAppointmentModal from './CancelAppointmentModal';
import PaymentScopeModal from './PaymentScopeModal';
import LoadingButton from './LoadingButton';

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

const badge = (cfg) => ({
  display: 'inline-block', fontSize: '0.7rem', fontWeight: 600,
  padding: '0.2rem 0.6rem', borderRadius: '12px',
  background: cfg.bg, color: cfg.color,
});

const row = { display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderBottom: '1px solid #F0EBE3' };
const label = { fontSize: '0.78rem', color: '#A89888', display: 'flex', alignItems: 'center', gap: '4px' };
const value = { fontSize: '0.82rem', color: '#3D2E24', fontWeight: 500, textAlign: 'right', maxWidth: '60%' };

const inputStyle = {
  width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px',
  border: '1px solid #E8E0D6', background: '#FFFFFF', color: '#3D2E24',
  fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none',
};

const ActionButton = ({ label, icon, onClick, danger, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.35rem',
      padding: '0.4rem 0.65rem', borderRadius: '8px',
      border: danger ? '1px solid #F5D5D0' : '1px solid #E8E0D6',
      background: danger ? '#FCEEED' : '#FDFBF7',
      color: danger ? '#B85C4C' : '#6B5B4E',
      fontSize: '0.75rem', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1, transition: 'all 0.15s',
    }}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default function AppointmentDetailModal({
  open,
  appointment,
  allAppointments,
  onClose,
  onSelectSession,
}) {
  const { appointments, updateAppointment, hasModulePermission } = useApp();
  const navigate = useNavigate();
  const [postponing, setPostponing] = useState(false);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeTime, setPostponeTime] = useState('');
  const [savingPostpone, setSavingPostpone] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  useEscClose(open, onClose);

  useEffect(() => {
    setPostponing(false);
    setPostponeDate('');
    setPostponeTime('');
  }, [open, appointment?.id]);

  if (!open || !appointment) return null;

  const apt = (allAppointments || []).find((a) => a.id === appointment.id) || appointment;
  const today = new Date().toISOString().split('T')[0];
  const canEdit = hasModulePermission('citas', 'can_edit');
  const person = apt.person || {};
  const clientName = [person.name, person.last_name].filter(Boolean).join(' ') || apt.clientName || 'N/A';
  const clientPhone = person.phone || apt.clientPhone || 'N/A';
  const clientDni = person.dni || '';
  const clientEmail = person.email || '';
  const clientAddress = person.address || '';
  const therapistName = apt.therapist?.name || 'N/A';
  const branchName = apt.branch?.name || 'N/A';
  const serviceName = apt.services?.length ? apt.services.map((s) => s.name).join(', ') : 'N/A';
  const st = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pendiente;
  const pCfg = PAYMENT_CONFIG[apt.payment_status || 'pendiente'];

  const isGroupSession = !!apt.group_id && apt.session_number && apt.total_sessions;
  const isPackageSession = !!apt.package_id && !isGroupSession;

  let groupSessions = [];
  if (isGroupSession) {
    groupSessions = (allAppointments || []).filter(
      (a) => a.group_id === apt.group_id && a.person_id === apt.person_id
    ).sort((a, b) => (a.session_number || 0) - (b.session_number || 0));
  }

  let packageInfo = null;
  let siblingApts = [];
  if (isPackageSession) {
    siblingApts = (allAppointments || []).filter(
      (a) => a.package_id === apt.package_id && a.person_id === apt.person_id && a.id !== apt.id
    );
    const allForPkg = [...siblingApts, apt];
    const completed = allForPkg.filter((a) => a.status === 'realizada').length;
    const cancelled = allForPkg.filter((a) => a.status === 'cancelada').length;
    const paid = allForPkg.filter((a) => a.payment_status === 'pagado').length;
    packageInfo = {
      name: apt.package?.name || 'Paquete',
      description: apt.package?.description,
      totalSessions: allForPkg.length,
      completed,
      cancelled,
      remaining: allForPkg.length - completed - cancelled,
      paidCount: paid,
      allPaid: paid === allForPkg.length,
    };
  }

  const handlePropagatePayment = async () => {
    const isGroup = !!apt.group_id;

    if (isGroup) {
      const siblings = (appointments || []).filter(
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
      const siblings = (appointments || []).filter(
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

  const handleConfirm = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await updateAppointment(apt.id, { status: 'confirmada' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkDone = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await updateAppointment(apt.id, { status: 'realizada' });
    } finally {
      setActionLoading(false);
    }
  };

  const openPostpone = () => {
    setPostponeDate(apt.date || '');
    setPostponeTime(apt.start_time || apt.time || '');
    setPostponing(true);
  };

  const confirmPostpone = async () => {
    if (!postponeDate || !postponeTime || savingPostpone) return;
    setSavingPostpone(true);
    try {
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
      clearBusyCache();
      setPostponing(false);
    } finally {
      setSavingPostpone(false);
    }
  };

  const handleCancelConfirm = async (reason) => {
    if (!apt.id) return;
    await updateAppointment(apt.id, {
      status: 'cancelada',
      cancellation_reason: reason,
    });
    setShowCancel(false);
  };

  const handlePaySession = async () => {
    await updateAppointment(apt.id, {
      payment_status: 'pagado',
      paid_amount: apt.total_price,
    });
    setShowPayment(false);
  };

  const handlePayAllSessions = async () => {
    await handlePropagatePayment();
    setShowPayment(false);
  };

  const handleEmitBoleta = () => {
    navigate(`/admin/boletas/${apt.id}`);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        style={{
          background: '#FFFFFF', borderRadius: '14px', width: '100%', maxWidth: '520px',
          maxHeight: '90vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #E8E0D6' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#3D2E24' }}>Detalle de Cita</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A89888', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '1rem 1.25rem' }}>
          {postponing && canEdit ? (
            <div>
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', color: '#3D2E24' }}>
                {apt.status === 'postergada' ? 'Reprogramar Cita' : 'Postergar Cita'}
              </h3>
              <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#A89888' }}>
                {clientName} — {serviceName}
              </p>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B5B4E', marginBottom: '0.3rem' }}>Nueva fecha</label>
                <input type="date" value={postponeDate} min={today} onChange={(e) => { setPostponeDate(e.target.value); setPostponeTime(''); }} style={inputStyle} />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B5B4E', marginBottom: '0.3rem' }}>Nueva hora</label>
                {apt.therapist_id && postponeDate ? (
                  <TimeSlotPicker
                    therapistId={apt.therapist_id}
                    date={postponeDate}
                    value={postponeTime}
                    onChange={setPostponeTime}
                    excludeAppointmentId={apt.id}
                    hours={apt.hours || 1}
                    compact
                  />
                ) : (
                  <div style={{ padding: '0.5rem', textAlign: 'center', color: '#A89888', fontSize: '0.8rem' }}>
                    Selecciona una fecha primero
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setPostponing(false)}>Volver</button>
                <LoadingButton className="btn btn-primary" loading={savingPostpone} loadingText="Guardando..." disabled={!postponeDate || !postponeTime} onClick={confirmPostpone}>Confirmar</LoadingButton>
              </div>
            </div>
          ) : (
            <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F5EDE5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B6A50', fontWeight: 700, fontSize: '1rem' }}>
              {clientName.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#3D2E24' }}>{clientName}</div>
              <div style={{ fontSize: '0.78rem', color: '#A89888' }}>{clientPhone}</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
              <span style={badge(st)}>{st.label}</span>
              <span style={badge(pCfg)}>{pCfg.label}</span>
            </div>
          </div>

          <div style={{ padding: '0.6rem 0.75rem', background: '#FDFBF7', borderRadius: '8px', border: '1px solid #F0EBE3', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#A89888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Datos del Cliente</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem 1rem', fontSize: '0.78rem' }}>
              <div style={{ color: '#A89888' }}>Nombre</div>
              <div style={{ color: '#3D2E24', fontWeight: 500 }}>{clientName}</div>
              {clientDni && (
                <>
                  <div style={{ color: '#A89888' }}><Hash size={11} style={{ verticalAlign: '-1px', marginRight: 2 }} />DNI</div>
                  <div style={{ color: '#3D2E24', fontWeight: 500 }}>{clientDni}</div>
                </>
              )}
              {clientEmail && (
                <>
                  <div style={{ color: '#A89888' }}><Mail size={11} style={{ verticalAlign: '-1px', marginRight: 2 }} />Correo</div>
                  <div style={{ color: '#3D2E24', fontWeight: 500 }}>{clientEmail}</div>
                </>
              )}
              {clientAddress && (
                <>
                  <div style={{ color: '#A89888' }}><MapPin size={11} style={{ verticalAlign: '-1px', marginRight: 2 }} />Dirección</div>
                  <div style={{ color: '#3D2E24', fontWeight: 500 }}>{clientAddress}</div>
                </>
              )}
              <div style={{ color: '#A89888' }}><Phone size={11} style={{ verticalAlign: '-1px', marginRight: 2 }} />Teléfono</div>
              <div style={{ color: '#3D2E24', fontWeight: 500 }}>{clientPhone}</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={row}>
              <span style={label}><Scissors size={13} />Servicio</span>
              <span style={value}>{serviceName}</span>
            </div>
            <div style={row}>
              <span style={label}><User size={13} />Terapeuta</span>
              <span style={value}>{therapistName}</span>
            </div>
            <div style={row}>
              <span style={label}><MapPin size={13} />Sede</span>
              <span style={value}>{branchName}</span>
            </div>
            <div style={row}>
              <span style={label}><Home size={13} />Cabina</span>
              <span style={value}>{apt.cabin?.name || 'N/A'}</span>
            </div>
            <div style={row}>
              <span style={label}>📅 Fecha</span>
              <span style={value}>{apt.date ? new Date(apt.date).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
            </div>
            <div style={row}>
              <span style={label}><Clock size={13} />Hora</span>
              <span style={value}>{apt.start_time} - {apt.end_time}</span>
            </div>
            <div style={row}>
              <span style={label}>Duración</span>
              <span style={value}>{apt.hours}h</span>
            </div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={label}>Total</span>
              <span style={{ ...value, fontWeight: 700 }}>S/ {apt.total_price || 0}</span>
            </div>
          </div>

          {isGroupSession && (
            <div style={{ marginTop: '0.75rem', padding: '0.85rem', borderRadius: '10px', background: '#FDFBF7', border: '1px solid #E8E0D6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <Package size={16} color="#8B6A50" />
                <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#3D2E24' }}>
                  Multi-sesión: Sesión {apt.session_number} de {apt.total_sessions}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.4rem' }}>
                {groupSessions.map((s) => {
                  const sSt = STATUS_CONFIG[s.status] || STATUS_CONFIG.pendiente;
                  const isCurrent = s.id === apt.id;
                  return (
                    <div key={s.id} onClick={() => {
                      if (!isCurrent && onSelectSession) onSelectSession(s);
                    }} style={{
                      padding: '0.4rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem',
                      border: isCurrent ? '2px solid #C9944A' : '1px solid #E8E0D6',
                      background: isCurrent ? '#FDF6E9' : '#fff',
                      textAlign: 'center',
                      cursor: isCurrent ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      opacity: isCurrent ? 1 : 0.85,
                    }}
                      onMouseEnter={(e) => { if (!isCurrent) { e.currentTarget.style.borderColor = '#C9944A'; e.currentTarget.style.opacity = '1'; } }}
                      onMouseLeave={(e) => { if (!isCurrent) { e.currentTarget.style.borderColor = '#E8E0D6'; e.currentTarget.style.opacity = '0.85'; } }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '2px' }}>Sesión {s.session_number}</div>
                      <div style={{ color: '#A89888', fontSize: '0.65rem' }}>{s.date}</div>
                      <span style={badge({ ...sSt, bg: sSt.bg, color: sSt.color })}>{sSt.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isPackageSession && packageInfo && (
            <div style={{ marginTop: '0.75rem', padding: '0.85rem', borderRadius: '10px', background: '#FDFBF7', border: '1px solid #E8E0D6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <Package size={16} color="#8B6A50" />
                <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#3D2E24' }}>Paquete: {packageInfo.name}</span>
              </div>
              {packageInfo.description && (
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#A89888' }}>{packageInfo.description}</p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem 1rem', fontSize: '0.78rem' }}>
                <div style={{ color: '#A89888' }}>Total sesiones</div>
                <div style={{ color: '#3D2E24', fontWeight: 600, textAlign: 'right' }}>{packageInfo.totalSessions}</div>
                <div style={{ color: '#A89888' }}>Completadas</div>
                <div style={{ color: '#6A4A3A', fontWeight: 600, textAlign: 'right' }}>{packageInfo.completed}</div>
                <div style={{ color: '#A89888' }}>Canceladas</div>
                <div style={{ color: '#B85C4C', fontWeight: 600, textAlign: 'right' }}>{packageInfo.cancelled}</div>
                <div style={{ color: '#A89888' }}>Pendientes</div>
                <div style={{ color: '#8B6520', fontWeight: 600, textAlign: 'right' }}>{packageInfo.remaining}</div>
              </div>

              {siblingApts.length > 0 && (
                <div style={{ marginTop: '0.6rem', borderTop: '1px solid #E8E0D6', paddingTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#A89888', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Otras sesiones</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {siblingApts.map((sib) => {
                      const sibSt = STATUS_CONFIG[sib.status] || STATUS_CONFIG.pendiente;
                      const sibP = PAYMENT_CONFIG[sib.payment_status || 'pendiente'];
                      return (
                        <div key={sib.id} onClick={() => onSelectSession && onSelectSession(sib)} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.35rem 0.5rem', borderRadius: '6px', fontSize: '0.72rem',
                          border: '1px solid #E8E0D6', background: '#fff',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C9944A'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E8E0D6'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontWeight: 600 }}>{sib.services?.[0]?.name || 'Sesión'}</span>
                            <span style={{ color: '#A89888' }}>{sib.date}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <span style={badge(sibSt)}>{sibSt.label}</span>
                            <span style={badge(sibP)}>{sibP.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {packageInfo.allPaid ? (
                <div style={{ marginTop: '0.6rem', padding: '0.4rem 0.6rem', borderRadius: '6px', background: '#E8F5E9', color: '#2D7A3A', fontSize: '0.75rem', fontWeight: 600, textAlign: 'center' }}>
                  Paquete pagado completamente
                </div>
              ) : canEdit ? (
                <div style={{ marginTop: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#A89888' }}>
                      <CreditCard size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                      Pagadas: {packageInfo.paidCount}/{packageInfo.totalSessions}
                    </span>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', fontSize: '0.78rem', padding: '0.45rem' }}
                    onClick={handlePropagatePayment}
                  >
                    Marcar todo como pagado
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {apt.status === 'cancelada' && apt.cancellation_reason && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: '10px', background: '#FCEEED', border: '1px solid #F5D5D0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                <AlertTriangle size={14} color="#B85C4C" />
                <span style={{ fontWeight: 600, fontSize: '0.78rem', color: '#B85C4C' }}>Observación de cancelación</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#6B5B4E', lineHeight: 1.4 }}>
                {apt.cancellation_reason}
              </p>
            </div>
          )}

          {canEdit && (
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #E8E0D6' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#A89888', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acciones</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {apt.status === 'pendiente' && (
                  <ActionButton label="Confirmar" icon={<Check size={14} />} onClick={handleConfirm} disabled={actionLoading} />
                )}
                {(apt.status === 'pendiente' || apt.status === 'confirmada') && (
                  <ActionButton label="Marcar como realizada" icon={<CheckCircle2 size={14} />} onClick={handleMarkDone} disabled={actionLoading} />
                )}
                {(apt.status === 'pendiente' || apt.status === 'confirmada') && (
                  <ActionButton label="Postergar" icon={<CalendarClock size={14} />} onClick={openPostpone} />
                )}
                {apt.status === 'postergada' && (
                  <ActionButton label="Reprogramar" icon={<CalendarClock size={14} />} onClick={openPostpone} />
                )}
                {(apt.status === 'pendiente' || apt.status === 'confirmada' || apt.status === 'postergada') && (
                  <ActionButton label="Cancelar" icon={<XCircle size={14} />} danger onClick={() => setShowCancel(true)} />
                )}
                {apt.payment_status !== 'pagado' && (
                  <ActionButton label="Registrar pago" icon={<CreditCard size={14} />} onClick={() => setShowPayment(true)} />
                )}
                <ActionButton label="Emitir boleta" icon={<Receipt size={14} />} onClick={handleEmitBoleta} />
              </div>
            </div>
          )}
            </>
          )}
        </div>

        <CancelAppointmentModal
          open={showCancel}
          appointment={apt}
          onConfirm={handleCancelConfirm}
          onCancel={() => setShowCancel(false)}
        />

        <PaymentScopeModal
          open={showPayment}
          appointment={apt}
          onClose={() => setShowPayment(false)}
          onPaySession={handlePaySession}
          onPayAllSessions={handlePayAllSessions}
        />

        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid #E8E0D6', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
