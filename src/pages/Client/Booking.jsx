import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Sparkles, Gift, ArrowLeft, MapPin } from 'lucide-react';
import { personAPI } from '../../services/api';
import TimeSlotPicker from '../../components/TimeSlotPicker';

const BASE_STEPS = [
  { number: 1, label: 'Sede' },
  { number: 2, label: 'Tipo' },
];

const PICK_SERVICE_STEP = { number: 3, label: 'Servicios' };
const PICK_PACKAGE_STEP = { number: 3, label: 'Paquetes' };

const TAIL_STEPS = [
  { number: 4, label: 'Cabina' },
  { number: 5, label: 'Terapeuta' },
  { number: 6, label: 'Fecha' },
  { number: 7, label: 'Confirmar' },
];

function buildSteps(settings, bookingType) {
  const list = [...BASE_STEPS];
  if (bookingType === 'services') list.push(PICK_SERVICE_STEP);
  else if (bookingType === 'packages') list.push(PICK_PACKAGE_STEP);
  const tail = bookingType ? TAIL_STEPS : TAIL_STEPS.map((s) => ({ ...s, number: s.number - 1 }));
  return [...list, ...tail].filter((s) => {
    if (!settings.cabinRequired && s.label === 'Cabina') return false;
    if (!settings.branchRequired && s.label === 'Sede') return false;
    return true;
  });
}

