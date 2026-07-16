import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export default function AdminBooking() {
  const { services, therapists, cabins, addAppointment, settings } = useApp();
  const navigate = useNavigate();

  const [selectedService, setSelectedService] = useState('');
  const [selectedTherapist, setSelectedTherapist] = useState('');
  const [selectedCabin, setSelectedCabin] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [hours, setHours] = useState(1);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  const getSelectedTherapistObj = () => therapists.find((t) => t.id === selectedTherapist);
  const getSelectedServiceObj = () => services.find((s) => s.id === selectedService);

  const getAvailableTimeSlots = () => {
    const therapist = getSelectedTherapistObj();
    if (!therapist || !selectedDate) return [];
    const dateObj = new Date(selectedDate);
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dayName = dayNames[dateObj.getDay()];
    return therapist.schedule[dayName] || [];
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
        cabin_id: selectedCabin,
        service_ids: [selectedService],
        date: selectedDate,
        start_time: selectedTime,
        hours,
        total_price: getTotal(),
        status: 'confirmada',
      });
      alert('Cita agendada exitosamente');
      navigate('/admin/citas');
    } catch (err) {
      alert('Error al agendar cita: ' + (err.response?.data?.message || err.message));
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="admin-header">
        <h2>Agendar Cita</h2>
      </div>

      <div className="card" style={{ padding: '2rem', maxWidth: '700px' }}>
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
                  <option key={s.id} value={s.id}>{s.name} - S/ {s.pricePerHour || s.price_per_hour}/h</option>
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
                {therapists.filter((t) => t.is_available ?? t.available).map((t) => (
                  <option key={t.id} value={t.id}>{t.name} - {t.specialty}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Cabina {settings.cabinRequired ? '' : '(Opcional)'}</label>
            <select
              className="form-control"
              value={selectedCabin}
              onChange={(e) => setSelectedCabin(e.target.value)}
              required={settings.cabinRequired}
            >
              <option value="">Seleccionar cabina</option>
              {cabins.filter((c) => c.is_available ?? c.available).map((c) => (
                <option key={c.id} value={c.id}>{c.name} (Cap: {c.capacity})</option>
              ))}
            </select>
          </div>

          <div className="hours-selector">
            <button type="button" onClick={() => setHours((h) => Math.max(0.5, h - 0.5))}>−</button>
            <div className="hours-display">{hours} {hours === 1 ? 'hora' : 'horas'}</div>
            <button type="button" onClick={() => setHours((h) => Math.min(8, h + 0.5))}>+</button>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
              Total: S/ {getTotal()}
            </span>
          </div>

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
  );
}
