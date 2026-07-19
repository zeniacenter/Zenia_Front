import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Sparkles, Gift, ArrowLeft, MapPin } from 'lucide-react';

const STEPS = [
  { number: 1, label: 'Tipo' },
  { number: 2, label: 'Servicio' },
  { number: 3, label: 'Terapeuta' },
  { number: 4, label: 'Cabina' },
  { number: 5, label: 'Sede' },
  { number: 6, label: 'Fecha' },
  { number: 7, label: 'Confirmar' },
];

export default function Booking() {
  const { services, therapists, cabins, packages, branches, addAppointment, settings } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const steps = STEPS.filter((s) => {
    if (!settings.cabinRequired && s.label === 'Cabina') return false;
    if (!settings.branchRequired && s.label === 'Sede') return false;
    return true;
  });

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState('forward');
  const [bookingType, setBookingType] = useState('');
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [selectedTherapist, setSelectedTherapist] = useState('');
  const [selectedCabin, setSelectedCabin] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [hours, setHours] = useState(1);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  useEffect(() => {
    const serviceId = searchParams.get('service');
    const packageId = searchParams.get('package');
    if (serviceId && services.length > 0) {
      const svc = services.find((s) => String(s.id) === String(serviceId));
      if (svc) {
        setBookingType('services');
        setSelectedServices([svc.id]);
        setHours(1);
        setStep(2);
      }
    } else if (packageId && packages.length > 0) {
      const pkg = packages.find((p) => String(p.id) === String(packageId));
      if (pkg) {
        setBookingType('packages');
        setSelectedPackage(pkg.id);
        setHours(pkg.hours);
        setSelectedServices(pkg.serviceIds || pkg.service_ids || []);
        setStep(2);
      }
    }
  }, [searchParams, services, packages]);

  const totalSteps = steps.length;

  const goNext = () => { setDirection('forward'); setStep((s) => Math.min(totalSteps, s + 1)); };
  const goBack = () => { setDirection('backward'); setStep((s) => Math.max(1, s - 1)); };

  const selectType = (type) => {
    setBookingType(type);
    setSelectedServices([]);
    setSelectedPackage(null);
    setHours(1);
    setDirection('forward');
    setStep(2);
  };

  const toggleService = (serviceId) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const selectPackageHandler = (pkg) => {
    setSelectedPackage(pkg.id);
    setHours(pkg.hours);
    setSelectedServices(pkg.serviceIds || pkg.service_ids || []);
  };

  const getTotalPrice = () => {
    if (bookingType === 'packages' && selectedPackage) {
      const pkg = packages.find((p) => p.id === selectedPackage);
      return pkg ? pkg.packagePrice || pkg.package_price : 0;
    }
    if (selectedServices.length === 0) return 0;
    const baseService = services.find((s) => s.id === selectedServices[0]);
    if (!baseService) return 0;
    const priceKey = hours <= 0.5 ? 'pricePerHalfHour' : 'pricePerHour';
    const price = baseService[priceKey] || baseService.price_per_hour || 30;
    return price * hours * selectedServices.length;
  };

  const getOriginalPrice = () => {
    if (bookingType === 'packages' && selectedPackage) {
      const pkg = packages.find((p) => p.id === selectedPackage);
      return pkg ? pkg.originalPrice || pkg.original_price : 0;
    }
    return getTotalPrice();
  };

  const getSelectedTherapistObj = () => therapists.find((t) => t.id === selectedTherapist);
  const getSelectedCabinObj = () => cabins.find((c) => c.id === selectedCabin);

  const getAvailableTimeSlots = () => {
    const therapist = getSelectedTherapistObj();
    if (!therapist || !selectedDate) return [];
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const dayName = dayNames[dateObj.getDay()];
    const slots = therapist.schedule[dayName] || [];
    if (selectedDate === today) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      return slots.filter((slot) => {
        const [h, m] = slot.split(':').map(Number);
        return h * 60 + m > currentMinutes;
      });
    }
    return slots;
  };

  const canProceed = () => {
    const currentStep = steps[step - 1];
    if (!currentStep) return false;
    switch (currentStep.label) {
      case 'Tipo': return bookingType !== '';
      case 'Servicio': return bookingType === 'packages' ? selectedPackage !== null : selectedServices.length > 0;
      case 'Terapeuta': return selectedTherapist !== '';
      case 'Cabina': return selectedCabin !== '';
      case 'Sede': return selectedBranch !== '';
      case 'Fecha': return selectedDate !== '' && selectedTime !== '';
      case 'Confirmar': return clientName.trim() !== '' && clientPhone.trim() !== '';
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    const payload = {
      client_name: clientName,
      client_phone: clientPhone,
      therapist_id: selectedTherapist,
      cabin_id: selectedCabin,
      branch_id: selectedBranch || null,
      service_ids: [...selectedServices],
      date: selectedDate,
      start_time: selectedTime,
      hours,
      total_price: getTotalPrice(),
      status: 'confirmada',
    };
    console.log('Enviando cita:', payload);
    try {
      await addAppointment(payload);
      navigate('/confirmacion', {
        state: {
          clientName,
          clientPhone,
          therapist: getSelectedTherapistObj()?.name,
          cabin: getSelectedCabinObj()?.name,
          services: selectedServices.map((id) => services.find((s) => s.id === id)?.name),
          packageName: bookingType === 'packages' ? packages.find((p) => p.id === selectedPackage)?.name : null,
          date: selectedDate,
          time: selectedTime,
          hours,
          total: getTotalPrice(),
          originalPrice: getOriginalPrice(),
        },
      });
    } catch (err) {
      console.error('Error al agendar:', err);
      alert('Error al agendar cita: ' + (err.response?.data?.message || err.message || 'Error desconocido'));
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const activePackages = packages.filter((p) => p.active ?? p.is_active);
  const hasSummaryData = step > 1 && (selectedServices.length > 0 || selectedPackage);

  return (
    <div className="wizard-page">
      <div className="wizard-stepper">
        {steps.map((s, i) => (
          <div key={s.number} className="stepper-item">
            <div className={`stepper-circle ${step === i + 1 ? 'active' : step > i + 1 ? 'completed' : ''}`}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={`stepper-label ${step === i + 1 ? 'active' : ''}`}>{s.label}</span>
            {i < steps.length - 1 && <div className={`stepper-line ${step > i + 1 ? 'completed' : ''}`} />}
          </div>
        ))}
      </div>

      <div className="wizard-body">
        <div className={`wizard-content ${direction}`}>
          {steps[step - 1]?.label === 'Tipo' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">¿Qué deseas reservar?</h2>
              <p className="wizard-step-subtitle">Elige entre servicios individuales o paquetes especiales</p>
              <div className="type-cards">
                <div className="type-card" onClick={() => selectType('services')}>
                  <div className="type-card-icon"><Sparkles size={32} /></div>
                  <h3>Servicios Individuales</h3>
                  <p>Selecciona uno o más servicios y personaliza la duración a tu medida</p>
                  <span className="type-card-price">Desde S/ 15</span>
                </div>
                <div className="type-card" onClick={() => selectType('packages')}>
                  <div className="type-card-icon"><Gift size={32} /></div>
                  <h3>Paquetes Especiales</h3>
                  <p>Combina servicios con precios especiales y ahorra hasta un 25%</p>
                  <span className="type-card-price">Ahorra hasta S/ 25</span>
                </div>
              </div>
            </div>
          )}

          {steps[step - 1]?.label === 'Servicio' && (
            <div className="wizard-step">
              {bookingType === 'services' ? (
                <>
                  <h2 className="wizard-step-title">Selecciona tus servicios</h2>
                  <p className="wizard-step-subtitle">Puedes elegir uno o varios servicios</p>
                  <div className="wizard-list">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className={`wizard-option ${selectedServices.includes(service.id) ? 'selected' : ''}`}
                        onClick={() => toggleService(service.id)}
                      >
                        <div className="wizard-option-check">
                          {selectedServices.includes(service.id) && '✓'}
                        </div>
                        {service.image ? (
                          <img src={service.image} alt={service.name} className="wizard-option-img" loading="lazy" />
                        ) : (
                          <div className="wizard-option-img wizard-option-img-fallback">✦</div>
                        )}
                        <div className="wizard-option-info">
                          <h4>{service.name}</h4>
                          <p>{service.description}</p>
                        </div>
                        {settings.priceVisible && (
                          <div className="wizard-option-price">
                            S/ {service.pricePerHour || service.price_per_hour}<span>/h</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {selectedServices.length > 0 && (
                    <div className="hours-section">
                      <h3>Duración</h3>
                      <div className="hours-selector">
                        <button type="button" onClick={() => setHours((h) => Math.max(0.5, h - 0.5))}>−</button>
                        <div className="hours-display">{hours} {hours === 1 ? 'hora' : 'horas'}</div>
                        <button type="button" onClick={() => setHours((h) => Math.min(8, h + 0.5))}>+</button>
                        <span className="hours-hint">(mín. 0.5h — máx. 8h)</span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className="wizard-step-title">Elige un paquete</h2>
                  <p className="wizard-step-subtitle">Precios especiales al combinar servicios</p>
                  <div className="wizard-list">
                    {activePackages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className={`wizard-option ${selectedPackage === pkg.id ? 'selected' : ''}`}
                        onClick={() => selectPackageHandler(pkg)}
                      >
                        <div className="wizard-option-check">
                          {selectedPackage === pkg.id && '✓'}
                        </div>
                        {pkg.image ? (
                          <img src={pkg.image} alt={pkg.name} className="wizard-option-img" loading="lazy" />
                        ) : (
                          <div className="wizard-option-img wizard-option-img-fallback">🎁</div>
                        )}
                        <div className="wizard-option-info">
                          <h4>{pkg.name}</h4>
                          <p>{pkg.description}</p>
                          <span className="wizard-option-meta">{pkg.hours}h · {(pkg.serviceIds || pkg.service_ids || []).length} servicios</span>
                        </div>
                        {settings.priceVisible && (
                          <div className="wizard-option-price-group">
                            <span className="wizard-option-original">S/ {pkg.originalPrice || pkg.original_price}</span>
                            <div className="wizard-option-price">S/ {pkg.packagePrice || pkg.package_price}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {steps[step - 1]?.label === 'Terapeuta' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Elige tu terapeuta</h2>
              <p className="wizard-step-subtitle">Todos nuestros profesionales están certificados</p>
              <div className="wizard-therapist-grid">
                {therapists.filter((t) => t.is_available ?? t.available).map((therapist) => (
                  <div
                    key={therapist.id}
                    className={`wizard-therapist ${selectedTherapist === therapist.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTherapist(therapist.id)}
                  >
                    {therapist.image ? (
                      <img src={therapist.image} alt={therapist.name} loading="lazy" />
                    ) : (
                      <div className="wizard-therapist-avatar-fallback">{therapist.name?.charAt(0)}</div>
                    )}
                    <h4>{therapist.name}</h4>
                    <p className="specialty">{therapist.specialty}</p>
                    <p className="experience">{therapist.experience}</p>
                    {selectedTherapist === therapist.id && (
                      <div className="wizard-therapist-check">✓</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {steps[step - 1]?.label === 'Cabina' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Elige tu cabina</h2>
              <p className="wizard-step-subtitle">Selecciona la cabina para tu sesión</p>
              <div className="wizard-therapist-grid">
                {cabins.filter((c) => c.is_available ?? c.available).map((cabin) => (
                  <div
                    key={cabin.id}
                    className={`wizard-therapist ${selectedCabin === cabin.id ? 'selected' : ''}`}
                    onClick={() => setSelectedCabin(cabin.id)}
                  >
                    {cabin.image && <img src={cabin.image} alt={cabin.name} />}
                    <h4>{cabin.name}</h4>
                    <p className="specialty">Capacidad: {cabin.capacity} {cabin.capacity === 1 ? 'persona' : 'personas'}</p>
                    <p className="experience">{cabin.description || 'Espacio de bienestar'}</p>
                    {selectedCabin === cabin.id && (
                      <div className="wizard-therapist-check">✓</div>
                    )}
                  </div>
                ))}
                {cabins.length === 0 && (
                  <div className="wizard-empty">No hay cabinas disponibles</div>
                )}
              </div>
            </div>
          )}

          {steps[step - 1]?.label === 'Sede' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Elige tu sede</h2>
              <p className="wizard-step-subtitle">Selecciona la ubicación de tu cita</p>
              <div className="wizard-therapist-grid">
                {branches.filter((b) => b.is_active).map((branch) => (
                  <div
                    key={branch.id}
                    className={`wizard-therapist ${selectedBranch === branch.id ? 'selected' : ''}`}
                    onClick={() => setSelectedBranch(branch.id)}
                  >
                    <div className="wizard-therapist-avatar">
                      <MapPin size={32} />
                    </div>
                    <h4>{branch.name}</h4>
                    {branch.address && <p className="specialty">{branch.address}</p>}
                    {branch.phone && <p className="experience">{branch.phone}</p>}
                    {selectedBranch === branch.id && (
                      <div className="wizard-therapist-check">✓</div>
                    )}
                  </div>
                ))}
                {branches.filter((b) => b.is_active).length === 0 && (
                  <div className="wizard-empty">No hay sedes disponibles</div>
                )}
              </div>
            </div>
          )}

          {/* PASO 6 - Fecha y Hora */}
          {steps[step - 1]?.label === 'Fecha' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Fecha y hora</h2>
              <p className="wizard-step-subtitle">Selecciona cuándo quieres tu cita</p>
              <div className="wizard-datetime">
                <div>
                  <label className="wizard-field-label">Fecha</label>
                  <input
                    type="date"
                    className="form-control wizard-date-input"
                    value={selectedDate}
                    min={today}
                    onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                  />
                </div>
                <div>
                  <label className="wizard-field-label">
                    Hora {selectedTherapist && selectedDate ? '' : '(Selecciona terapeuta y fecha primero)'}
                  </label>
                  {selectedTherapist && selectedDate ? (
                    <div className="wizard-time-grid">
                      {getAvailableTimeSlots().map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          className={`wizard-time-slot ${selectedTime === slot ? 'selected' : ''}`}
                          onClick={() => setSelectedTime(slot)}
                        >
                          {slot}
                        </button>
                      ))}
                      {getAvailableTimeSlots().length === 0 && (
                        <p className="wizard-empty">No hay horarios disponibles para este día</p>
                      )}
                    </div>
                  ) : (
                    <div className="wizard-time-placeholder">
                      <p>Primero selecciona un terapeuta y una fecha</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {steps[step - 1]?.label === 'Confirmar' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Tus datos</h2>
              <p className="wizard-step-subtitle">Completa tu información para confirmar la reserva</p>
              <div className="wizard-form-grid">
                <div className="form-group">
                  <label>Nombre completo</label>
                  <input type="text" className="form-control" placeholder="Ej: María García" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="tel" className="form-control" placeholder="999 888 777" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
                </div>
              </div>

              <div className="wizard-confirm-summary">
                <h3>Resumen de tu Reserva</h3>
                <div className="confirm-rows">
                  {bookingType === 'packages' && selectedPackage && (
                    <div className="confirm-row highlight">
                      <span>Paquete</span>
                      <span>{packages.find((p) => p.id === selectedPackage)?.name}</span>
                    </div>
                  )}
                  {settings.priceVisible && selectedServices.map((id) => {
                    const svc = services.find((s) => s.id === id);
                    return (
                      <div className="confirm-row" key={id}>
                        <span>{svc?.name}</span>
                        <span>S/ {hours <= 0.5 ? (svc?.pricePerHalfHour || svc?.price_per_half_hour) : (svc?.pricePerHour || svc?.price_per_hour) * hours}</span>
                      </div>
                    );
                  })}
                  {!settings.priceVisible && selectedServices.length > 0 && (
                    <div className="confirm-row">
                      <span>Servicios seleccionados</span>
                      <span>{selectedServices.length}</span>
                    </div>
                  )}
                  <div className="confirm-row"><span>Duración</span><span>{hours} {hours === 1 ? 'hora' : 'horas'}</span></div>
                  <div className="confirm-row"><span>Terapeuta</span><span>{getSelectedTherapistObj()?.name}</span></div>
                  {settings.cabinRequired && (
                    <div className="confirm-row"><span>Cabina</span><span>{getSelectedCabinObj()?.name}</span></div>
                  )}
                  {settings.branchRequired && selectedBranch && (
                    <div className="confirm-row"><span>Sede</span><span>{branches.find((b) => b.id === selectedBranch)?.name}</span></div>
                  )}
                  <div className="confirm-row"><span>Fecha</span><span>{selectedDate}</span></div>
                  <div className="confirm-row"><span>Hora</span><span>{selectedTime}</span></div>
                  {settings.priceVisible && (
                    <div className="confirm-row total">
                      <span>Total a pagar</span>
                      <span>S/ {getTotalPrice()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        {hasSummaryData && (
          <aside className="wizard-sidebar">
            <h3>Tu Reserva</h3>
            <div className="sidebar-rows">
              {bookingType === 'packages' && selectedPackage && (
                <div className="sidebar-row highlight">
                  <span className="sidebar-label">Paquete</span>
                  <span className="sidebar-value">{packages.find((p) => p.id === selectedPackage)?.name}</span>
                </div>
              )}
              {bookingType === 'services' && selectedServices.length > 0 && (
                <div className="sidebar-row">
                  <span className="sidebar-label">Servicios</span>
                  <div className="sidebar-value">
                    {selectedServices.map((id) => <div key={id}>{services.find((s) => s.id === id)?.name}</div>)}
                  </div>
                </div>
              )}
            {settings.priceVisible && step >= 2 && (selectedServices.length > 0 || selectedPackage) && (
                <div className="sidebar-row">
                  <span className="sidebar-label">Duración</span>
                  <span className="sidebar-value">{hours} {hours === 1 ? 'hora' : 'horas'}</span>
                </div>
              )}
              {step >= 3 && selectedTherapist && (
                <div className="sidebar-row">
                  <span className="sidebar-label">Terapeuta</span>
                  <span className="sidebar-value">{getSelectedTherapistObj()?.name}</span>
                </div>
              )}
              {settings.cabinRequired && step >= 4 && selectedCabin && (
                <div className="sidebar-row">
                  <span className="sidebar-label">Cabina</span>
                  <span className="sidebar-value">{getSelectedCabinObj()?.name}</span>
                </div>
              )}
              {settings.branchRequired && selectedBranch && (
                <div className="sidebar-row">
                  <span className="sidebar-label">Sede</span>
                  <span className="sidebar-value">{branches.find((b) => b.id === selectedBranch)?.name}</span>
                </div>
              )}
              {step >= 3 && selectedDate && (
                <div className="sidebar-row">
                  <span className="sidebar-label">Fecha</span>
                  <span className="sidebar-value">{selectedDate}</span>
                </div>
              )}
              {step >= 3 && selectedTime && (
                <div className="sidebar-row">
                  <span className="sidebar-label">Hora</span>
                  <span className="sidebar-value">{selectedTime}</span>
                </div>
              )}
            </div>
            {settings.priceVisible && step >= 2 && (selectedServices.length > 0 || selectedPackage) && (
              <div className="sidebar-total">
                <span>Total</span>
                <span className="sidebar-total-price">S/ {getTotalPrice()}</span>
              </div>
            )}
          </aside>
        )}
      </div>

      <div className="wizard-nav">
        {step > 1 ? (
          <button type="button" className="btn btn-secondary" onClick={goBack}><ArrowLeft size={16} /> Atrás</button>
        ) : <div />}
        {step < totalSteps ? (
          <button type="button" className="btn btn-primary btn-lg" disabled={!canProceed()} onClick={goNext}>Siguiente →</button>
        ) : (
          <button type="button" className="btn btn-primary btn-lg" disabled={!canProceed()} onClick={handleSubmit}>Confirmar Reserva</button>
        )}
      </div>
    </div>
  );
}
