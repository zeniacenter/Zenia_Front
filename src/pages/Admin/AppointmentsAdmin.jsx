import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import ConfirmModal from '../../components/ConfirmModal';
import { Inbox } from 'lucide-react';

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: '#8B6520', bg: '#FDF6E9' },
  confirmada: { label: 'Confirmada', color: '#8B6A50', bg: '#F5EDE5' },
  cancelada: { label: 'Cancelada', color: '#B85C4C', bg: '#FCEEED' },
  realizada: { label: 'Realizada', color: '#6A4A3A', bg: '#F0EBE3' },
  postergada: { label: 'Postergada', color: '#4A7A9A', bg: '#EBF3F8' },
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
  const { appointments, therapists, services, cabins, updateAppointment } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('todas');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [postponeTarget, setPostponeTarget] = useState(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [postponeTime, setPostponeTime] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

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
    return [...list].sort((a, b) => {
      const d = (a.date || '').localeCompare(b.date || '');
      if (d !== 0) return d;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });
  }, [appointments, filter]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paged = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const getName = (apt) => apt.person?.name || apt.clientName || 'N/A';
  const getPhone = (apt) => apt.person?.phone || apt.clientPhone || 'N/A';
  const getTherapist = (apt) => apt.therapist?.name || 'N/A';
  const getTime = (apt) => apt.start_time || apt.time || 'N/A';
  const getEndTime = (apt) => apt.end_time || '';
  const getTotal = (apt) => apt.total_price || apt.total || 0;
  const getServices = (apt) => {
    if (apt.services?.length) return apt.services.map((s) => s.name).join(', ');
    const ids = apt.service_ids || apt.serviceIds;
    if (ids?.length) return ids.map((id) => services.find((s) => s.id === id)?.name).filter(Boolean).join(', ');
    return 'N/A';
  };

  const isActive = (s) => ['pendiente', 'confirmada'].includes(s);

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

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="admin-header">
        <h2>Gestión de Citas</h2>
        <button className="btn btn-primary" onClick={() => navigate('/admin/agendar')}>
          + Agendar Cita
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: '20px',
              border: filter === f.key ? '1.5px solid #C9944A' : '1px solid #E8E0D6',
              background: filter === f.key ? '#FDF6E9' : '#FFFFFF',
              color: filter === f.key ? '#8B6520' : '#A89888',
              fontSize: '0.8rem',
              fontWeight: filter === f.key ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E8E0D6',
        borderRadius: '14px',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E8E0D6' }}>
                {['Cliente', 'Teléfono', 'Terapeuta', 'Servicio', 'Fecha', 'Hora', 'Dur.', 'Total', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} style={{
                    padding: '0.75rem 1rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#A89888',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((apt) => {
                const st = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pendiente;
                return (
                  <tr
                    key={apt.id}
                    style={{ borderBottom: '1px solid #F0EBE3', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#FDFCFA'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.7rem 1rem', fontWeight: 600, fontSize: '0.85rem', color: '#3D2E24' }}>
                      {getName(apt)}
                    </td>
                    <td style={{ padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#6B5B4E' }}>
                      {getPhone(apt)}
                    </td>
                    <td style={{ padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#3D2E24' }}>
                      {getTherapist(apt)}
                    </td>
                    <td style={{ padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#3D2E24', maxWidth: '180px' }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getServices(apt)}
                      </span>
                    </td>
                    <td style={{ padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#3D2E24', whiteSpace: 'nowrap' }}>
                      {apt.date}
                    </td>
                    <td style={{ padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#3D2E24', whiteSpace: 'nowrap' }}>
                      {getTime(apt)} - {getEndTime(apt)}
                    </td>
                    <td style={{ padding: '0.7rem 1rem', fontSize: '0.8rem', color: '#A89888', textAlign: 'center' }}>
                      {apt.hours}h
                    </td>
                    <td style={{ padding: '0.7rem 1rem', fontWeight: 600, fontSize: '0.85rem', color: '#3D2E24', whiteSpace: 'nowrap' }}>
                      S/ {getTotal(apt)}
                    </td>
                    <td style={{ padding: '0.7rem 1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.7rem', fontWeight: 600,
                        padding: '0.2rem 0.6rem', borderRadius: '12px',
                        background: st.bg, color: st.color,
                        whiteSpace: 'nowrap',
                      }}>
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.7rem 1rem' }}>
                      {isActive(apt.status) && (
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {apt.status === 'pendiente' && (
                            <button
                              onClick={() => updateAppointment(apt.id, { status: 'confirmada' })}
                              style={{
                                fontSize: '0.7rem', padding: '3px 8px', borderRadius: '6px',
                                border: 'none', background: '#8B6A50', color: '#fff',
                                cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
                              }}
                            >Confirmar</button>
                          )}
                          <button
                            onClick={() => updateAppointment(apt.id, { status: 'realizada' })}
                            style={{
                              fontSize: '0.7rem', padding: '3px 8px', borderRadius: '6px',
                              border: '1px solid #E8E0D6', background: '#FFFFFF',
                              color: '#3D2E24', cursor: 'pointer', whiteSpace: 'nowrap',
                            }}
                          >Realizado</button>
                          <button
                            onClick={() => openPostpone(apt)}
                            style={{
                              fontSize: '0.7rem', padding: '3px 8px', borderRadius: '6px',
                              border: '1px solid #E8E0D6', background: '#FFFFFF',
                              color: '#3D2E24', cursor: 'pointer', whiteSpace: 'nowrap',
                            }}
                          >Postergar</button>
                          <button
                            onClick={() => updateAppointment(apt.id, { status: 'cancelada' })}
                            style={{
                              fontSize: '0.7rem', padding: '3px 8px', borderRadius: '6px',
                              border: 'none', background: '#B85C4C', color: '#fff',
                              cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
                            }}
                          >Cancelar</button>
                        </div>
                      )}
                      {apt.status === 'postergada' && (
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => openPostpone(apt)}
                            style={{
                              fontSize: '0.7rem', padding: '3px 8px', borderRadius: '6px',
                              border: '1px solid #E8E0D6', background: '#FFFFFF',
                              color: '#3D2E24', cursor: 'pointer', whiteSpace: 'nowrap',
                            }}
                          >Editar</button>
                          <button
                            onClick={() => updateAppointment(apt.id, { status: 'cancelada' })}
                            style={{
                              fontSize: '0.7rem', padding: '3px 8px', borderRadius: '6px',
                              border: 'none', background: '#B85C4C', color: '#fff',
                              cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
                            }}
                          >Cancelar</button>
                        </div>
                      )}
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
              <span>Filas por página:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0); }}
                style={{
                  padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #E8E0D6',
                  background: '#FFFFFF', color: '#3D2E24', fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                {[5, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#6B5B4E' }}>
              <span>{page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, filtered.length)} de {filtered.length}</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  style={{
                    padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #E8E0D6',
                    background: page === 0 ? '#F5F0E8' : '#FFFFFF', color: page === 0 ? '#C8C0BA' : '#3D2E24',
                    cursor: page === 0 ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 500,
                  }}
                >← Ant</button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid #E8E0D6',
                    background: page >= totalPages - 1 ? '#F5F0E8' : '#FFFFFF',
                    color: page >= totalPages - 1 ? '#C8C0BA' : '#3D2E24',
                    cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 500,
                  }}
                >Sig →</button>
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#A89888' }}>
            <div style={{ marginBottom: '0.5rem', color: '#A89888' }}><Inbox size={40} /></div>
            <p>No hay citas {filter !== 'todas' ? 'con este estado' : 'activas'}</p>
          </div>
        )}
      </div>

      {postponeTarget && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }}
          onClick={() => setPostponeTarget(null)}
        >
          <div
            style={{
              background: '#FFFFFF', borderRadius: '14px', padding: '1.5rem',
              width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', color: '#3D2E24' }}>
              {postponeTarget.status === 'postergada' ? 'Reprogramar Cita' : 'Postergar Cita'}
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: '#A89888' }}>
              {getName(postponeTarget)} — {getServices(postponeTarget)}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B5B4E', marginBottom: '0.3rem' }}>
                  Nueva fecha
                </label>
                <input
                  type="date"
                  value={postponeDate}
                  min={today}
                  onChange={(e) => setPostponeDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B5B4E', marginBottom: '0.3rem' }}>
                  Nueva hora
                </label>
                <input
                  type="time"
                  value={postponeTime}
                  onChange={(e) => setPostponeTime(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setPostponeTarget(null)}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                disabled={!postponeDate || !postponeTime}
                onClick={confirmPostpone}
              >
                Confirmar Reprogramación
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar cita"
        message="¿Estás seguro de que deseas eliminar esta cita?"
        onConfirm={() => { updateAppointment(deleteTarget, { status: 'cancelada' }); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
