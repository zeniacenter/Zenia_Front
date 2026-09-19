import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Package, CreditCard, Clock, MapPin, User, Phone, Scissors, AlertTriangle, Mail, Hash, Home,
  Check, CheckCircle2, CalendarClock, XCircle, Receipt, Pencil, CalendarPlus,
} from 'lucide-react';
import useEscClose from '../hooks/useEscClose';
import { useApp } from '../context/AppContext';
import { appointmentsAPI, personAPI } from '../services/api';
import { clearBusyCache } from '../utils/busyCache';
import { todayStr, formatHours } from '../utils/hours';
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

const formatDateForInput = (val) => {
  if (!val) return '';
  if (typeof val === 'string') {
    return val.split('T')[0].slice(0, 10);
  }
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10);
  }
  return '';
};

const formatTimeForInput = (val) => {
  if (!val) return '';
  return String(val).slice(0, 5);
};

export default function AppointmentDetailModal({
  open,
  appointment,
  allAppointments,
  onClose,
  onUpdated,
  onSelectSession,
  initialEditing = false,
}) {
  const { appointments, updateAppointment, hasModulePermission, therapists, cabins, branches, packages, services } = useApp();
  const navigate = useNavigate();
  const [freshData, setFreshData] = useState(null);
  const [postponing, setPostponing] = useState(false);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeTime, setPostponeTime] = useState('');
  const [savingPostpone, setSavingPostpone] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({});

  // Estados para agendar siguiente sesión de paquete / multi-sesión
  const [schedulingNext, setSchedulingNext] = useState(false);
  const [nextTargetNumber, setNextTargetNumber] = useState(1);
  const [nextDate, setNextDate] = useState('');
  const [nextTime, setNextTime] = useState('');
  const [nextTherapistId, setNextTherapistId] = useState('');
  const [nextCabinId, setNextCabinId] = useState('');
  const [nextServiceId, setNextServiceId] = useState('');
  const [nextHours, setNextHours] = useState(1);
  const [nextNotes, setNextNotes] = useState('');
  const [savingNext, setSavingNext] = useState(false);
  const [nextError, setNextError] = useState('');

  useEscClose(open, onClose);

  useEffect(() => {
    setPostponing(false);
    setPostponeDate('');
    setPostponeTime('');
    setEditing(!!initialEditing);
    setEditError('');
    setSchedulingNext(false);
    setNextError('');
    setFreshData(null);
  }, [open, appointment?.id, initialEditing]);

  useEffect(() => {
    const current = (allAppointments || []).find((a) => a.id === appointment?.id) || appointment;
    const person = current?.person || {};
    if (current) {
      setEditForm({
        client_name: person.name || current.clientName || current.client_name || '',
        client_last_name: person.last_name || current.client_last_name || '',
        client_dni: person.dni || current.client_dni || '',
        client_phone: person.phone || current.clientPhone || current.client_phone || '',
        client_email: person.email || current.clientEmail || current.client_email || current.email || '',
        client_address: person.address || current.client_address || '',
        date: formatDateForInput(current.date),
        start_time: formatTimeForInput(current.start_time || current.time),
        hours: current.hours || 1,
        therapist_id: current.therapist_id || '',
        cabin_id: current.cabin_id || '',
        branch_id: current.branch_id || '',
        status: current.status || 'pendiente',
        payment_status: current.payment_status || 'pendiente',
        paid_amount: current.paid_amount ?? 0,
        total_price: current.total_price ?? 0,
        notes: current.notes || '',
      });
    }
  }, [appointment, allAppointments]);

  // Si faltan datos o para asegurar sincronización con la BD,
  // consulta los datos frescos de la cita y el cliente.
  useEffect(() => {
    if (!open || !appointment?.id) return;
    let active = true;

    appointmentsAPI
      .get(appointment.id)
      .then((res) => {
        if (!active || !res.data) return;
        const freshApt = res.data;
        setFreshData(freshApt);
        const freshPerson = freshApt.person || {};
        const freshEmail = freshPerson.email || freshApt.clientEmail || freshApt.client_email || freshApt.email || '';
        const freshDate = formatDateForInput(freshApt.date);

        setEditForm((prev) => ({
          ...prev,
          client_name: prev.client_name || freshPerson.name || '',
          client_last_name: prev.client_last_name || freshPerson.last_name || '',
          client_dni: prev.client_dni || freshPerson.dni || '',
          client_phone: prev.client_phone || freshPerson.phone || '',
          client_email: prev.client_email || freshEmail,
          client_address: prev.client_address || freshPerson.address || '',
          date: prev.date || freshDate,
          start_time: prev.start_time || formatTimeForInput(freshApt.start_time),
        }));

        const dni = (freshPerson.dni || freshApt.client_dni || '').trim();
        if (!freshEmail && dni && dni.length >= 8) {
          personAPI
            .searchByDni(dni)
            .then((pRes) => {
              if (active && pRes.data?.email) {
                setEditForm((p) => ({
                  ...p,
                  client_email: p.client_email || pRes.data.email,
                  client_name: p.client_name || pRes.data.name || '',
                  client_last_name: p.client_last_name || pRes.data.last_name || '',
                  client_phone: p.client_phone || pRes.data.phone || '',
                  client_address: p.client_address || pRes.data.address || '',
                }));
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [open, appointment?.id]);

  // Al dar clic en editar, si el correo aún estuviera vacío pero hay un DNI,
  // busca y jala inmediatamente el correo registrado del cliente.
  useEffect(() => {
    if (!editing) return;
    const dni = (editForm.client_dni || '').trim();
    if (!editForm.client_email && dni && dni.length >= 8) {
      personAPI
        .searchByDni(dni)
        .then((res) => {
          if (res.data?.email) {
            setEditForm((prev) => ({
              ...prev,
              client_email: prev.client_email || res.data.email,
              client_name: prev.client_name || res.data.name || '',
              client_last_name: prev.client_last_name || res.data.last_name || '',
              client_phone: prev.client_phone || res.data.phone || '',
              client_address: prev.client_address || res.data.address || '',
            }));
          }
        })
        .catch(() => {});
    }
  }, [editing]);

  if (!open || !appointment) return null;

  const apt = freshData || (allAppointments || []).find((a) => a.id === appointment.id) || appointment;
  const today = todayStr();
  const canEdit = hasModulePermission('citas', 'can_edit');
  const person = apt.person || {};
  const clientName = [person.name, person.last_name].filter(Boolean).join(' ') || apt.clientName || 'N/A';
  const clientPhone = person.phone || apt.clientPhone || 'N/A';
  const clientDni = person.dni || '';
  const clientEmail = person.email || apt.clientEmail || apt.client_email || apt.email || '';
  const clientAddress = person.address || '';
  const therapistName = apt.therapist?.name || 'N/A';
  const branchName = apt.branch?.name || 'N/A';
  const serviceName = apt.services?.length ? apt.services.map((s) => s.name).join(', ') : 'N/A';
  const st = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pendiente;
  const pCfg = PAYMENT_CONFIG[apt.payment_status || 'pendiente'];

  const isGroupSession = !!apt.group_id && !!apt.total_sessions;
  const isPackageSession = !!apt.package_id && !isGroupSession;

  let groupSessions = [];
  if (isGroupSession) {
    const rawSessions = freshData?.group_sessions || (allAppointments || []).filter(
      (a) => a.group_id === apt.group_id && a.person_id === apt.person_id
    );
    const map = new Map();
    (rawSessions || []).forEach((s) => { if (s && s.id) map.set(s.id, s); });
    if (apt?.id) map.set(apt.id, apt);
    groupSessions = Array.from(map.values()).sort((a, b) => (a.session_number || 0) - (b.session_number || 0));
  }

  const totalSessions = isGroupSession ? Number(apt.total_sessions) : 1;
  const activeSessions = groupSessions.filter((s) => s.status !== 'cancelada');
  const scheduledCount = activeSessions.length;
  const pendingCount = Math.max(0, totalSessions - scheduledCount);
  const canScheduleNext = isGroupSession && pendingCount > 0 && hasModulePermission('citas', 'can_create');

  const usedNumbers = activeSessions.map((s) => Number(s.session_number));
  let nextSessionNumber = 1;
  while (usedNumbers.includes(nextSessionNumber)) {
    nextSessionNumber++;
  }
  if (nextSessionNumber > totalSessions) {
    nextSessionNumber = scheduledCount + 1;
  }

  const openScheduleNext = (targetNumber = nextSessionNumber) => {
    setNextTargetNumber(targetNumber);
    setNextDate(todayStr());
    setNextTime('');
    setNextTherapistId(apt.therapist_id ? String(apt.therapist_id) : (therapists[0]?.id ? String(therapists[0].id) : ''));
    setNextCabinId(apt.cabin_id ? String(apt.cabin_id) : '');

    let defSvcId = apt.services?.[0]?.id ? String(apt.services[0].id) : '';
    let defHours = apt.hours || 1;
    if (apt.package_id) {
      const pkg = (packages || []).find((p) => p.id === apt.package_id);
      if (pkg?.sessions && pkg.sessions.length >= targetNumber) {
        defSvcId = pkg.sessions[targetNumber - 1]?.id ? String(pkg.sessions[targetNumber - 1].id) : defSvcId;
        defHours = pkg.sessions[targetNumber - 1]?.hours || defHours;
      }
    }
    setNextServiceId(defSvcId);
    setNextHours(defHours);
    setNextNotes('');
    setNextError('');
    setSchedulingNext(true);
  };

  const handleScheduleNextSubmit = async (e) => {
    e.preventDefault();
    if (savingNext || !nextDate || !nextTime || !nextTherapistId) return;
    setSavingNext(true);
    setNextError('');
    try {
      await appointmentsAPI.scheduleNextSession(apt.id, {
        date: nextDate,
        start_time: nextTime,
        therapist_id: Number(nextTherapistId),
        cabin_id: nextCabinId ? Number(nextCabinId) : null,
        branch_id: apt.branch_id || (branches[0]?.id || null),
        service_id: nextServiceId ? Number(nextServiceId) : null,
        hours: Number(nextHours) || 1,
        notes: nextNotes,
      });
      clearBusyCache();
      onUpdated?.();
      setSchedulingNext(false);
      const res = await appointmentsAPI.get(apt.id);
      if (res.data) setFreshData(res.data);
    } catch (err) {
      setNextError(err.response?.data?.message || err.message || 'Error al agendar la sesión.');
    } finally {
      setSavingNext(false);
    }
  };

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
    setPostponeDate(formatDateForInput(apt.date));
    setPostponeTime(formatTimeForInput(apt.start_time || apt.time));
    setPostponing(true);
  };

  const confirmPostpone = async () => {
    if (!postponeDate || !postponeTime || savingPostpone) return;
    setSavingPostpone(true);
    try {
      const hours = apt.hours || 1;
      const startMins = parseInt(postponeTime.split(':')[0]) * 60 + parseInt(postponeTime.split(':')[1]);
      const endMins = startMins + Math.round(hours * 60);
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

  const updateEditField = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDniBlur = async () => {
    const dni = (editForm.client_dni || '').trim();
    if (!dni || dni.length < 8) return;
    try {
      const res = await personAPI.searchByDni(dni);
      if (res.data) {
        const p = res.data;
        setEditForm((prev) => ({
          ...prev,
          client_name: prev.client_name || p.name || '',
          client_last_name: prev.client_last_name || p.last_name || '',
          client_phone: prev.client_phone || p.phone || '',
          client_email: p.email || prev.client_email || '',
          client_address: prev.client_address || p.address || '',
        }));
      }
    } catch {
      // Si no existe, ignorar
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (savingEdit) return;
    setSavingEdit(true);
    setEditError('');
    try {
      const updatedAppointment = await updateAppointment(apt.id, {
        ...editForm,
        therapist_id: editForm.therapist_id ? Number(editForm.therapist_id) : null,
        cabin_id: editForm.cabin_id ? Number(editForm.cabin_id) : null,
        branch_id: editForm.branch_id ? Number(editForm.branch_id) : null,
        hours: Number(editForm.hours),
        paid_amount: Number(editForm.paid_amount || 0),
        total_price: Number(editForm.total_price || 0),
      });
      clearBusyCache();
      onUpdated?.(updatedAppointment);
      setEditing(false);
    } catch (error) {
      setEditError(error.response?.data?.message || 'No se pudo actualizar la cita.');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
    >
      <div
        style={{
          background: '#FFFFFF', borderRadius: '14px', width: '100%', maxWidth: '520px',
          maxHeight: '90vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          position: 'relative',
        }}
      >
        {schedulingNext && (
          <div style={{
            position: 'absolute', inset: 0, background: '#FFFFFF', zIndex: 50,
            padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E8E0D6', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#3D2E24' }}>
                  Agendar Sesión {nextTargetNumber} de {totalSessions}
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#A89888' }}>
                  {clientName} — {apt.package?.name || serviceName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSchedulingNext(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A89888', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: '#FDF6E9', border: '1px solid #E8E0D6', marginBottom: '1rem', color: '#8B6520', fontSize: '0.8rem' }}>
              💡 Esta sesión forma parte del paquete o multi-sesión ya contratado. Costo adicional: <strong>S/ 0.00</strong>.
            </div>

            <form onSubmit={handleScheduleNextSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B5B4E', marginBottom: '0.3rem' }}>
                  Fecha de la sesión *
                </label>
                <input
                  type="date"
                  min={today}
                  value={nextDate}
                  onChange={(e) => { setNextDate(e.target.value); setNextTime(''); }}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B5B4E', marginBottom: '0.3rem' }}>
                  Terapeuta *
                </label>
                <select
                  value={nextTherapistId}
                  onChange={(e) => { setNextTherapistId(e.target.value); setNextTime(''); }}
                  style={inputStyle}
                  required
                >
                  <option value="">Selecciona terapeuta</option>
                  {therapists.filter((t) => (t.is_available ?? t.available ?? true)).map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B5B4E', marginBottom: '0.3rem' }}>
                  Hora de la sesión *
                </label>
                {nextTherapistId && nextDate ? (
                  <TimeSlotPicker
                    therapistId={Number(nextTherapistId)}
                    date={nextDate}
                    value={nextTime}
                    onChange={setNextTime}
                    hours={Number(nextHours) || 1}
                    compact
                  />
                ) : (
                  <div style={{ padding: '0.6rem', textAlign: 'center', color: '#A89888', fontSize: '0.8rem', background: '#FDFCFA', border: '1px dashed #E8E0D6', borderRadius: '8px' }}>
                    Selecciona fecha y terapeuta para ver los horarios disponibles
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B5B4E', marginBottom: '0.3rem' }}>
                    Cabina (opcional)
                  </label>
                  <select
                    value={nextCabinId}
                    onChange={(e) => setNextCabinId(e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">Sin asignar / Automática</option>
                    {cabins.filter((c) => (c.is_available ?? c.available ?? true)).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B5B4E', marginBottom: '0.3rem' }}>
                    Servicio
                  </label>
                  <select
                    value={nextServiceId}
                    onChange={(e) => setNextServiceId(e.target.value)}
                    style={inputStyle}
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B5B4E', marginBottom: '0.3rem' }}>
                  Notas u observaciones
                </label>
                <textarea
                  value={nextNotes}
                  onChange={(e) => setNextNotes(e.target.value)}
                  style={{ ...inputStyle, minHeight: '55px', resize: 'vertical' }}
                  placeholder="Instrucciones o preferencias para esta sesión..."
                />
              </div>

              {nextError && (
                <div style={{ padding: '0.6rem', borderRadius: '8px', background: '#FCEEED', border: '1px solid #F5D5D0', color: '#B85C4C', fontSize: '0.8rem' }}>
                  {nextError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setSchedulingNext(false)}
                  disabled={savingNext}
                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingNext || !nextDate || !nextTime || !nextTherapistId}
                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', opacity: savingNext || !nextDate || !nextTime || !nextTherapistId ? 0.6 : 1 }}
                >
                  {savingNext ? 'Agendando...' : `Confirmar sesión ${nextTargetNumber}`}
                </button>
              </div>
            </form>
          </div>
        )}

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
          ) : editing ? (
            <form onSubmit={handleEditSubmit}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#3D2E24' }}>Editar cita</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                {[
                  ['client_name', 'Nombre', 'text'], ['client_last_name', 'Apellidos', 'text'],
                  ['client_dni', 'DNI', 'text'], ['client_phone', 'Teléfono', 'tel'],
                  ['client_email', 'Correo', 'email'], ['client_address', 'Dirección', 'text'],
                ].map(([field, fieldLabel, type]) => (
                  <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: '#6B5B4E' }}>
                    {fieldLabel}
                    <input
                      type={type}
                      value={editForm[field] || ''}
                      onChange={(e) => updateEditField(field, e.target.value)}
                      onBlur={field === 'client_dni' ? handleDniBlur : undefined}
                      style={inputStyle}
                      required={field === 'client_name' || field === 'client_phone'}
                    />
                  </label>
                ))}
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: '#6B5B4E' }}>
                  Fecha
                  <input type="date" value={editForm.date || ''} onChange={(e) => updateEditField('date', e.target.value)} style={inputStyle} required />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: '#6B5B4E' }}>
                  Hora de inicio
                  <input type="time" value={editForm.start_time || ''} onChange={(e) => updateEditField('start_time', e.target.value)} style={inputStyle} required />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: '#6B5B4E' }}>
                  Duración (horas)
                  <input type="number" min="0.25" max="8" step="0.01" value={editForm.hours ?? ''} onChange={(e) => updateEditField('hours', e.target.value)} style={inputStyle} required />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: '#6B5B4E' }}>
                  Estado
                  <select value={editForm.status || ''} onChange={(e) => updateEditField('status', e.target.value)} style={inputStyle}>
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => <option key={status} value={status}>{config.label}</option>)}
                  </select>
                </label>
                {[
                  ['therapist_id', 'Terapeuta', therapists], ['cabin_id', 'Cabina', cabins], ['branch_id', 'Sede', branches],
                ].map(([field, fieldLabel, options]) => (
                  <label key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: '#6B5B4E' }}>
                    {fieldLabel}
                    <select value={editForm[field] || ''} onChange={(e) => updateEditField(field, e.target.value)} style={inputStyle}>
                      <option value="">Sin asignar</option>
                      {(options || []).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
                    </select>
                  </label>
                ))}
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: '#6B5B4E' }}>
                  Estado de pago
                  <select value={editForm.payment_status || ''} onChange={(e) => updateEditField('payment_status', e.target.value)} style={inputStyle}>
                    <option value="pendiente">Pendiente</option><option value="parcial">Parcial</option><option value="pagado">Pagado</option>
                  </select>
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: '#6B5B4E' }}>
                  Total
                  <input type="number" min="0" step="0.01" value={editForm.total_price ?? ''} onChange={(e) => updateEditField('total_price', e.target.value)} style={inputStyle} />
                </label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.65rem', fontSize: '0.75rem', color: '#6B5B4E' }}>
                Notas
                <textarea rows={3} value={editForm.notes || ''} onChange={(e) => updateEditField('notes', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
              </label>
              {editError && <div style={{ marginTop: '0.75rem', color: '#B85C4C', fontSize: '0.8rem' }}>{editError}</div>}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)} disabled={savingEdit}>Volver</button>
                <LoadingButton type="submit" className="btn btn-primary" loading={savingEdit} loadingText="Guardando...">Guardar cambios</LoadingButton>
              </div>
            </form>
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
              <span style={value}>{formatHours(apt.hours)} h</span>
            </div>
            <div style={{ ...row, borderBottom: 'none' }}>
              <span style={label}>Total</span>
              <span style={{ ...value, fontWeight: 700 }}>S/ {apt.total_price || 0}</span>
            </div>
          </div>

          {isGroupSession && (
            <div style={{ marginTop: '0.75rem', padding: '0.85rem', borderRadius: '10px', background: '#FDFBF7', border: '1px solid #E8E0D6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.3rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={16} color="#8B6A50" />
                  <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#3D2E24' }}>
                    {apt.package?.name ? `Paquete: ${apt.package.name}` : 'Multi-sesión'} ({scheduledCount} de {totalSessions} agendadas)
                  </span>
                </div>
                {pendingCount > 0 && (
                  <span style={{ fontSize: '0.7rem', color: '#8B6520', fontWeight: 600, background: '#FDF6E9', border: '1px solid #E8E0D6', padding: '2px 8px', borderRadius: '12px' }}>
                    {pendingCount} {pendingCount === 1 ? 'pendiente por agendar' : 'pendientes por agendar'}
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.4rem' }}>
                {Array.from({ length: totalSessions }, (_, idx) => {
                  const sNum = idx + 1;
                  const s = groupSessions.find((item) => Number(item.session_number) === sNum);
                  if (s) {
                    const sSt = STATUS_CONFIG[s.status] || STATUS_CONFIG.pendiente;
                    const isCurrent = s.id === apt.id;
                    return (
                      <div
                        key={s.id}
                        onClick={() => {
                          if (!isCurrent && onSelectSession) onSelectSession(s);
                        }}
                        style={{
                          padding: '0.4rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem',
                          border: isCurrent ? '2px solid #C9944A' : '1px solid #E8E0D6',
                          background: isCurrent ? '#FDF6E9' : '#fff',
                          textAlign: 'center',
                          cursor: isCurrent ? 'default' : 'pointer',
                          transition: 'all 0.15s',
                          opacity: isCurrent ? 1 : 0.85,
                        }}
                        title={isCurrent ? 'Sesión actual' : 'Ver detalle de esta sesión'}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '2px' }}>Sesión {s.session_number}</div>
                        <div style={{ color: '#A89888', fontSize: '0.65rem' }}>{s.date} {s.start_time?.slice(0, 5)}</div>
                        <span style={badge({ ...sSt, bg: sSt.bg, color: sSt.color })}>{sSt.label}</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`pending-${sNum}`}
                      onClick={() => {
                        if (canScheduleNext) openScheduleNext(sNum);
                      }}
                      style={{
                        padding: '0.4rem 0.5rem', borderRadius: '6px', fontSize: '0.7rem',
                        border: '1.5px dashed #D6C8B8', background: '#FAFAF8',
                        textAlign: 'center',
                        cursor: canScheduleNext ? 'pointer' : 'default',
                        transition: 'all 0.15s',
                        color: '#8B6520',
                      }}
                      title={canScheduleNext ? `Click para agendar sesión ${sNum}` : 'Por agendar'}
                    >
                      <div style={{ fontWeight: 600, marginBottom: '2px', color: '#6B5B4E' }}>Sesión {sNum}</div>
                      <div style={{ color: '#A89888', fontSize: '0.65rem' }}>Por programar</div>
                      {canScheduleNext ? (
                        <span style={{ display: 'inline-block', fontSize: '0.65rem', fontWeight: 600, color: '#C9944A', marginTop: '2px' }}>
                          + Agendar
                        </span>
                      ) : (
                        <span style={{ display: 'inline-block', fontSize: '0.65rem', color: '#A89888' }}>
                          Pendiente
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {canScheduleNext && (
                <button
                  type="button"
                  onClick={() => openScheduleNext(nextSessionNumber)}
                  style={{
                    marginTop: '0.65rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '0.4rem', padding: '0.5rem', borderRadius: '8px', border: '1.5px dashed #C9944A',
                    background: '#FDF6E9', color: '#8B6520', fontWeight: 600, fontSize: '0.78rem',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <CalendarPlus size={15} />
                  <span>+ Agendar siguiente sesión ({nextSessionNumber} de {totalSessions})</span>
                </button>
              )}
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
                <ActionButton label="Editar cita" icon={<Pencil size={14} />} onClick={() => setEditing(true)} disabled={actionLoading} />
                {canScheduleNext && (
                  <ActionButton
                    label={`Agendar sesión ${nextSessionNumber}`}
                    icon={<CalendarPlus size={14} />}
                    onClick={() => openScheduleNext(nextSessionNumber)}
                    disabled={actionLoading}
                  />
                )}
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
                {apt.payment_status === 'pagado' && (
                  <ActionButton label="Emitir comprobante" icon={<Receipt size={14} />} onClick={handleEmitBoleta} />
                )}
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
