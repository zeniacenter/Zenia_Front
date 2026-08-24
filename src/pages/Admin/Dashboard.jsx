import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useApp } from '../../context/AppContext';
import { CalendarDays, Clock, DollarSign, Hourglass, Home, User, Info } from 'lucide-react';
import AppointmentDetailModal from '../../components/AppointmentDetailModal';
import { buildHourRange } from '../../utils/hours';
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
  confirmada: '#8B6A50',
  pendiente: '#C9944A',
  cancelada: '#B85C4C',
  realizada: '#6A4A3A',
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
  const { appointments, therapists, services, cabins, branches, settings } = useApp();
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(null);
  const [detailApt, setDetailApt] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('month');
  const [filterBranch, setFilterBranch] = useState('');

  const filteredAppointments = useMemo(() => {
    if (!filterBranch) return appointments;
    return appointments.filter((a) => {
      const cabinId = a.cabinId || a.cabin_id;
      if (cabinId) {
        const cabin = cabins.find((c) => c.id === cabinId);
        if (cabin && String(c.branchId || c.branch_id) === String(filterBranch)) return true;
      }
      const therapistId = a.therapistId || a.therapist_id;
      if (therapistId) {
        const therapist = therapists.find((t) => t.id === therapistId);
        if (therapist && therapist.branchIds?.includes(Number(filterBranch))) return true;
      }
      return false;
    });
  }, [appointments, filterBranch, cabins, therapists]);

  const events = useMemo(() =>
    filteredAppointments
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
    [filteredAppointments, therapists]
  );

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const totalRev = filteredAppointments.reduce((sum, a) => sum + Number(a.total || a.total_price || 0), 0);
    return {
      totalAppointments: filteredAppointments.length,
      todayCount: filteredAppointments.filter((a) => toDateStr(a.date) === today).length,
      totalRevenue: totalRev >= 1000 ? `${(totalRev / 1000).toFixed(1)}k` : Math.round(totalRev).toString(),
      pendingCount: filteredAppointments.filter((a) => a.status === 'pendiente').length,
      cabinCount: cabins.length,
    };
  }, [filteredAppointments, cabins]);

  const selectedAppointments = useMemo(() => {
    if (!selectedDay) return [];
    return filteredAppointments.filter((a) => {
      return toDateStr(a.date) === selectedDay && a.status !== 'cancelada';
    });
  }, [filteredAppointments, selectedDay]);

  const visibleCabins = useMemo(() => {
    let list = cabins.filter((c) => c.is_available ?? c.available);
    if (filterBranch) {
      list = list.filter((c) => String(c.branchId || c.branch_id) === String(filterBranch));
    }
    return list;
  }, [cabins, filterBranch]);

  const cabinDayStr = toDateStr(currentDate);

  const cabinHours = useMemo(
    () => buildHourRange(settings.workStart, settings.workEnd),
    [settings.workStart, settings.workEnd]
  );

  const cabinDayAppointments = useMemo(() =>
    filteredAppointments.filter((a) => toDateStr(a.date) === cabinDayStr && a.status !== 'cancelada'),
  [filteredAppointments, cabinDayStr]);

  const getCabinSlotAppointment = (cabinId, hour) => {
    const slotStart = hour * 60;
    return cabinDayAppointments.find((a) => {
      const cid = a.cabinId || a.cabin_id;
      if (!cid || Number(cid) !== Number(cabinId)) return false;
      const toMin = (t) => {
        const parts = String(t).slice(0, 5).split(':').map(Number);
        return (parts[0] || 0) * 60 + (parts[1] || 0);
      };
      const start = a.time || a.start_time;
      const end = a.end_time || a.time;
      if (!start || !end) return false;
      return toMin(start) <= slotStart && slotStart < toMin(end);
    });
  };

  const navigateDay = (days) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + days);
    setCurrentDate(d);
  };

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
    const dateStr = toDateStr(start);
    setSelectedDay(dateStr);
    if (currentView !== 'month') {
      const hh = String(start.getHours()).padStart(2, '0');
      const mm = String(start.getMinutes()).padStart(2, '0');
      navigate(`/admin/agendar?date=${dateStr}&time=${hh}:${mm}`);
    }
  };

  return (
    <div>
      <div className="admin-header">
        <h2>Dashboard</h2>
        <span style={{ color: '#A89888', fontSize: '0.85rem' }}>
          {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', color: '#A89888' }}>Filtrar por sede:</span>
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
          {currentView === 'day' ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[['month', 'Mes'], ['week', 'Semana'], ['day', 'Día']].map(([view, label]) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setCurrentView(view)}
                      style={{
                        padding: '0.35rem 0.85rem', borderRadius: '8px', border: '1px solid',
                        borderColor: currentView === view ? '#C9944A' : '#E8E0D6',
                        background: currentView === view ? '#FDF6E9' : '#FFFFFF',
                        color: currentView === view ? '#8B6520' : '#6B5B4E',
                        fontWeight: currentView === view ? 600 : 400,
                        fontSize: '0.82rem', cursor: 'pointer',
                      }}
                    >{label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => navigateDay(-1)}
                    style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid #E8E0D6', background: '#FFFFFF', color: '#3D2E24', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                  >←</button>
                  <button
                    type="button"
                    onClick={() => setCurrentDate(new Date())}
                    style={{ padding: '0.35rem 0.9rem', borderRadius: '8px', border: '1px solid #E8E0D6', background: '#FDF6E9', color: '#8B6520', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                  >Hoy</button>
                  <button
                    type="button"
                    onClick={() => navigateDay(1)}
                    style={{ padding: '0.35rem 0.6rem', borderRadius: '8px', border: '1px solid #E8E0D6', background: '#FFFFFF', color: '#3D2E24', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                  >→</button>
                  <span style={{ marginLeft: '0.35rem', fontSize: '0.85rem', fontWeight: 600, color: '#3D2E24' }}>
                    {currentDate.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '780px', tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #E8E0D6', background: '#F5F0E8', color: '#6B5B4E', padding: '0.55rem 0.5rem', fontSize: '0.78rem', textAlign: 'left', minWidth: '130px' }}>
                        Cabina
                      </th>
                      {cabinHours.map((hour) => (
                        <th key={hour} style={{ border: '1px solid #E8E0D6', background: '#F5F0E8', color: '#6B5B4E', padding: '0.55rem 0.25rem', fontSize: '0.75rem', textAlign: 'center' }}>
                          {String(hour).padStart(2, '0')}:00
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCabins.map((cabin) => (
                      <tr key={cabin.id}>
                        <td style={{ border: '1px solid #E8E0D6', background: '#FDFBF7', padding: '0.5rem', fontWeight: 600, color: '#3D2E24', fontSize: '0.82rem' }}>
                          {cabin.name}
                          {cabin.capacity ? (
                            <span style={{ display: 'block', fontWeight: 400, fontSize: '0.72rem', color: '#A89888' }}>
                              Cap: {cabin.capacity}
                            </span>
                          ) : null}
                        </td>
                        {cabinHours.map((hour) => {
                          const apt = getCabinSlotAppointment(cabin.id, hour);
                          const timeStr = `${String(hour).padStart(2, '0')}:00`;
                          if (apt) {
                            const clientName = apt.clientName || apt.person?.name || 'N/A';
                            return (
                              <td
                                key={hour}
                                title={`${clientName} · ${apt.time || apt.start_time}-${apt.end_time || ''} · ${apt.status}`}
                                onClick={() => setSelectedDay(cabinDayStr)}
                                className="cabin-slot-busy"
                                style={{ border: '1px solid #E8E0D6', background: STATUSES_COLORS[apt.status] || '#C5A059', color: '#FDFBF7', padding: '0.45rem 0.3rem', fontSize: '0.72rem', textAlign: 'center', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              >
                                {clientName}
                              </td>
                            );
                          }
                          return (
                            <td
                              key={hour}
                              title={`Agendar en ${cabin.name} — ${timeStr}`}
                              onClick={() => navigate(`/admin/agendar?date=${cabinDayStr}&time=${timeStr}&cabin=${cabin.id}`)}
                              className="cabin-slot"
                              style={{ border: '1px solid #E8E0D6', background: '#FFFFFF', cursor: 'pointer', height: '38px' }}
                            />
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visibleCabins.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#A89888', fontSize: '0.85rem' }}>
                    No hay cabinas disponibles{filterBranch ? ' en esta sede' : ''}
                  </div>
                )}
              </div>
            </>
          ) : (
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
          )}
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
                      <p style={{ fontSize: '0.82rem', color: '#A89888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} /> {apt.time || apt.start_time} - {apt.end_time || ''}
                      </p>
                      {therapist && (
                        <p style={{ fontSize: '0.82rem', color: '#A89888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={13} /> {therapist.name}
                        </p>
                      )}
                      {serviceNames && (
                        <p style={{ fontSize: '0.82rem', color: '#A89888' }}>
                          {serviceNames} | {apt.hours}h - S/ {apt.total || apt.total_price}
                        </p>
                      )}
                      {cabin && (
                        <p style={{ fontSize: '0.82rem', color: '#A89888', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Home size={13} /> {cabin.name}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 600,
                        padding: '0.2rem 0.6rem', borderRadius: '12px',
                        background: apt.status === 'confirmada' ? '#F5EDE5' : '#FDF6E9',
                        color: apt.status === 'confirmada' ? '#8B6A50' : '#8B6520',
                      }}>
                        {apt.status}
                      </span>
                      <button
                        type="button"
                        title="Ver detalle"
                        onClick={() => setDetailApt(apt)}
                        style={{
                          width: 24, height: 24, borderRadius: '50%',
                          border: '1px solid #E8E0D6', background: '#FDFBF7',
                          color: '#8B6520', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 0, flexShrink: 0,
                        }}
                      >
                        <Info size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AppointmentDetailModal
        open={!!detailApt}
        appointment={detailApt}
        allAppointments={appointments}
        onClose={() => setDetailApt(null)}
        onSelectSession={(session) => setDetailApt(session)}
      />
    </div>
  );
}
