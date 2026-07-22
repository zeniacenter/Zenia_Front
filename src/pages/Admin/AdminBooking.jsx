import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { personAPI, appointmentsAPI } from '../../services/api';
import TimeSlotPicker from '../../components/TimeSlotPicker';

export default function AdminBooking() {
  const { services, therapists, cabins, branches, packages, addAppointment, settings } = useApp();
  const navigate = useNavigate();

  const [selectedBranch, setSelectedBranch] = useState('');
  const [bookingType, setBookingType] = useState('service');
  const [selectedService, setSelectedService] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedTherapist, setSelectedTherapist] = useState('');
  const [selectedCabin, setSelectedCabin] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [hours, setHours] = useState(1);
  const [sessionCount, setSessionCount] = useState(1);
  const [dniLoading, setDniLoading] = useState(false);

  const [clientName, setClientName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientDni, setClientDni] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  const filteredServices = selectedBranch
    ? services.filter((s) => {
        const branch = branches.find((b) => b.id === Number(selectedBranch));
        if (!branch || !branch.serviceIds || branch.serviceIds.length === 0) return true;
        return branch.serviceIds.includes(s.id);
      })
    : services;

  const filteredPackages = selectedBranch
    ? packages.filter((p) => {
        if (!p.active) return false;
        if (!p.branchId) return true;
        return String(p.branchId) === String(selectedBranch);
      })
    : packages?.filter((p) => p.active) || [];

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
  const getSelectedPackageObj = () => (packages || []).find((p) => String(p.id) === String(selectedPackage));

  const getTotal = () => {
    if (bookingType === 'package' && selectedPackage) {
      const pkg = getSelectedPackageObj();
      return pkg ? pkg.packagePrice * sessionCount : 0;
    }
    const service = getSelectedServiceObj();
    if (!service) return 0;
    return service.pricePerHour * hours;
  };

  const handleDniBlur = useCallback(async () => {
    const dni = clientDni.trim();
    if (!dni || dni.length < 8) return;

    setDniLoading(true);
    try {
      const res = await personAPI.searchByDni(dni);
      if (res.data) {
        const p = res.data;
        setClientName(p.name || '');
        setClientLastName(p.last_name || '');
        setClientPhone(p.phone || '');
        setClientEmail(p.email || '');
        setClientAddress(p.address || '');
      }
    } catch {
    } finally {
      setDniLoading(false);
    }
  }, [clientDni]);

  const handleBranchChange = (branchId) => {
    setSelectedBranch(branchId);
    setSelectedService('');
    setSelectedPackage('');
    setSelectedTherapist('');
    setSelectedCabin('');
    setSelectedTime('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTherapist || !selectedDate || !selectedTime) {
      alert('Completa todos los campos obligatorios');
      return;
    }
    if (!clientName || !clientLastName || !clientPhone) {
      alert('Los campos de nombre, apellido y teléfono son obligatorios');
      return;
    }
    if (settings.branchRequired && !selectedBranch) {
      alert('Selecciona una sede');
      return;
    }
    if (settings.cabinRequired && !selectedCabin) {
      alert('Selecciona una cabina');
      return;
    }
    if (bookingType === 'service' && !selectedService) {
      alert('Selecciona un servicio');
      return;
    }
    if (bookingType === 'package' && !selectedPackage) {
      alert('Selecciona un paquete');
      return;
    }

    const serviceIds = bookingType === 'service'
      ? [selectedService]
      : (getSelectedPackageObj()?.serviceIds || []);

    try {
      await addAppointment({
        client_name: clientName,
        client_last_name: clientLastName,
        client_dni: clientDni,
        client_phone: clientPhone,
        client_email: clientEmail,
        client_address: clientAddress,
        therapist_id: selectedTherapist,
        cabin_id: selectedCabin || null,
        branch_id: selectedBranch || null,
        package_id: bookingType === 'package' ? selectedPackage : null,
        service_ids: serviceIds,
        date: selectedDate,
        start_time: selectedTime,
        hours: bookingType === 'package' ? (getSelectedPackageObj()?.hours || hours) : hours,
        total_price: getTotal(),
        status: 'pendiente',
        session_count: sessionCount,
      });
      alert(sessionCount > 1 ? `${sessionCount} sesiones agendadas exitosamente` : 'Cita agendada exitosamente');
      navigate('/admin/citas');
    } catch (err) {
      alert('Error al agendar: ' + (err.response?.data?.message || err.message));
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const inputStyle = {
    width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px',
    border: '1px solid #E8E0D6', background: '#FFFFFF', color: '#3D2E24',
    fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none',
  };

  const labelStyle = {
    display: 'block', fontSize: '0.75rem', fontWeight: 600,
    color: '#6B5B4E', marginBottom: '0.3rem',
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '750px' }}>
        <div className="admin-header">
          <h2>Agendar Cita</h2>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => { setBookingType('service'); setSelectedPackage(''); setSessionCount(1); }}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '8px', border: '1.5px solid',
                    borderColor: bookingType === 'service' ? '#C9944A' : '#E8E0D6',
                    background: bookingType === 'service' ? '#FDF6E9' : '#fff',
                    color: bookingType === 'service' ? '#8B6520' : '#A89888',
                    fontWeight: bookingType === 'service' ? 600 : 400,
                    fontSize: '0.85rem', cursor: 'pointer',
                  }}
                >
                  Servicio Individual
                </button>
                <button
                  type="button"
                  onClick={() => { setBookingType('package'); setSelectedService(''); }}
                  style={{
                    padding: '0.5rem 1rem', borderRadius: '8px', border: '1.5px solid',
                    borderColor: bookingType === 'package' ? '#C9944A' : '#E8E0D6',
                    background: bookingType === 'package' ? '#FDF6E9' : '#fff',
                    color: bookingType === 'package' ? '#8B6520' : '#A89888',
                    fontWeight: bookingType === 'package' ? 600 : 400,
                    fontSize: '0.85rem', cursor: 'pointer',
                  }}
                >
                  Paquete / Multi-sesión
                </button>
              </div>
            </div>

            {settings.branchRequired && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Sede *</label>
                <select
                  style={inputStyle}
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

            {bookingType === 'service' ? (
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Servicio *</label>
                <select
                  style={inputStyle}
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  required
                >
                  <option value="">Seleccionar servicio</option>
                  {filteredServices.filter((s) => s.active !== false).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} - S/ {s.pricePerHour}/h</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>Paquete *</label>
                <select
                  style={inputStyle}
                  value={selectedPackage}
                  onChange={(e) => {
                    setSelectedPackage(e.target.value);
                    const pkg = (packages || []).find((p) => String(p.id) === e.target.value);
                    if (pkg) {
                      setHours(pkg.hours || 1);
                      setSessionCount(pkg.sessions?.length || pkg.hours || 1);
                    }
                  }}
                  required
                >
                  <option value="">Seleccionar paquete</option>
                  {filteredPackages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - S/ {p.packagePrice} ({p.sessions?.length || '?'} sesiones)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Terapeuta *</label>
                <select
                  style={inputStyle}
                  value={selectedTherapist}
                  onChange={(e) => { setSelectedTherapist(e.target.value); setSelectedTime(''); }}
                  required
                >
                  <option value="">Seleccionar terapeuta</option>
                  {filteredTherapists.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} - {t.specialty}</option>
                  ))}
                </select>
              </div>
              {settings.cabinRequired && (
                <div>
                  <label style={labelStyle}>Cabina *</label>
                  <select
                    style={inputStyle}
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
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Fecha *</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={selectedDate}
                  min={today}
                  onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Hora *</label>
                {selectedTherapist && selectedDate ? (
                  <TimeSlotPicker
                    therapistId={Number(selectedTherapist)}
                    schedule={getSelectedTherapistObj()?.schedule}
                    date={selectedDate}
                    value={selectedTime}
                    hours={bookingType === 'package' ? (getSelectedPackageObj()?.hours || hours) : hours}
                    onChange={setSelectedTime}
                  />
                ) : (
                  <div style={{ padding: '0.6rem', textAlign: 'center', color: '#A89888', fontSize: '0.85rem', border: '1px solid #E8E0D6', borderRadius: '8px' }}>
                    Selecciona terapeuta y fecha
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: bookingType === 'service' ? '1fr 1fr' : '1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              {bookingType === 'service' && (
                <div>
                  <label style={labelStyle}>Duración (horas)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button type="button" onClick={() => setHours((h) => Math.max(0.5, h - 0.5))} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #E8E0D6', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>−</button>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, minWidth: '60px', textAlign: 'center' }}>{hours}h</span>
                    <button type="button" onClick={() => setHours((h) => Math.min(8, h + 0.5))} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #E8E0D6', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>+</button>
                    <span style={{ color: '#A89888', fontSize: '0.85rem' }}>S/ {getTotal()}</span>
                  </div>
                </div>
              )}
              <div>
                <label style={labelStyle}>Cantidad de sesiones</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button type="button" onClick={() => setSessionCount((c) => Math.max(1, c - 1))} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #E8E0D6', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>−</button>
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, minWidth: '30px', textAlign: 'center' }}>{sessionCount}</span>
                  <button type="button" onClick={() => setSessionCount((c) => Math.min(50, c + 1))} style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #E8E0D6', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>+</button>
                  {sessionCount > 1 && <span style={{ color: '#8B6520', fontSize: '0.8rem', fontWeight: 500 }}>Multi-sesión</span>}
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: '0.85rem', color: '#6B5B4E', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E8E0D6', paddingBottom: '0.5rem' }}>
              Datos del Cliente
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="Juan"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Apellido *</label>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="Pérez"
                  value={clientLastName}
                  onChange={(e) => setClientLastName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>DNI</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    style={{ ...inputStyle, paddingRight: dniLoading ? '2rem' : '0.75rem' }}
                    placeholder="45678912"
                    maxLength={15}
                    value={clientDni}
                    onChange={(e) => setClientDni(e.target.value)}
                    onBlur={handleDniBlur}
                  />
                  {dniLoading && (
                    <span style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#C9944A' }}>...</span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Teléfono *</label>
                <input
                  type="tel"
                  style={inputStyle}
                  placeholder="999888777"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Correo electrónico</label>
                <input
                  type="email"
                  style={inputStyle}
                  placeholder="correo@ejemplo.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Dirección</label>
                <input
                  type="text"
                  style={inputStyle}
                  placeholder="Av. Principal 123"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '0.5rem' }}>
              {sessionCount > 1 ? `Agendar ${sessionCount} Sesiones` : 'Agendar Cita'}
            </button>
          </form>

          {(selectedService || selectedPackage) && selectedDate && selectedTime && (
            <div style={{
              marginTop: '1.5rem', padding: '1rem 1.25rem', background: '#FDFBF7',
              border: '1px solid #E8E0D6', borderRadius: '12px',
            }}>
              <h4 style={{ fontSize: '0.8rem', color: '#A89888', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resumen</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem 1.5rem', fontSize: '0.82rem' }}>
                {selectedBranch && (
                  <>
                    <span style={{ color: '#A89888' }}>Sede</span>
                    <span style={{ color: '#3D2E24', fontWeight: 600 }}>
                      {branches.find((b) => String(b.id) === String(selectedBranch))?.name || 'N/A'}
                    </span>
                  </>
                )}
                {bookingType === 'service' && selectedService && (
                  <>
                    <span style={{ color: '#A89888' }}>Servicio</span>
                    <span style={{ color: '#3D2E24', fontWeight: 600 }}>
                      {services.find((s) => String(s.id) === String(selectedService))?.name || 'N/A'}
                    </span>
                  </>
                )}
                {bookingType === 'package' && selectedPackage && (
                  <>
                    <span style={{ color: '#A89888' }}>Paquete</span>
                    <span style={{ color: '#3D2E24', fontWeight: 600 }}>
                      {getSelectedPackageObj()?.name || 'N/A'}
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
                <span style={{ color: '#A89888' }}>Fecha</span>
                <span style={{ color: '#3D2E24', fontWeight: 600 }}>
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })} - {selectedTime}
                </span>
                <span style={{ color: '#A89888' }}>Sesiones</span>
                <span style={{ color: '#3D2E24', fontWeight: 600 }}>{sessionCount}</span>
                <span style={{ color: '#A89888' }}>Total</span>
                <span style={{ color: '#3D2E24', fontWeight: 700, fontSize: '0.95rem' }}>S/ {getTotal()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
