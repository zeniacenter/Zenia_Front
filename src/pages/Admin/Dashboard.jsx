import { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useApp } from '../../context/AppContext';
import { CalendarDays, Clock, DollarSign, Hourglass, Home } from 'lucide-react';
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
  confirmada: '#5C8A60',
  pendiente: '#C9944A',
  cancelada: '#B85C4C',
  realizada: '#3D7A42',
  postergada: '#4A7A9A',
};

function toDateStr(d) {
  if (!d) return '';
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const s = typeof d === 'string' ? d : String(d);
  return s.split('T')[0];
}

export default function Dashboard() {
  const { appointments, therapists, services, cabins } = useApp();
  const [selectedDay, setSelectedDay] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');

  const events = useMemo(() =>
    appointments
      .filter((a) => a.status !== 'cancelada')
      .map((apt) => {
        const therapistId = apt.therapistId || apt.therapist_id;
        const therapist = therapists.find((t) => t.id === therapistId);
        const clientName = apt.clientName || apt.person?.name || 'N/A';
        const dateStr = toDateStr(apt.date);
        const startTime = apt.time || apt.start_time || '09:00';
        const endTime = apt.end_time || apt.time || '10:00';
        const startDate = new Date(`${dateStr}T${startTime}`);
        const endDate = new Date(`${dateStr}T${endTime}`);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
        return {
          id: apt.id,
          title: `${clientName} - ${therapist?.name || 'N/A'}`,
          start: startDate,
          end: endDate,
          status: apt.status,
          allDay: false,
          resource: apt,
        };
      })
      .filter(Boolean),
    [appointments, therapists]
  );

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const totalRev = appointments.reduce((sum, a) => sum + Number(a.total || a.total_price || 0), 0);
    return {
      totalAppointments: appointments.length,
      todayCount: appointments.filter((a) => toDateStr(a.date) === today).length,
      totalRevenue: totalRev >= 1000 ? `${(totalRev / 1000).toFixed(1)}k` : Math.round(totalRev).toString(),
      pendingCount: appointments.filter((a) => a.status === 'pendiente').length,
      cabinCount: cabins.length,
    };
  }, [appointments, cabins]);

  const selectedAppointments = useMemo(() => {
    if (!selectedDay) return [];
    return appointments.filter((a) => {
      return toDateStr(a.date) === selectedDay && a.status !== 'cancelada';
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
    setSelectedDay(toDateStr(event.start));
  };

  const handleSelectSlot = ({ start }) => {
    setSelectedDay(toDateStr(start));
  };

  return (
    <div>
      <div className="admin-header">
        <h2>Dashboard</h2>
        <span style={{ color: '#A89888', fontSize: '0.85rem' }}>
          {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green"><CalendarDays size={22} /></div>
          <div className="stat-info">
            <h4>{stats.totalAppointments}</h4>
            <p>Total Citas</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gold"><Clock size={22} /></div>
          <div className="stat-info">
            <h4>{stats.todayCount}</h4>
            <p>Citas Hoy</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><DollarSign size={22} /></div>
          <div className="stat-info">
            <h4>S/ {stats.totalRevenue}</h4>
            <p>Ingresos Totales</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><Hourglass size={22} /></div>
          <div className="stat-info">
            <h4>{stats.pendingCount}</h4>
            <p>Pendientes</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon gold"><Home size={22} /></div>
          <div className="stat-info">
            <h4>{stats.cabinCount}</h4>
            <p>Cabinas</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="calendar-wrapper" style={{ minHeight: 500 }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 480 }}
            eventPropGetter={eventStyleGetter}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            date={currentDate}
            view={currentView}
            onNavigate={(date) => setCurrentDate(date)}
            onView={(view) => setCurrentView(view)}
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
          <h3 style={{ marginBottom: '1rem', color: '#3D2E24' }}>
            {selectedDay
              ? `Citas del ${selectedDay}`
              : 'Selecciona una cita en el calendario'}
          </h3>
          {selectedAppointments.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E8E0D6', borderRadius: '14px' }}>
              <p style={{ color: '#A89888' }}>
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
                <div key={apt.id} style={{ padding: '1rem', marginBottom: '0.75rem', background: '#FFFFFF', border: '1px solid #E8E0D6', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <strong style={{ color: '#3D2E24' }}>{apt.clientName || apt.person?.name}</strong>
                      <p style={{ fontSize: '0.82rem', color: '#A89888' }}>
                        {apt.time || apt.start_time} - {therapist?.name}
                      </p>
                      {serviceNames && (
                        <p style={{ fontSize: '0.82rem', color: '#A89888' }}>
                          {serviceNames} | {apt.hours}h - S/ {apt.total || apt.total_price}
                        </p>
                      )}
                      {cabin && (
                        <p style={{ fontSize: '0.82rem', color: '#A89888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Home size={14} /> {cabin.name}
                        </p>
                      )}
                    </div>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600,
                      padding: '0.2rem 0.6rem', borderRadius: '12px',
                      background: apt.status === 'confirmada' ? '#EDF5EE' : '#FDF6E9',
                      color: apt.status === 'confirmada' ? '#5C8A60' : '#8B6520',
                    }}>
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
