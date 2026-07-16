import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import ConfirmModal from '../../components/ConfirmModal';

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: '#8B6520', bg: '#FDF6E9' },
  confirmada: { label: 'Confirmada', color: '#5C8A60', bg: '#EDF5EE' },
  cancelada: { label: 'Cancelada', color: '#B85C4C', bg: '#FCEEED' },
  realizada: { label: 'Realizada', color: '#3D7A42', bg: '#E4F2E6' },
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

export default function AppointmentsAdmin() {
  const { appointments, therapists, services, cabins, updateAppointment } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('todas');
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  const getName = (apt) => apt.person?.name || apt.clientName || 'N/A';
  const getPhone = (apt) => apt.person?.phone || apt.clientPhone || 'N/A';
  const getTherapist = (apt) => {
    const id = apt.therapist_id || apt.therapistId;
    return therapists.find((t) => t.id === id)?.name || 'N/A';
  };
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
              {filtered.map((apt) => {
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
                                border: 'none', background: '#5C8A60', color: '#fff',
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
                            onClick={() => updateAppointment(apt.id, { status: 'postergada' })}
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#A89888' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
            <p>No hay citas {filter !== 'todas' ? 'con este estado' : 'activas'}</p>
          </div>
        )}
      </div>

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
