import { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useApp } from '../../context/AppContext';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { es };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const STATUSES_COLORS = {
  confirmada: '#5A8F6A',
  pendiente: '#C9A96E',
  cancelada: '#C45B4A',
};

export default function Dashboard() {
  const { appointments, therapists, services, cabins } = useApp();
  const [selectedDay, setSelectedDay] = useState(null);

  const events = useMemo(() =>
    appointments
      .filter((a) => a.status !== 'cancelada')
      .map((apt) => {
        const therapistId = apt.therapistId || apt.therapist_id;
        const therapist = therapists.find((t) => t.id === therapistId);
        const clientName = apt.clientName || apt.person?.name || 'N/A';
        return {
          id: apt.id,
          title: `${clientName} - ${therapist?.name || 'N/A'}`,
          start: new Date(`${apt.date}T${apt.time || apt.start_time || '09:00'}`),
          end: new Date(`${apt.date}T${apt.end_time || apt.time || '10:00'}`),
          status: apt.status,
          allDay: false,
          resource: apt,
        };
      }),
    [appointments, therapists]
  );

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return {
      totalAppointments: appointments.length,
      todayCount: appointments.filter((a) => a.date === today).length,
      totalRevenue: appointments.reduce((sum, a) => sum + (a.total || a.total_price || 0), 0),
      pendingCount: appointments.filter((a) => a.status === 'pendiente').length,
      cabinCount: cabins.length,
    };
  }, [appointments, cabins]);

  const selectedAppointments = useMemo(() => {
    if (!selectedDay) return [];
    return appointments.filter((a) => {
      const aptDate = typeof a.date === 'string' ? a.date : a.date?.split('T')[0];
      return aptDate === selectedDay && a.status !== 'cancelada';
    });
  }, [appointments, selectedDay]);

  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: STATUSES_COLORS[event.status] || '#C5A059',
      borderRadius: '6px',
      opacity: 0.9,
      color: '#FDFBF7',
      border: 'none',
      fontSize: '0.8rem',
    },
  });

  const handleSelectEvent = (event) => {
    const aptDate = event.start.toISOString().split('T')[0];
    setSelectedDay(aptDate);
  };

  return (
    <div>
      <div className="admin-header">
        <h2>Dashboard</h2>
        <span style={{ color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green">📅</div>
          <div className="stat-info">
            <h4>{stats.totalAppointments}</h4>
            <p>Total Citas</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gold">🕐</div>
          <div className="stat-info">
            <h4>{stats.todayCount}</h4>
            <p>Citas Hoy</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">💰</div>
          <div className="stat-info">
            <h4>S/ {stats.totalRevenue}</h4>
            <p>Ingresos Totales</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">⏳</div>
          <div className="stat-info">
            <h4>{stats.pendingCount}</h4>
            <p>Pendientes</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gold">🏠</div>
          <div className="stat-info">
            <h4>{stats.cabinCount}</h4>
            <p>Cabinas</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem' }}>
        <div className="calendar-wrapper" style={{ minHeight: 500 }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 480 }}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            views={['month', 'week', 'day']}
            messages={{
              today: 'Hoy',
              previous: 'Anterior',
              next: 'Siguiente',
              month: 'Mes',
              week: 'Semana',
              day: 'Día',
              noEventsInRange: 'No hay citas en este rango',
            }}
            culture="es"
          />
        </div>

        <div>
          <h3 style={{ marginBottom: '1rem' }}>
            {selectedDay
              ? `Citas del ${selectedDay}`
              : 'Selecciona una cita en el calendario'}
          </h3>
          {selectedAppointments.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                {selectedDay ? 'No hay citas para este día' : 'Haz clic en una cita del calendario'}
              </p>
            </div>
          ) : (
            selectedAppointments.map((apt) => {
              const therapist = therapists.find((t) => t.id === (apt.therapistId || apt.therapist_id));
              const serviceNames = (apt.serviceIds || apt.service_ids || [])
                .map((id) => services.find((s) => s.id === id)?.name)
                .filter(Boolean)
                .join(', ');
              const cabin = cabins.find((c) => c.id === (apt.cabinId || apt.cabin_id));
              return (
                <div className="card" key={apt.id} style={{ padding: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <strong>{apt.clientName || apt.person?.name}</strong>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {apt.time || apt.start_time} - {therapist?.name}
                      </p>
                      {serviceNames && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {serviceNames} | {apt.hours}h - S/ {apt.total || apt.total_price}
                        </p>
                      )}
                      {cabin && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          🏠 {cabin.name}
                        </p>
                      )}
                    </div>
                    <span className={`badge badge-${apt.status === 'confirmada' ? 'confirmed' : 'pending'}`}>
                      {apt.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
