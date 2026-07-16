import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import ConfirmModal from '../../components/ConfirmModal';

export default function AppointmentsAdmin() {
  const { appointments, therapists, services, cabins, updateAppointment, deleteAppointment } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('todas');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = filter === 'todas'
    ? appointments
    : appointments.filter((a) => a.status === filter);

  const sorted = [...filtered].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    const timeA = a.start_time || a.time || '';
    const timeB = b.start_time || b.time || '';
    if (dateA === dateB) return timeA.localeCompare(timeB);
    return dateA.localeCompare(dateB);
  });

  const getClientName = (apt) => apt.clientName || apt.person?.name || 'N/A';
  const getClientPhone = (apt) => apt.clientPhone || apt.person?.phone || 'N/A';
  const getTherapistName = (apt) => {
    const id = apt.therapistId || apt.therapist_id;
    return therapists.find((t) => t.id === id)?.name || 'N/A';
  };
  const getTime = (apt) => apt.time || apt.start_time || 'N/A';
  const getEndTime = (apt) => apt.end_time || '';
  const getTotal = (apt) => apt.total || apt.total_price || 0;
  const getCabinName = (apt) => {
    const id = apt.cabinId || apt.cabin_id;
    return cabins.find((c) => c.id === id)?.name || 'N/A';
  };
  const getServiceNames = (apt) => {
    const ids = apt.serviceIds || apt.service_ids;
    if (ids && ids.length > 0) {
      return ids.map((id) => services.find((s) => s.id === id)?.name).filter(Boolean).join(', ');
    }
    if (apt.services && apt.services.length > 0) {
      return apt.services.map((s) => s.name).join(', ');
    }
    return 'N/A';
  };

  return (
    <div>
      <div className="admin-header">
        <h2>Gestión de Citas</h2>
        <button className="btn btn-primary" onClick={() => navigate('/admin/agendar')}>
          + Agendar Cita
        </button>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {['todas', 'confirmada', 'pendiente', 'cancelada'].map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f)}
          >
            {f === 'todas' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Terapeuta</th>
              <th>Cabina</th>
              <th>Servicios</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Duración</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((apt) => (
              <tr key={apt.id}>
                <td><strong>{getClientName(apt)}</strong></td>
                <td>{getClientPhone(apt)}</td>
                <td>{getTherapistName(apt)}</td>
                <td>{getCabinName(apt)}</td>
                <td style={{ maxWidth: '200px' }}>{getServiceNames(apt)}</td>
                <td>{apt.date}</td>
                <td>{getTime(apt)}</td>
                <td>{apt.hours}h</td>
                <td><strong>S/ {getTotal(apt)}</strong></td>
                <td>
                  <span className={`badge badge-${apt.status === 'confirmada' ? 'confirmed' : apt.status === 'pendiente' ? 'pending' : 'cancelled'}`}>
                    {apt.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {apt.status !== 'confirmada' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => updateAppointment(apt.id, { status: 'confirmada' })}
                      >
                        Confirmar
                      </button>
                    )}
                    {apt.status !== 'cancelada' && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => updateAppointment(apt.id, { status: 'cancelada' })}
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => setDeleteTarget(apt.id)}
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No hay citas para este filtro
          </p>
        )}
      </div>
      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar cita"
        message="¿Estás seguro de que deseas eliminar esta cita? Esta acción no se puede deshacer."
        onConfirm={() => { deleteAppointment(deleteTarget); setDeleteTarget(null); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