export default function Booking() {
  const { services, therapists, cabins, packages, branches, addAppointment, settings } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
  const [serviceDurations, setServiceDurations] = useState({});
  const [sessionSchedules, setSessionSchedules] = useState([]);
  const [clientName, setClientName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientDni, setClientDni] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [sessionCount, setSessionCount] = useState(1);
  const [dniLoading, setDniLoading] = useState(false);

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

  const steps = buildSteps(settings, bookingType);
  const totalSteps = steps.length;

  const activeBranches = branches.filter((b) => b.is_active);

  const branchServices = selectedBranch
    ? services.filter((s) => {
        const branch = branches.find((b) => b.id === selectedBranch);
        if (!branch || !branch.serviceIds || branch.serviceIds.length === 0) return true;
        return branch.serviceIds.includes(s.id);
      })
    : services;

  const branchPackages = selectedBranch
    ? packages.filter((p) => {
        if (!(p.active ?? p.is_active)) return false;
        if (p.branchId && p.branchId !== selectedBranch) return false;
        return true;
      })
    : packages.filter((p) => p.active ?? p.is_active);

  const branchCabins = selectedBranch
    ? cabins.filter((c) => {
        if (c.branchId !== selectedBranch && c.branch_id !== selectedBranch) return false;
        return c.is_available ?? c.available;
      })
    : cabins.filter((c) => c.is_available ?? c.available);

  const branchTherapists = selectedBranch
    ? therapists.filter((t) => {
        if (!(t.is_available ?? t.available)) return false;
        if (!t.branchIds || t.branchIds.length === 0) return true;
        return t.branchIds.includes(selectedBranch);
      })
    : therapists.filter((t) => t.is_available ?? t.available);

  const cabinTherapists = selectedCabin
    ? branchTherapists.filter((t) => {
        const cabin = cabins.find((c) => c.id === selectedCabin);
        if (!cabin || !cabin.serviceIds || cabin.serviceIds.length === 0) return false;
        if (!t.serviceIds || t.serviceIds.length === 0) return false;
        return t.serviceIds.some((sid) => cabin.serviceIds.includes(sid));
      })
    : branchTherapists;

  const hasSummaryData = step > 1 && (selectedServices.length > 0 || selectedPackage);

  useEffect(() => {
    const serviceId = searchParams.get('service');
    const packageId = searchParams.get('package');
    if (serviceId && services.length > 0) {
      const svc = services.find((s) => String(s.id) === String(serviceId));
      if (svc) {
        setBookingType('services');
        setSelectedServices([svc.id]);
        setServiceDurations({ [svc.id]: 1 });
        if (!settings.branchRequired) {
          setStep(buildSteps(settings, 'services').findIndex((s) => s.label === 'Servicios') + 1);
        }
      }
    } else if (packageId && packages.length > 0) {
      const pkg = packages.find((p) => String(p.id) === String(packageId));
      if (pkg) {
        setBookingType('packages');
        setSelectedPackage(pkg.id);
        const pkgSessions = pkg.sessions || [];
        setSelectedServices(pkgSessions.map((s) => s.id));
        setServiceDurations(Object.fromEntries(pkgSessions.map((s) => [s.id, s.hours])));
        setSessionSchedules(pkgSessions.map(() => ({ date: '', time: '' })));
        if (!settings.branchRequired) {
          setStep(buildSteps(settings, 'packages').findIndex((s) => s.label === 'Paquetes') + 1);
        }
      }
    }
  }, [searchParams, services, packages, settings]);

  useEffect(() => {
    if (bookingType === 'services' && sessionCount > 1) {
      setSessionSchedules((prev) => {
        if (prev.length === sessionCount) return prev;
        const next = [];
        for (let i = 0; i < sessionCount; i++) {
          next.push(prev[i] || { date: '', time: '' });
        }
        return next;
      });
    } else if (bookingType === 'services' && sessionCount === 1) {
      setSessionSchedules([]);
    }
  }, [sessionCount, bookingType]);

  const goNext = () => { setDirection('forward'); setStep((s) => Math.min(totalSteps, s + 1)); };
  const goBack = () => { setDirection('backward'); setStep((s) => Math.max(1, s - 1)); };

  const selectBranch = (branchId) => {
    setSelectedBranch(branchId);
    setSelectedCabin('');
    setSelectedTherapist('');
    setDirection('forward');
    if (bookingType) {
      const idx = buildSteps(settings, bookingType).findIndex((s) => s.label === (bookingType === 'services' ? 'Servicios' : 'Paquetes'));
      setStep(idx >= 0 ? idx + 1 : 3);
    } else {
      setSelectedServices([]);
      setSelectedPackage(null);
      setServiceDurations({});
      setStep(2);
    }
  };

  const selectType = (type) => {
    setBookingType(type);
    setSelectedServices([]);
    setSelectedPackage(null);
    setServiceDurations({});
    setSessionCount(1);
    setDirection('forward');
    setStep(3);
  };

  const toggleService = (serviceId) => {
    setSelectedServices((prev) => {
      const next = prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId];
      setServiceDurations((d) => {
        const nd = { ...d };
        if (!next.includes(serviceId)) delete nd[serviceId];
        else if (!nd[serviceId]) nd[serviceId] = 1;
        return nd;
      });
      if (next.length > 0 && !prev.includes(serviceId)) {
        setTimeout(() => goNext(), 300);
      }
      return next;
    });
  };

  const selectPackageHandler = (pkg) => {
    setSelectedPackage(pkg.id);
    const sessions = pkg.sessions || [];
    setSelectedServices(sessions.map((s) => s.id));
    setServiceDurations(Object.fromEntries(sessions.map((s) => [s.id, s.hours])));
    setSessionSchedules(sessions.map(() => ({ date: '', time: '' })));
    setTimeout(() => goNext(), 300);
  };

  const selectCabin = (cabinId) => {
    setSelectedCabin(cabinId);
    setSelectedTherapist('');
    setDirection('forward');
    const idx = steps.findIndex((s) => s.label === 'Cabina');
    if (idx >= 0) setStep(idx + 1);
  };

  const getTotalPrice = () => {
    if (bookingType === 'packages' && selectedPackage) {
      const pkg = packages.find((p) => p.id === selectedPackage);
      return pkg ? pkg.packagePrice || pkg.package_price : 0;
    }
    if (selectedServices.length === 0) return 0;
    const base = selectedServices.reduce((sum, id) => {
      const svc = services.find((s) => s.id === id);
      if (!svc) return sum;
      const dur = serviceDurations[id] || 1;
      const priceKey = dur <= 0.5 ? 'pricePerHalfHour' : 'pricePerHour';
      const price = svc[priceKey] || svc.price_per_hour || 30;
      return sum + price * dur;
    }, 0);
    return bookingType === 'services' ? base * sessionCount : base;
  };

  const getTotalHours = () => {
    if (bookingType === 'packages' && selectedPackage) {
      return selectedServices.reduce((sum, id) => sum + (serviceDurations[id] || 1), 0);
    }
    const base = selectedServices.reduce((sum, id) => sum + (serviceDurations[id] || 1), 0);
    return bookingType === 'services' ? base * sessionCount : base;
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
  const getSelectedBranchObj = () => branches.find((b) => b.id === selectedBranch);

  const today = new Date().toISOString().split('T')[0];

  const canProceed = () => {
    const currentStep = steps[step - 1];
    if (!currentStep) return false;
    switch (currentStep.label) {
      case 'Sede': return selectedBranch !== '';
      case 'Tipo': return bookingType !== '';
      case 'Servicios': return selectedServices.length > 0;
      case 'Paquetes': return selectedPackage !== null;
      case 'Cabina': return selectedCabin !== '';
      case 'Terapeuta': return selectedTherapist !== '';
      case 'Fecha':
        if ((bookingType === 'packages' && sessionSchedules.length > 0) || (bookingType === 'services' && sessionCount > 1 && sessionSchedules.length > 0)) {
          return sessionSchedules.every((s) => s.date && s.time);
        }
        return selectedDate !== '' && selectedTime !== '';
      case 'Confirmar': return clientName.trim() !== '' && clientLastName.trim() !== '' && clientPhone.trim() !== '';
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;

    if (bookingType === 'packages' && sessionSchedules.length > 1) {
      const pkg = packages.find((p) => p.id === selectedPackage);
      const sessions = pkg?.sessions || [];
      try {
        for (let i = 0; i < sessions.length; i++) {
          const sched = sessionSchedules[i];
          const svcId = sessions[i].id;
          const hours = sessions[i].hours || 1;
          const svc = services.find((s) => s.id === svcId);
          const startMinutes = parseInt(sched.time.split(':')[0]) * 60 + parseInt(sched.time.split(':')[1]);
          const endMinutes = startMinutes + hours * 60;
          const endH = Math.floor(endMinutes / 60);
          const endM = endMinutes % 60;
          const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

          const price = svc ? (svc.pricePerHour || svc.price_per_hour || 0) * hours : 0;
          await addAppointment({
            client_name: clientName,
            client_last_name: clientLastName,
            client_dni: clientDni,
            client_address: clientAddress,
            client_phone: clientPhone,
            client_email: clientEmail,
            therapist_id: selectedTherapist,
            cabin_id: selectedCabin || null,
            branch_id: selectedBranch || null,
            package_id: selectedPackage,
            service_ids: [svcId],
            date: sched.date,
            start_time: sched.time,
            end_time: endTime,
            hours,
            total_price: price,
            status: 'confirmada',
          });
        }
        navigate('/confirmacion', {
          state: {
            clientName,
            clientLastName,
            clientDni,
            clientAddress,
            clientPhone,
            clientEmail,
            therapist: getSelectedTherapistObj()?.name,
            cabin: getSelectedCabinObj()?.name,
            branch: getSelectedBranchObj()?.name,
            services: selectedServices.map((id) => services.find((s) => s.id === id)?.name),
            packageName: pkg?.name,
            sessions: sessions.map((s, i) => ({
              name: services.find((svc) => svc.id === s.id)?.name,
              date: sessionSchedules[i].date,
              time: sessionSchedules[i].time,
              hours: s.hours,
            })),
            date: sessionSchedules.map((s) => s.date).join(', '),
            time: sessionSchedules.map((s) => s.time).join(', '),
            hours: getTotalHours(),
            total: getTotalPrice(),
            originalPrice: getOriginalPrice(),
          },
        });
      } catch (err) {
        console.error('Error al agendar:', err);
        alert('Error al agendar cita: ' + (err.response?.data?.message || err.message || 'Error desconocido'));
      }
      return;
    }

    if (bookingType === 'services' && sessionCount > 1 && sessionSchedules.length > 0) {
      const svcId = selectedServices[0];
      const svc = services.find((s) => s.id === svcId);
      const dur = serviceDurations[svcId] || 1;
      const pricePerSession = svc ? (dur <= 0.5 ? (svc.pricePerHalfHour || svc.price_per_half_hour || 0) : (svc.pricePerHour || svc.price_per_hour || 0) * dur) : 0;
      try {
        for (let i = 0; i < sessionCount; i++) {
          const sched = sessionSchedules[i];
          const startMinutes = parseInt(sched.time.split(':')[0]) * 60 + parseInt(sched.time.split(':')[1]);
          const endMinutes = startMinutes + dur * 60;
          const endH = Math.floor(endMinutes / 60);
          const endM = endMinutes % 60;
          const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
          await addAppointment({
            client_name: clientName,
            client_last_name: clientLastName,
            client_dni: clientDni,
            client_address: clientAddress,
            client_phone: clientPhone,
            client_email: clientEmail,
            therapist_id: selectedTherapist,
            cabin_id: selectedCabin || null,
            branch_id: selectedBranch || null,
            service_ids: [svcId],
            date: sched.date,
            start_time: sched.time,
            end_time: endTime,
            hours: dur,
            total_price: pricePerSession,
            session_count: sessionCount,
            session_number: i + 1,
            status: 'confirmada',
          });
        }
        navigate('/confirmacion', {
          state: {
            clientName,
            clientLastName,
            clientDni,
            clientAddress,
            clientPhone,
            clientEmail,
            therapist: getSelectedTherapistObj()?.name,
            cabin: getSelectedCabinObj()?.name,
            branch: getSelectedBranchObj()?.name,
            services: [svc?.name],
            sessions: sessionSchedules.map((sched, i) => ({
              name: svc?.name,
              date: sched.date,
              time: sched.time,
              hours: dur,
            })),
            date: sessionSchedules.map((s) => s.date).join(', '),
            time: sessionSchedules.map((s) => s.time).join(', '),
            hours: getTotalHours(),
            total: getTotalPrice(),
            originalPrice: getOriginalPrice(),
          },
        });
      } catch (err) {
        console.error('Error al agendar:', err);
        alert('Error al agendar cita: ' + (err.response?.data?.message || err.message || 'Error desconocido'));
      }
      return;
    }

    const payload = {
      client_name: clientName,
      client_last_name: clientLastName,
      client_dni: clientDni,
      client_address: clientAddress,
      client_phone: clientPhone,
      client_email: clientEmail,
      therapist_id: selectedTherapist,
      cabin_id: selectedCabin || null,
      branch_id: selectedBranch || null,
      package_id: bookingType === 'packages' ? selectedPackage : null,
      service_ids: [...selectedServices],
      date: selectedDate,
      start_time: selectedTime,
      hours: getTotalHours(),
      service_durations: { ...serviceDurations },
      total_price: getTotalPrice(),
      session_count: bookingType === 'services' ? sessionCount : 1,
      status: 'confirmada',
    };
    try {
      await addAppointment(payload);
      navigate('/confirmacion', {
        state: {
          clientName,
          clientLastName,
          clientDni,
          clientAddress,
          clientPhone,
          clientEmail,
          therapist: getSelectedTherapistObj()?.name,
          cabin: getSelectedCabinObj()?.name,
          branch: getSelectedBranchObj()?.name,
          services: selectedServices.map((id) => services.find((s) => s.id === id)?.name),
          packageName: bookingType === 'packages' ? packages.find((p) => p.id === selectedPackage)?.name : null,
          date: selectedDate,
          time: selectedTime,
          hours: getTotalHours(),
          total: getTotalPrice(),
          originalPrice: getOriginalPrice(),
        },
      });
    } catch (err) {
      console.error('Error al agendar:', err);
      alert('Error al agendar cita: ' + (err.response?.data?.message || err.message || 'Error desconocido'));
    }
  };

  return (
    <div className="wizard-page">
      <div className="wizard-stepper">
        {steps.map((s, i) => (
          <div key={`${s.label}-${i}`} className="stepper-item">
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
          {steps[step - 1]?.label === 'Sede' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Elige tu sede</h2>
              <p className="wizard-step-subtitle">Selecciona la ubicación de tu cita</p>
              <div className="wizard-therapist-grid">
                {activeBranches.map((branch) => (
                  <div
                    key={branch.id}
                    className={`wizard-therapist ${selectedBranch === branch.id ? 'selected' : ''}`}
                    onClick={() => selectBranch(branch.id)}
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
                {activeBranches.length === 0 && (
                  <div className="wizard-empty">No hay sedes disponibles</div>
                )}
              </div>
            </div>
          )}

          {steps[step - 1]?.label === 'Tipo' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">¿Qué deseas reservar?</h2>
              <p className="wizard-step-subtitle">
                Elige entre servicios individuales o paquetes especiales
                {getSelectedBranchObj() && <span> en <strong>{getSelectedBranchObj()?.name}</strong></span>}
              </p>
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

          {steps[step - 1]?.label === 'Servicios' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Selecciona tus servicios</h2>
              <p className="wizard-step-subtitle">
                Elige uno o más servicios
                {getSelectedBranchObj() && <span> en <strong>{getSelectedBranchObj()?.name}</strong></span>}
              </p>
              <div className="wizard-list">
                {branchServices.map((service) => (
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
                {branchServices.length === 0 && (
                  <div className="wizard-empty">No hay servicios disponibles en esta sede</div>
                )}
              </div>
            </div>
          )}

          {steps[step - 1]?.label === 'Paquetes' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Elige un paquete</h2>
              <p className="wizard-step-subtitle">
                Paquetes con precios especiales
                {getSelectedBranchObj() && <span> en <strong>{getSelectedBranchObj()?.name}</strong></span>}
              </p>
              <div className="wizard-list">
                {branchPackages.map((pkg) => (
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
                      <span className="wizard-option-meta">{pkg.hours}h · {(pkg.sessions || []).length} sesiones</span>
                    </div>
                    {settings.priceVisible && (
                      <div className="wizard-option-price-group">
                        <span className="wizard-option-original">S/ {pkg.originalPrice || pkg.original_price}</span>
                        <div className="wizard-option-price">S/ {pkg.packagePrice || pkg.package_price}</div>
                      </div>
                    )}
                  </div>
                ))}
                {branchPackages.length === 0 && (
                  <div className="wizard-empty">No hay paquetes disponibles en esta sede</div>
                )}
              </div>
            </div>
          )}

          {steps[step - 1]?.label === 'Cabina' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Elige tu cabina</h2>
              <p className="wizard-step-subtitle">Selecciona la cabina para tu sesión</p>
              <div className="wizard-therapist-grid">
                {branchCabins.map((cabin) => (
                  <div
                    key={cabin.id}
                    className={`wizard-therapist ${selectedCabin === cabin.id ? 'selected' : ''}`}
                    onClick={() => selectCabin(cabin.id)}
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
                {branchCabins.length === 0 && (
                  <div className="wizard-empty">No hay cabinas disponibles en esta sede</div>
                )}
              </div>
            </div>
          )}

          {steps[step - 1]?.label === 'Terapeuta' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Elige tu terapeuta</h2>
              <p className="wizard-step-subtitle">Todos nuestros profesionales están certificados</p>
              <div className="wizard-therapist-grid">
                {cabinTherapists.map((therapist) => (
                  <div
                    key={therapist.id}
                    className={`wizard-therapist ${selectedTherapist === therapist.id ? 'selected' : ''}`}
                    onClick={() => { setSelectedTherapist(therapist.id); setTimeout(() => goNext(), 300); }}
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
                {cabinTherapists.length === 0 && (
                  <div className="wizard-empty">No hay terapeutas disponibles</div>
                )}
              </div>
            </div>
          )}

          {steps[step - 1]?.label === 'Fecha' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Fecha y hora</h2>
              <p className="wizard-step-subtitle">
                {(bookingType === 'packages' && sessionSchedules.length > 1) || (bookingType === 'services' && sessionCount > 1)
                  ? 'Selecciona la fecha y hora para cada sesión'
                  : 'Selecciona cuándo quieres tu cita'}
              </p>
              {(bookingType === 'packages' && sessionSchedules.length > 1) || (bookingType === 'services' && sessionCount > 1) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {sessionSchedules.map((sched, idx) => {
                    const sessionName = bookingType === 'packages'
                      ? (() => { const pkg = packages.find((p) => p.id === selectedPackage); const sessions = pkg?.sessions || []; return services.find((s) => s.id === sessions[idx]?.id)?.name || `Sesión ${idx + 1}`; })()
                      : selectedServices.map((id) => services.find((s) => s.id === id)?.name)[0] || `Sesión ${idx + 1}`;
                    const sessionHours = bookingType === 'packages'
                      ? (() => { const pkg = packages.find((p) => p.id === selectedPackage); const sessions = pkg?.sessions || []; return sessions[idx]?.hours || 1; })()
                      : (() => { const svcId = selectedServices[0]; return serviceDurations[svcId] || 1; })();
                    const therapist = getSelectedTherapistObj();
                    return (
                      <div key={idx} style={{
                        padding: '1rem', borderRadius: '12px',
                        border: '1px solid #E8E0D6', background: '#FDFCFA',
                      }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#3D2E24', marginBottom: '0.75rem' }}>
                          Sesión {idx + 1}: {sessionName}
                          <span style={{ fontWeight: 400, color: '#A89888', marginLeft: '0.5rem' }}>({sessionHours}h)</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div>
                            <label className="wizard-field-label">Fecha</label>
                            <input
                              type="date"
                              className="form-control wizard-date-input"
                              value={sched.date}
                              min={today}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                setSessionSchedules((prev) => {
                                  const next = [...prev];
                                  next[idx] = { date: newDate, time: '' };
                                  return next;
                                });
                              }}
                            />
                          </div>
                          <div>
                            <label className="wizard-field-label">
                              Hora {sched.date ? '' : '(Selecciona fecha primero)'}
                            </label>
                            {sched.date ? (
                              <TimeSlotPicker
                                therapistId={selectedTherapist}
                                schedule={therapist?.schedule}
                                date={sched.date}
                                value={sched.time}
                                hours={sessionHours}
                                compact
                                onChange={(slot) => {
                                  setSessionSchedules((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], time: slot };
                                    return next;
                                  });
                                }}
                              />
                            ) : (
                              <div className="wizard-time-placeholder">
                                <p style={{ fontSize: '0.75rem' }}>Selecciona fecha</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
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
                      <TimeSlotPicker
                        therapistId={selectedTherapist}
                        schedule={getSelectedTherapistObj()?.schedule}
                        date={selectedDate}
                        value={selectedTime}
                        hours={getTotalHours()}
                        onChange={setSelectedTime}
                      />
                    ) : (
                      <div className="wizard-time-placeholder">
                        <p>Primero selecciona un terapeuta y una fecha</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {steps[step - 1]?.label === 'Confirmar' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Tus datos</h2>
              <p className="wizard-step-subtitle">Completa tu información para confirmar la reserva</p>
              <div className="wizard-form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input type="text" className="form-control" placeholder="María" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Apellido *</label>
                  <input type="text" className="form-control" placeholder="García" value={clientLastName} onChange={(e) => setClientLastName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>DNI {dniLoading && <span style={{ fontSize: '0.75rem', color: '#8B6520' }}>Buscando...</span>}</label>
                  <input type="text" className="form-control" placeholder="45678912" maxLength={15} value={clientDni} onChange={(e) => setClientDni(e.target.value)} onBlur={handleDniBlur} />
                </div>
                <div className="form-group">
                  <label>Dirección</label>
                  <input type="text" className="form-control" placeholder="Av. Principal 123" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Teléfono *</label>
                  <input type="tel" className="form-control" placeholder="999 888 777" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Correo electrónico</label>
                  <input type="email" className="form-control" placeholder="maria@email.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                </div>
              </div>

              <div className="wizard-confirm-summary">
                <h3>Resumen de tu Reserva</h3>
                <div className="confirm-rows">
                  {selectedBranch && (
                    <div className="confirm-row"><span>Sede</span><span>{getSelectedBranchObj()?.name}</span></div>
                  )}
                  {bookingType === 'packages' && selectedPackage && (
                    <div className="confirm-row highlight">
                      <span>Paquete</span>
                      <span>{packages.find((p) => p.id === selectedPackage)?.name}</span>
                    </div>
                  )}
                  {bookingType === 'packages' && settings.priceVisible && (() => {
                    const grouped = {};
                    selectedServices.forEach((id) => {
                      if (!grouped[id]) grouped[id] = { count: 0, hours: serviceDurations[id] || 1 };
                      grouped[id].count++;
                    });
                    return Object.entries(grouped).map(([id, g]) => {
                      const svc = services.find((s) => s.id === Number(id));
                      return (
                        <div className="confirm-row" key={id}>
                          <span>{svc?.name} ×{g.count} ({g.hours}h c/u)</span>
                          <span></span>
                        </div>
                      );
                    });
                  })()}
                  {bookingType === 'services' && settings.priceVisible && selectedServices.map((id) => {
                    const svc = services.find((s) => s.id === id);
                    const dur = serviceDurations[id] || 1;
                    return (
                      <div className="confirm-row" key={id}>
                        <span>{svc?.name} ({dur}h)</span>
                        <span>S/ {dur <= 0.5 ? (svc?.pricePerHalfHour || svc?.price_per_half_hour) : (svc?.pricePerHour || svc?.price_per_hour) * dur}</span>
                      </div>
                    );
                  })}
                  {bookingType === 'services' && sessionCount > 1 && (
                    <div className="confirm-row">
                      <span>Sesiones</span>
                      <span>{sessionCount} × {sessionCount === 1 ? 'sesión' : 'sesiones'}</span>
                    </div>
                  )}
                  {!settings.priceVisible && selectedServices.length > 0 && (
                    <div className="confirm-row">
                      <span>Servicios seleccionados</span>
                      <span>{selectedServices.length}</span>
                    </div>
                  )}
                  <div className="confirm-row"><span>Duración total</span><span>{getTotalHours()} {getTotalHours() === 1 ? 'hora' : 'horas'}</span></div>
                  {selectedCabin && (
                    <div className="confirm-row"><span>Cabina</span><span>{getSelectedCabinObj()?.name}</span></div>
                  )}
                  <div className="confirm-row"><span>Terapeuta</span><span>{getSelectedTherapistObj()?.name}</span></div>
                  {(bookingType === 'packages' || (bookingType === 'services' && sessionCount > 1)) && sessionSchedules.length > 1 ? (
                    sessionSchedules.map((sched, idx) => (
                      <div key={idx} className="confirm-row">
                        <span>Sesión {idx + 1}</span>
                        <span>{sched.date} {sched.time}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="confirm-row"><span>Fecha</span><span>{selectedDate}</span></div>
                      <div className="confirm-row"><span>Hora</span><span>{selectedTime}</span></div>
                    </>
                  )}
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

        {hasSummaryData && (
          <aside className="wizard-sidebar">
            <h3>Tu Reserva</h3>
            <div className="sidebar-rows">
              {selectedBranch && (
                <div className="sidebar-row">
                  <span className="sidebar-label">Sede</span>
                  <span className="sidebar-value">{getSelectedBranchObj()?.name}</span>
                </div>
              )}
              {bookingType === 'packages' && selectedPackage && (
                <div className="sidebar-row highlight">
                  <span className="sidebar-label">Paquete</span>
                  <div className="sidebar-value">
                    <div>{packages.find((p) => p.id === selectedPackage)?.name}</div>
                    {(() => {
                      const grouped = {};
                      selectedServices.forEach((id) => {
                        if (!grouped[id]) grouped[id] = { count: 0, hours: serviceDurations[id] || 1 };
                        grouped[id].count++;
                      });
                      return Object.entries(grouped).map(([id, g]) => {
                        const svc = services.find((s) => s.id === Number(id));
                        return (
                          <div key={id} className="sidebar-service-item">
                            <span>{svc?.name} ×{g.count}</span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--land-text-muted)' }}>{g.hours}h c/u</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
              {bookingType === 'services' && selectedServices.length > 0 && (
                <>
                  <div className="sidebar-row">
                    <span className="sidebar-label">Servicios</span>
                    <div className="sidebar-value">
                      {selectedServices.map((id) => {
                        const svc = services.find((s) => s.id === id);
                        const dur = serviceDurations[id] || 1;
                        return (
                          <div key={id} className="sidebar-service-item">
                            <span>{svc?.name}</span>
                            <div className="sidebar-duration-controls">
                              <button
                                type="button"
                                onClick={() => setServiceDurations((d) => ({ ...d, [id]: Math.max(0.5, (d[id] || 1) - 0.5) }))}
                                style={{
                                  width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #E8E0D6',
                                  background: '#fff', color: '#3D2E24', cursor: 'pointer', display: 'flex',
                                  alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, padding: 0,
                                }}
                              >−</button>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem', minWidth: '40px', textAlign: 'center' }}>
                                {dur}h
                              </span>
                              <button
                                type="button"
                                onClick={() => setServiceDurations((d) => ({ ...d, [id]: Math.min(8, (d[id] || 1) + 0.5) }))}
                                style={{
                                  width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #E8E0D6',
                                  background: '#fff', color: '#3D2E24', cursor: 'pointer', display: 'flex',
                                  alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, padding: 0,
                                }}
                              >+</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="sidebar-row">
                    <span className="sidebar-label">Sesiones</span>
                    <div className="sidebar-value">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setSessionCount((c) => Math.max(1, c - 1))}
                          style={{
                            width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #E8E0D6',
                            background: '#fff', color: '#3D2E24', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, padding: 0,
                          }}
                        >−</button>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', minWidth: '30px', textAlign: 'center' }}>{sessionCount}</span>
                        <button
                          type="button"
                          onClick={() => setSessionCount((c) => Math.min(50, c + 1))}
                          style={{
                            width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #E8E0D6',
                            background: '#fff', color: '#3D2E24', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600, padding: 0,
                          }}
                        >+</button>
                        {sessionCount > 1 && <span style={{ color: '#8B6520', fontSize: '0.78rem', fontWeight: 500 }}>Multi-sesión</span>}
                      </div>
                    </div>
                  </div>
                </>
              )}
              {selectedCabin && (
                <div className="sidebar-row">
                  <span className="sidebar-label">Cabina</span>
                  <span className="sidebar-value">{getSelectedCabinObj()?.name}</span>
                </div>
              )}
              {selectedTherapist && (
                <div className="sidebar-row">
                  <span className="sidebar-label">Terapeuta</span>
                  <span className="sidebar-value">{getSelectedTherapistObj()?.name}</span>
                </div>
              )}
              {((bookingType === 'packages' || (bookingType === 'services' && sessionCount > 1)) && sessionSchedules.length > 1 && sessionSchedules.some((s) => s.date)) ? (
                sessionSchedules.map((sched, idx) => {
                  if (!sched.date) return null;
                  const svcName = bookingType === 'packages'
                    ? (() => { const pkg = packages.find((p) => p.id === selectedPackage); const sessions = pkg?.sessions || []; return services.find((s) => s.id === sessions[idx]?.id)?.name; })()
                    : services.find((s) => s.id === selectedServices[0])?.name;
                  return (
                    <div key={idx} className="sidebar-row">
                      <span className="sidebar-label">Sesión {idx + 1}</span>
                      <span className="sidebar-value" style={{ fontSize: '0.78rem', textAlign: 'right' }}>
                        {svcName && <div style={{ fontWeight: 600 }}>{svcName}</div>}
                        {sched.date} {sched.time}
                      </span>
                    </div>
                  );
                })
              ) : (
                <>
                  {selectedDate && (
                    <div className="sidebar-row">
                      <span className="sidebar-label">Fecha</span>
                      <span className="sidebar-value">{selectedDate}</span>
                    </div>
                  )}
                  {selectedTime && (
                    <div className="sidebar-row">
                      <span className="sidebar-label">Hora</span>
                      <span className="sidebar-value">{selectedTime}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            {settings.priceVisible && (selectedServices.length > 0 || selectedPackage) && (
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
