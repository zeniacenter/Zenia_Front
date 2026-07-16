import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function AdminBooking() {
  const { services, therapists, cabins, appointments, addAppointment, settings } = useApp();
  const navigate = useNavigate();

  const [selectedService, setSelectedService] = useState('');
  const [selectedTherapist, setSelectedTherapist] = useState('');
  const [selectedCabin, setSelectedCabin] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [hours, setHours] = useState(1);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  const getSelectedTherapistObj = () => therapists.find((t) => String(t.id) === String(selectedTherapist));
  const getSelectedServiceObj = () => services.find((s) => String(s.id) === String(selectedService));

  const getAvailableTimeSlots = () => {
    const therapist = getSelectedTherapistObj();
    if (!therapist || !selectedDate) return [];
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dayName = dayNames[dateObj.getDay()];
    const scheduleSlots = therapist.schedule[dayName] || [];

    const bookedSlots = appointments
      .filter((a) => {
        const aptTherapistId = a.therapistId || a.therapist_id;
        return String(aptTherapistId) === String(selectedTherapist)
          && a.date === selectedDate
          && ['pendiente', 'confirmada'].includes(a.status);
      })
      .flatMap((a) => {
        const start = a.start_time || a.time;
        const end = a.end_time;
        if (!start || !end) return [];
        const booked = [];
        let [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        while (sh < eh || (sh === eh && sm < em)) {
          booked.push(`${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`);
          sm += 30;
          if (sm >= 60) { sh++; sm = 0; }
        }
        return booked;
      });

    return scheduleSlots.filter((slot) => !bookedSlots.includes(slot));
  };

  const getTotal = () => {
    const service = getSelectedServiceObj();
    if (!service) return 0;
    const basePrice = hours <= 0.5 ? service.pricePerHalfHour : service.pricePerHour;
    return basePrice * hours;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedService || !selectedTherapist || !selectedDate || !selectedTime || !clientName || !clientPhone) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }
    if (settings.cabinRequired && !selectedCabin) {
      alert('Por favor selecciona una cabina');
      return;
    }

    try {
      await addAppointment({
        client_name: clientName,
        client_phone: clientPhone,
        therapist_id: selectedTherapist,
        cabin_id: selectedCabin || null,
        service_ids: [selectedService],
        date: selectedDate,
        start_time: selectedTime,
        hours,
        total_price: getTotal(),
        status: 'pendiente',
      });
      alert('Cita agendada exitosamente');
      navigate('/admin/citas');
    } catch (err) {
      alert('Error al agendar cita: ' + (err.response?.data?.message || err.message));
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '700px' }}>
        <div className="admin-header">
          <h2>Agendar Cita</h2>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Servicio</label>
                <select
                  className="form-control"
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  required
                >
                  <option value="">Seleccionar servicio</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} - S/ {s.pricePerHour}/h</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Terapeuta</label>
                <select
                  className="form-control"
                  value={selectedTherapist}
                  onChange={(e) => {
                    setSelectedTherapist(e.target.value);
                    setSelectedTime('');
                  }}
                  required
                >
                  <option value="">Seleccionar terapeuta</option>
                  {therapists.filter((t) => t.available).map((t) => (
                    <option key={t.id} value={t.id}>{t.name} - {t.specialty}</option>
                  ))}
                </select>
              </div>
            </div>

            {settings.cabinRequired && (
              <div className="form-group">
                <label>Cabina</label>
                <select
                  className="form-control"
                  value={selectedCabin}
                  onChange={(e) => setSelectedCabin(e.target.value)}
                  required
                >
                  <option value="">Seleccionar cabina</option>
                  {cabins.filter((c) => c.available).map((c) => (
                    <option key={c.id} value={c.id}>{c.name} (Cap: {c.capacity})</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Fecha</label>
                <input
                  type="date"
                  className="form-control"
                  value={selectedDate}
                  min={today}
                  onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                  required
                />
              </div>
              <div className="form-group">
                <label>Hora</label>
                <select
                  className="form-control"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  disabled={!selectedTherapist || !selectedDate}
                  required
                >
                  <option value="">
                    {selectedTherapist && selectedDate ? 'Seleccionar hora' : 'Selecciona terapeuta y fecha primero'}
                  </option>
                  {getAvailableTimeSlots().map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Duración (horas)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setHours((h) => Math.max(0.5, h - 0.5))}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    border: '1.5px solid var(--land-border)', background: 'var(--dark-700)',
                    color: 'var(--land-text)', fontSize: '1.1rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >−</button>
                <span style={{ fontSize: '1rem', fontWeight: 600, minWidth: '60px', textAlign: 'center' }}>
                  {hours} {hours === 1 ? 'hora' : 'horas'}
                </span>
                <button
                  type="button"
                  onClick={() => setHours((h) => Math.min(8, h + 0.5))}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    border: '1.5px solid var(--land-border)', background: 'var(--dark-700)',
                    color: 'var(--land-text)', fontSize: '1.1rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >+</button>
                <span style={{ color: 'var(--land-text-muted)', fontSize: '0.85rem' }}>
                  — S/ {getTotal()}
                </span>
              </div>
            </div>

            <h4 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Datos del Cliente</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Nombre completo</label>
                <input
                  type="text"
                  className="form-control"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="tel"
                  className="form-control"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: '1rem' }}>
              Agendar Cita
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
