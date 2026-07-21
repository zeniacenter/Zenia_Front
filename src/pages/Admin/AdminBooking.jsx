import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { therapistsAPI } from '../../services/api';

export default function AdminBooking() {
  const { services, therapists, cabins, branches, addAppointment, settings } = useApp();
  const navigate = useNavigate();

  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedTherapist, setSelectedTherapist] = useState('');
  const [selectedCabin, setSelectedCabin] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [hours, setHours] = useState(1);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [busySlots, setBusySlots] = useState([]);
  const busySlotsCache = useRef({});
  const loadingSlots = useRef(false);

  const filteredServices = selectedBranch
    ? services.filter((s) => {
        const branch = branches.find((b) => b.id === Number(selectedBranch));
        if (!branch || !branch.serviceIds || branch.serviceIds.length === 0) return true;
        return branch.serviceIds.includes(s.id);
      })
    : services;

  const filteredCabins = selectedBranch
    ? cabins.filter((c) => {
        if (String(c.branchId || c.branch_id) !== String(selectedBranch)) return false;
        return c.is_available ?? c.available;
      })
    : cabins.filter((c) => c.is_available ?? c.available);

  const filteredTherapists = selectedBranch
    ? therapists.filter((t) => {
        if (!(t.is_available ?? t.available)) return false;
        if (!t.branchIds || t.branchIds.length === 0) return true;
        return t.branchIds.includes(Number(selectedBranch));
      })
    : therapists.filter((t) => t.is_available ?? t.available);

  const getSelectedTherapistObj = () => therapists.find((t) => String(t.id) === String(selectedTherapist));
  const getSelectedServiceObj = () => services.find((s) => String(s.id) === String(selectedService));

  useEffect(() => {
    if (!selectedTherapist || !selectedDate) {
      setBusySlots([]);
      return;
    }
    const cacheKey = `${selectedTherapist}_${selectedDate}`;
    if (busySlotsCache.current[cacheKey]) {
      setBusySlots(busySlotsCache.current[cacheKey]);
      return;
    }
    if (loadingSlots.current) return;
    loadingSlots.current = true;
    therapistsAPI.busySlots(selectedTherapist, selectedDate)
      .then((res) => {
        const slots = res.data.busy_slots || [];
        busySlotsCache.current[cacheKey] = slots;
        setBusySlots(slots);
      })
      .catch(() => setBusySlots([]))
      .finally(() => { loadingSlots.current = false; });
  }, [selectedTherapist, selectedDate]);

  const getAvailableTimeSlots = () => {
    const therapist = getSelectedTherapistObj();
    if (!therapist || !selectedDate) return [];
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dayName = dayNames[dateObj.getDay()];
    const schedule = therapist.schedule || {};
    const scheduleSlots = schedule[dayName] || [];

    let available = scheduleSlots.filter((slot) => !busySlots.includes(slot));

    if (selectedDate === today) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      available = available.filter((slot) => {
        const [h, m] = slot.split(':').map(Number);
        return h * 60 + m > currentMinutes;
      });
    }
    return available;
  };

  const getTotal = () => {
    const service = getSelectedServiceObj();
    if (!service) return 0;
    const basePrice = hours <= 0.5 ? service.pricePerHalfHour : service.pricePerHour;
    return basePrice * hours;
  };

  const handleBranchChange = (branchId) => {
    setSelectedBranch(branchId);
    setSelectedService('');
    setSelectedTherapist('');
    setSelectedCabin('');
    setSelectedTime('');
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
    if (settings.branchRequired && !selectedBranch) {
      alert('Por favor selecciona una sede');
      return;
    }

    try {
      await addAppointment({
        client_name: clientName,
        client_phone: clientPhone,
        therapist_id: selectedTherapist,
        cabin_id: selectedCabin || null,
        branch_id: selectedBranch || null,
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
            {settings.branchRequired && (
              <div className="form-group">
                <label>Sede</label>
                <select
                  className="form-control"
                  value={selectedBranch}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  required
                >
                  <option value="">Seleccionar sede</option>
                  {branches.filter((b) => b.is_active).map((b) => (
                    <option key={b.id} value={b.id}>{b.name}{b.address ? ` - ${b.address}` : ''}</option>
                  ))}
                </select>
              </div>
            )}

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
                  {filteredServices.map((s) => (
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
                  {filteredTherapists.map((t) => (
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
                  {filteredCabins.map((c) => (
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
                  className="hours-btn"
                  onClick={() => setHours((h) => Math.max(0.5, h - 0.5))}
                >−</button>
                <span style={{ fontSize: '1rem', fontWeight: 600, minWidth: '60px', textAlign: 'center' }}>
                  {hours} {hours === 1 ? 'hora' : 'horas'}
                </span>
                <button
                  type="button"
                  className="hours-btn"
                  onClick={() => setHours((h) => Math.min(8, h + 0.5))}
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

          {(selectedBranch || selectedService || selectedTherapist || selectedDate || selectedTime) && (
            <div style={{
              marginTop: '1.5rem', padding: '1rem 1.25rem', background: '#FDFBF7',
              border: '1px solid #E8E0D6', borderRadius: '12px',
            }}>
              <h4 style={{ fontSize: '0.85rem', color: '#A89888', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resumen</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1.5rem', fontSize: '0.85rem' }}>
                {selectedBranch && (
                  <>
                    <span style={{ color: '#A89888' }}>Sede</span>
                    <span style={{ color: '#3D2E24', fontWeight: 600 }}>
                      {branches.find((b) => String(b.id) === String(selectedBranch))?.name || 'N/A'}
                    </span>
                  </>
                )}
                {selectedService && (
                  <>
                    <span style={{ color: '#A89888' }}>Servicio</span>
                    <span style={{ color: '#3D2E24', fontWeight: 600 }}>
                      {services.find((s) => String(s.id) === String(selectedService))?.name || 'N/A'}
                    </span>
                  </>
                )}
                {selectedTherapist && (
                  <>
                    <span style={{ color: '#A89888' }}>Terapeuta</span>
                    <span style={{ color: '#3D2E24', fontWeight: 600 }}>
                      {therapists.find((t) => String(t.id) === String(selectedTherapist))?.name || 'N/A'}
                    </span>
                  </>
                )}
                {selectedCabin && (
                  <>
                    <span style={{ color: '#A89888' }}>Cabina</span>
                    <span style={{ color: '#3D2E24', fontWeight: 600 }}>
                      {cabins.find((c) => String(c.id) === String(selectedCabin))?.name || 'N/A'}
                    </span>
                  </>
                )}
                {selectedDate && (
                  <>
                    <span style={{ color: '#A89888' }}>Fecha</span>
                    <span style={{ color: '#3D2E24', fontWeight: 600 }}>
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </>
                )}
                {selectedTime && (
                  <>
                    <span style={{ color: '#A89888' }}>Hora</span>
                    <span style={{ color: '#3D2E24', fontWeight: 600 }}>{selectedTime}</span>
                  </>
                )}
                <span style={{ color: '#A89888' }}>Duración</span>
                <span style={{ color: '#3D2E24', fontWeight: 600 }}>{hours} {hours === 1 ? 'hora' : 'horas'}</span>
                <span style={{ color: '#A89888' }}>Total</span>
                <span style={{ color: '#3D2E24', fontWeight: 600 }}>S/ {getTotal()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
