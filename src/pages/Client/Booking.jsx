import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Sparkles, Gift, ArrowLeft, MapPin } from 'lucide-react';
import { personAPI, appointmentsAPI } from '../../services/api';
import UnionSlotPicker from '../../components/UnionSlotPicker';
import NotificationModal from '../../components/NotificationModal';
import { clearBusyCache } from '../../utils/busyCache';
import { formatHours, getPackageHours, hoursToMinutes, todayStr, minToHhmm, therapistSlotsForDay } from '../../utils/hours';

const BASE_STEPS = [
  { number: 1, label: 'Sede' },
  { number: 2, label: 'Tipo' },
];

const PICK_SERVICE_STEP = { number: 3, label: 'Servicios' };
const PICK_PACKAGE_STEP = { number: 3, label: 'Paquetes' };

const TAIL_STEPS = [
  { number: 4, label: 'Fecha' },
  { number: 5, label: 'Terapeuta' },
  { number: 6, label: 'Confirmar' },
];

function buildSteps(settings, bookingType) {
  const list = [...BASE_STEPS];
  if (bookingType === 'services') list.push(PICK_SERVICE_STEP);
  else if (bookingType === 'packages') list.push(PICK_PACKAGE_STEP);
  const tail = bookingType ? TAIL_STEPS : TAIL_STEPS.map((s) => ({ ...s, number: s.number - 1 }));
  return [...list, ...tail].filter((s) => {
    if (!settings.branchRequired && s.label === 'Sede') return false;
    return true;
  });
}

const toMin = (hhmm) => {
  const [h, m] = String(hhmm || '').slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const fmtDur = (hoursFloat) => {
  const mins = Math.round((Number(hoursFloat) || 0) * 60);
  const H = Math.floor(mins / 60);
  const M = mins % 60;
  if (H && M) return `${H}h ${M}m`;
  if (H) return `${H}h`;
  return `${M}m`;
};

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
  const [submitting, setSubmitting] = useState(false);
  const [notify, setNotify] = useState(null);
  const [availableTherapists, setAvailableTherapists] = useState([]);
  const [therapistLoading, setTherapistLoading] = useState(false);
  const [slotWarning, setSlotWarning] = useState('');

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

  const selectedServiceIds = selectedServices.length > 0
    ? selectedServices.map(Number)
    : [];

  const isCabinCompatible = (c) => {
    const ids = (c.serviceIds || []).map(Number);
    if (ids.length === 0) return false;
    if (selectedServiceIds.length === 0) return true;
    return selectedServiceIds.some((sid) => ids.includes(sid));
  };

  const branchCabins = (selectedBranch
    ? cabins.filter((c) => {
      if (c.branchId !== selectedBranch && c.branch_id !== selectedBranch) return false;
      return c.is_available ?? c.available;
    })
    : cabins.filter((c) => c.is_available ?? c.available)).filter(isCabinCompatible);

  const branchTherapists = selectedBranch
    ? therapists.filter((t) => {
      if (!(t.is_available ?? t.available)) return false;
      if (!t.branchIds || t.branchIds.length === 0) return true;
      return t.branchIds.includes(selectedBranch);
    })
    : therapists.filter((t) => t.is_available ?? t.available);

  const serviceTherapists = selectedServices.length > 0
    ? branchTherapists.filter((t) => {
      if (!t.serviceIds || t.serviceIds.length === 0) return false;
      return t.serviceIds.some((sid) => selectedServices.includes(sid));
    })
    : branchTherapists;

  const wizardTherapists = serviceTherapists;

  const isMulti =
    (bookingType === 'packages' && sessionSchedules.length > 1) ||
    (bookingType === 'services' && sessionCount > 1 && sessionSchedules.length > 0);

  const sessionHoursFor = (idx) => {
    if (bookingType === 'packages') {
      const pkg = packages.find((p) => p.id === selectedPackage);
      return pkg?.sessions?.[idx]?.hours || 1;
    }
    const svcId = selectedServices[0];
    return serviceDurations[svcId] || 1;
  };

  const singleSessionWithTime =
    selectedDate !== '' && selectedTime !== '' &&
    (bookingType === 'packages' ? sessionSchedules.length <= 1 : sessionCount <= 1);

  useEffect(() => {
    setSelectedCabin('');
  }, [selectedDate, selectedTime, bookingType, selectedServices, selectedPackage]);

  useEffect(() => {
    if (!singleSessionWithTime || !selectedDate || !selectedTime) return;
    const durMin = Math.round(getTotalHours() * 60);
    const endMins = Math.min(23 * 60 + 59, toMin(selectedTime) + Math.max(durMin, 30));
    const endTime = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
    let cancelled = false;
    appointmentsAPI.slotAvailability({ date: selectedDate, start: selectedTime, end: endTime })
      .then((res) => {
        if (cancelled) return;
        const busy = new Set((res.data.cabin_ids || []).map(Number));
        const free = branchCabins.find((c) => !busy.has(Number(c.id)));
        if (free) setSelectedCabin(free.id);
      })
      .catch(() => { });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedTime, bookingType, sessionCount, singleSessionWithTime, selectedServices]);

  const hasSummaryData = step > 1 && (selectedServices.length > 0 || selectedPackage);

  useEffect(() => {
    const serviceId = searchParams.get('service');
    const packageId = searchParams.get('package');
    if (serviceId && services.length > 0) {
      const svc = services.find((s) => String(s.id) === String(serviceId));
      if (svc) {
        setBookingType('services');
        setSelectedServices([svc.id]);
        setServiceDurations({ [svc.id]: svc.durationMin ? svc.durationMin / 60 : 1 });
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

  useEffect(() => {
    if (selectedTherapist && selectedServices.length > 0) {
      const t = therapists.find((th) => th.id === selectedTherapist);
      if (t && t.serviceIds && t.serviceIds.length > 0) {
        const hasMatch = t.serviceIds.some((sid) => selectedServices.includes(sid));
        if (!hasMatch) {
          setSelectedTherapist('');
          setSelectedDate('');
          setSelectedTime('');
        }
      }
    }
  }, [selectedServices, selectedTherapist, therapists]);

  const pickTimeSlot = async ({ date, time, hours, apply }) => {
    setSlotWarning('');
    const durMin = Math.max(30, Math.round(hours * 60));
    const endMins = toMin(time) + durMin;
    const endTime = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
    try {
      const res = await appointmentsAPI.slotAvailability({ date, start: time, end: endTime });
      const busy = new Set((res.data.therapist_ids || []).map(Number));
      const stillFree = wizardTherapists.some((t) =>
        !busy.has(Number(t.id)) &&
        therapistSlotsForDay({ schedule: t.schedule, date, durationMin: durMin, today: todayStr() })
          .map(minToHhmm)
          .includes(time)
      );
      if (!stillFree) {
        setSlotWarning('No hay terapeutas disponibles a esa hora, elige otra.');
        return;
      }
    } catch {
      // si la verificación falla, se permite elegir igualmente
    }
    apply(time);
    setSelectedTherapist('');
  };

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
    const label = type === 'services' ? 'Servicios' : 'Paquetes';
    const idx = buildSteps(settings, type).findIndex((s) => s.label === label);
    setStep(idx >= 0 ? idx + 1 : 2);
  };

  const toggleService = (serviceId) => {
    setSelectedServices((prev) => {
      const next = prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId];
      setServiceDurations((d) => {
        const nd = { ...d };
        if (!next.includes(serviceId)) delete nd[serviceId];
        else if (!nd[serviceId]) {
          const svc = services.find((s) => s.id === serviceId);
          nd[serviceId] = svc && svc.durationMin ? svc.durationMin / 60 : 1;
        }
        return nd;
      });
      if (next.length === 1 && !prev.includes(serviceId)) {
        setTimeout(() => {
          setStep((s) => (steps[s - 1]?.label === 'Servicios' && s < totalSteps ? s + 1 : s));
        }, 300);
      }
      return next;
    });
  };

  const selectPackageHandler = (pkg) => {
    setSelectedPackage(pkg.id);
    const sessions = (pkg.sessions || []).filter((s) => s && typeof s === 'object');
    setSelectedServices(sessions.map((s) => s.id));
    setServiceDurations(Object.fromEntries(sessions.map((s) => [s.id, s.hours])));
    setSessionSchedules(sessions.map(() => ({ date: '', time: '' })));
    setTimeout(() => {
      setStep((s) => (steps[s - 1]?.label === 'Paquetes' && s < totalSteps ? s + 1 : s));
    }, 300);
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
      return sum + (svc.pricePerHour || svc.price_per_hour || 0);
    }, 0);
    return bookingType === 'services' ? base * sessionCount : base;
  };

  const getTotalHours = () => {
    if (bookingType === 'packages' && selectedPackage) {
      const pkg = packages.find((p) => p.id === selectedPackage);
      if (pkg) return getPackageHours(pkg);
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

  const sessionsKey = isMulti
    ? sessionSchedules.map((s, i) => `${s.date}|${s.time}|${sessionHoursFor(i)}`).join(',')
    : `${selectedDate}|${selectedTime}|${getTotalHours()}`;

  useEffect(() => {
    if (steps[step - 1]?.label !== 'Terapeuta') return;
    let cancelled = false;
    const run = async () => {
      const sessions = isMulti
        ? sessionSchedules.map((s, i) => ({ date: s.date, time: s.time, hours: sessionHoursFor(i) }))
        : [{ date: selectedDate, time: selectedTime, hours: getTotalHours() }];
      if (sessions.some((s) => !s.date || !s.time)) {
        setAvailableTherapists([]);
        return;
      }
      setTherapistLoading(true);
      try {
        const busy = new Set();
        for (const s of sessions) {
          const durMin = Math.max(30, Math.round(s.hours * 60));
          const endMins = toMin(s.time) + durMin;
          const endTime = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
          const res = await appointmentsAPI.slotAvailability({ date: s.date, start: s.time, end: endTime });
          (res.data.therapist_ids || []).forEach((id) => busy.add(Number(id)));
        }
        if (cancelled) return;
        const durations = sessions.map((s) => Math.max(30, Math.round(s.hours * 60)));
        const free = wizardTherapists.filter((t) => {
          if (busy.has(Number(t.id))) return false;
          return sessions.every((s, i) =>
            therapistSlotsForDay({ schedule: t.schedule, date: s.date, durationMin: durations[i], today: todayStr() })
              .map(minToHhmm)
              .includes(s.time)
          );
        });
        setAvailableTherapists(free);
      } catch {
        if (!cancelled) setAvailableTherapists([]);
      } finally {
        if (!cancelled) setTherapistLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, sessionsKey]);

  const today = todayStr();

  const canProceed = () => {
    const currentStep = steps[step - 1];
    if (!currentStep) return false;
    switch (currentStep.label) {
      case 'Sede': return selectedBranch !== '';
      case 'Tipo': return bookingType !== '';
      case 'Servicios': return selectedServices.length > 0;
      case 'Paquetes': return selectedPackage !== null;
      case 'Terapeuta': return selectedTherapist !== '' && availableTherapists.some((t) => t.id === selectedTherapist);
      case 'Fecha':
        if (isMulti) {
          return !!sessionSchedules[0]?.date && !!sessionSchedules[0]?.time;
        }
        return selectedDate !== '' && selectedTime !== '';
      case 'Confirmar': return clientName.trim() !== '' && clientLastName.trim() !== '' && clientPhone.trim() !== '';
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!canProceed() || submitting) return;
    setSubmitting(true);

    if (bookingType === 'packages') {
      const pkg = packages.find((p) => p.id === selectedPackage);
      const sessions = pkg?.sessions || [];
      const totalPkgSessions = sessions.length || 1;

      // Filtrar las sesiones que el cliente haya llenado con fecha y hora
      const scheduledSessions = [];
      sessionSchedules.forEach((s, i) => {
        if (s?.date && s?.time) {
          scheduledSessions.push({
            date: s.date,
            time: s.time,
            hours: sessions[i]?.hours || 1,
            service_id: sessions[i]?.id || (selectedServices[0] || null),
            name: services.find((svc) => svc.id === sessions[i]?.id)?.name || `Sesión ${i + 1}`,
          });
        }
      });

      if (scheduledSessions.length === 0) {
        setNotify({ type: 'warning', title: 'Falta fecha y hora', message: 'Debes seleccionar fecha y hora al menos para tu primera sesión.' });
        setSubmitting(false);
        return;
      }

      try {
        const first = scheduledSessions[0];
        const payload = {
          client_name: clientName,
          client_last_name: clientLastName,
          client_dni: clientDni,
          client_address: clientAddress,
          client_phone: clientPhone,
          client_email: clientEmail,
          therapist_id: selectedTherapist,
          cabin_id: selectedCabin || branchCabins[0]?.id || null,
          branch_id: selectedBranch || null,
          package_id: selectedPackage,
          service_ids: selectedServices,
          date: first.date,
          start_time: first.time,
          hours: first.hours || getTotalHours(),
          total_price: getTotalPrice(),
          session_count: totalPkgSessions,
          status: 'confirmada',
          sessions: scheduledSessions.map((s) => ({
            date: s.date,
            time: s.time,
            hours: s.hours,
            service_id: s.service_id,
          })),
        };

        await addAppointment(payload);
        clearBusyCache();

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
            totalSessions: totalPkgSessions,
            pendingSessions: Math.max(0, totalPkgSessions - scheduledSessions.length),
            sessions: scheduledSessions,
            date: scheduledSessions.map((s) => s.date).join(', '),
            time: scheduledSessions.map((s) => s.time).join(', '),
            hours: getTotalHours(),
            total: getTotalPrice(),
            originalPrice: getOriginalPrice(),
          },
        });
      } catch (err) {
        console.error('Error al agendar:', err);
        setNotify({ type: 'error', title: 'Error al agendar cita', message: (err.response?.data?.message || err.message || 'Error desconocido') });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (bookingType === 'services' && sessionCount > 1) {
      const svcId = selectedServices[0];
      const svc = services.find((s) => s.id === svcId);
      const dur = serviceDurations[svcId] || 1;

      const scheduledSessions = [];
      sessionSchedules.forEach((s, i) => {
        if (s?.date && s?.time) {
          scheduledSessions.push({
            date: s.date,
            time: s.time,
            hours: dur,
            service_id: svcId,
            name: svc?.name || `Sesión ${i + 1}`,
          });
        }
      });

      if (scheduledSessions.length === 0) {
        setNotify({ type: 'warning', title: 'Falta fecha y hora', message: 'Debes seleccionar fecha y hora al menos para tu primera sesión.' });
        setSubmitting(false);
        return;
      }

      try {
        const first = scheduledSessions[0];
        const payload = {
          client_name: clientName,
          client_last_name: clientLastName,
          client_dni: clientDni,
          client_address: clientAddress,
          client_phone: clientPhone,
          client_email: clientEmail,
          therapist_id: selectedTherapist,
          cabin_id: selectedCabin || branchCabins[0]?.id || null,
          branch_id: selectedBranch || null,
          service_ids: [svcId],
          date: first.date,
          start_time: first.time,
          hours: dur,
          total_price: getTotalPrice(),
          session_count: sessionCount,
          status: 'confirmada',
          sessions: scheduledSessions.map((s) => ({
            date: s.date,
            time: s.time,
            hours: s.hours,
            service_id: s.service_id,
          })),
        };

        await addAppointment(payload);
        clearBusyCache();

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
            totalSessions: sessionCount,
            pendingSessions: Math.max(0, sessionCount - scheduledSessions.length),
            sessions: scheduledSessions,
            date: scheduledSessions.map((s) => s.date).join(', '),
            time: scheduledSessions.map((s) => s.time).join(', '),
            hours: getTotalHours(),
            total: getTotalPrice(),
            originalPrice: getOriginalPrice(),
          },
        });
      } catch (err) {
        console.error('Error al agendar:', err);
        setNotify({ type: 'error', title: 'Error al agendar cita', message: (err.response?.data?.message || err.message || 'Error desconocido') });
      } finally {
        setSubmitting(false);
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
      cabin_id: selectedCabin || branchCabins[0]?.id || null,
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
      clearBusyCache();
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
      setNotify({ type: 'error', title: 'Error al agendar cita', message: (err.response?.data?.message || err.message || 'Error desconocido') });
    } finally {
      setSubmitting(false);
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
                  <p>Selecciona uno o más servicios para tu cita</p>
                  <span className="type-card-price">Desde S/ 45</span>
                </div>
                <div className="type-card" onClick={() => selectType('packages')}>
                  <div className="type-card-icon"><Gift size={32} /></div>
                  <h3>Paquetes Especiales</h3>
                  <p>Combina servicios con precios especiales y ahorra hasta un 25%</p>
                  <span className="type-card-price">Ahorra hasta un 37%</span>
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
                        S/ {service.pricePerHour || service.price_per_hour}
                        <span> / {fmtDur((service.durationMin ?? 60) / 60)}</span>
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
                      <span className="wizard-option-meta">{formatHours(getPackageHours(pkg))} h · {(pkg.sessions || []).length} sesiones</span>
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

          {steps[step - 1]?.label === 'Terapeuta' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Elige tu terapeuta</h2>
              <p className="wizard-step-subtitle">
                Profesionales disponibles para la fecha y hora que elegiste
              </p>
              {therapistLoading ? (
                <p className="wizard-empty">Buscando terapeutas disponibles...</p>
              ) : availableTherapists.length > 0 ? (
                <div className="wizard-therapist-grid">
                  {availableTherapists.map((therapist) => (
                    <div
                      key={therapist.id}
                      className={`wizard-therapist ${selectedTherapist === therapist.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedTherapist(therapist.id);
                        setTimeout(() => {
                          setStep((s) => (steps[s - 1]?.label === 'Terapeuta' && s < totalSteps ? s + 1 : s));
                        }, 300);
                      }}
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
              ) : (
                <div className="wizard-empty">
                  No hay terapeutas disponibles para la fecha y hora elegidas.
                  <br />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginTop: '0.75rem' }}
                    onClick={goBack}
                  >
                    Volver a elegir fecha y hora
                  </button>
                </div>
              )}
            </div>
          )}

          {steps[step - 1]?.label === 'Fecha' && (
            <div className="wizard-step">
              <h2 className="wizard-step-title">Fecha y hora</h2>
              <p className="wizard-step-subtitle">
                {isMulti
                  ? 'Selecciona fecha y hora para tu 1ª sesión (las siguientes son opcionales y podrás coordinarlas después)'
                  : 'Selecciona cuándo quieres tu cita'}
              </p>
              {wizardTherapists.length === 0 && (
                <div className="wizard-empty" style={{ marginBottom: '1rem' }}>
                  No hay terapeutas para los servicios y sede elegidos
                </div>
              )}
              {isMulti ? (
                <>
                  <div style={{
                    padding: '0.75rem 1rem', borderRadius: '10px', background: '#FDF6E9',
                    border: '1px solid #E8E0D6', marginBottom: '1.25rem', color: '#8B6520', fontSize: '0.83rem',
                  }}>
                    💡 <strong>Tu reserva incluye {sessionSchedules.length} sesiones.</strong> Agenda tu <strong>1ª sesión</strong> hoy. Las siguientes sesiones puedes programarlas ahora o dejarlas para agendarse después según tu disponibilidad.
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {sessionSchedules.map((sched, idx) => {
                      const sessionName = bookingType === 'packages'
                        ? (() => { const pkg = packages.find((p) => p.id === selectedPackage); const sessions = pkg?.sessions || []; return services.find((s) => s.id === sessions[idx]?.id)?.name || `Sesión ${idx + 1}`; })()
                        : selectedServices.map((id) => services.find((s) => s.id === id)?.name)[0] || `Sesión ${idx + 1}`;
                      const sessionHours = sessionHoursFor(idx);
                      const isScheduled = !!sched.date && !!sched.time;
                      return (
                        <div key={idx} style={{
                          padding: '1rem', borderRadius: '12px',
                          border: isScheduled || idx === 0 ? '1px solid #E8E0D6' : '1.5px dashed #D6C8B8',
                          background: '#FDFCFA',
                        }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#3D2E24', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.3rem' }}>
                            <div>
                              Sesión {idx + 1}: {sessionName}
                              <span style={{ fontWeight: 400, color: '#A89888', marginLeft: '0.5rem' }}>({formatHours(sessionHours)} h)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{
                                fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px',
                                background: idx === 0 ? '#E8F5E9' : (isScheduled ? '#E8F5E9' : '#F5EDE5'),
                                color: idx === 0 ? '#2D7A3A' : (isScheduled ? '#2D7A3A' : '#8B6520'),
                              }}>
                                {idx === 0 ? '1ª Sesión (Requerida)' : (isScheduled ? 'Agendada' : 'Opcional')}
                              </span>
                              {idx > 0 && (sched.date || sched.time) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSessionSchedules((prev) => {
                                      const next = [...prev];
                                      next[idx] = { date: '', time: '' };
                                      return next;
                                    });
                                  }}
                                  style={{
                                    background: 'none', border: 'none', color: '#A89888',
                                    fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline', padding: 0,
                                  }}
                                >
                                  Dejar para después
                                </button>
                              )}
                            </div>
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
                                  setSlotWarning('');
                                  setSelectedTherapist('');
                                }}
                              />
                            </div>
                            <div>
                              <label className="wizard-field-label">
                                Hora {sched.date ? '' : '(Selecciona fecha primero)'}
                              </label>
                              {sched.date ? (
                                <UnionSlotPicker
                                  therapists={wizardTherapists}
                                  date={sched.date}
                                  hours={sessionHours}
                                  value={sched.time}
                                  compact
                                  onChange={(slot) => pickTimeSlot({
                                    date: sched.date,
                                    time: slot,
                                    hours: sessionHours,
                                    apply: (time) => {
                                      setSessionSchedules((prev) => {
                                        const next = [...prev];
                                        next[idx] = { ...next[idx], time };
                                        return next;
                                      });
                                    },
                                  })}
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
                  {slotWarning && (
                    <p style={{ fontSize: '0.75rem', color: '#B85C4C', marginTop: '0.75rem' }}>
                      {slotWarning}
                    </p>
                  )}
                </>
              ) : (
                <div className="wizard-datetime">
                  <div>
                    <label className="wizard-field-label">Fecha</label>
                    <input
                      type="date"
                      className="form-control wizard-date-input"
                      value={selectedDate}
                      min={today}
                      onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(''); setSlotWarning(''); setSelectedTherapist(''); }}
                    />
                  </div>
                  <div>
                    <label className="wizard-field-label">
                      Hora {selectedDate ? '' : '(Selecciona fecha primero)'}
                    </label>
                    {!selectedDate ? (
                      <div className="wizard-time-placeholder">
                        <p>Primero selecciona una fecha</p>
                      </div>
                    ) : (
                      <UnionSlotPicker
                        therapists={wizardTherapists}
                        date={selectedDate}
                        hours={getTotalHours()}
                        value={selectedTime}
                        onChange={(slot) => pickTimeSlot({
                          date: selectedDate,
                          time: slot,
                          hours: getTotalHours(),
                          apply: setSelectedTime,
                        })}
                      />
                    )}
                    {slotWarning && (
                      <p style={{ fontSize: '0.75rem', color: '#B85C4C', marginTop: '0.5rem' }}>
                        {slotWarning}
                      </p>
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
                  <label>DNI {dniLoading && <span style={{ fontSize: '0.75rem', color: '#8B6520' }}>Buscando...</span>}</label>
                  <input type="text" className="form-control" placeholder="45678912" maxLength={15} value={clientDni} onChange={(e) => setClientDni(e.target.value)} onBlur={handleDniBlur} />
                </div>
                <div className="form-group">
                  <label>Nombre *</label>
                  <input type="text" className="form-control" placeholder="María" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Apellido *</label>
                  <input type="text" className="form-control" placeholder="García" value={clientLastName} onChange={(e) => setClientLastName(e.target.value)} required />
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
                          <span>{svc?.name} ×{g.count} ({formatHours(g.hours)} h c/u)</span>
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
                        <span>{svc?.name} ({fmtDur(dur)})</span>
                        <span>S/ {svc?.pricePerHour || svc?.price_per_hour || 0}</span>
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
                  <div className="confirm-row"><span>Duración total</span><span>{formatHours(getTotalHours())} h</span></div>
                  {(bookingType === 'packages' || (bookingType === 'services' && sessionCount > 1)) && sessionSchedules.length > 1 ? (
                    sessionSchedules.map((sched, idx) => (
                      <div key={idx} className="confirm-row">
                        <span>Sesión {idx + 1}</span>
                        <span>{sched.date && sched.time ? `${sched.date} ${sched.time}` : 'Por coordinar después'}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="confirm-row"><span>Fecha</span><span>{selectedDate}</span></div>
                      <div className="confirm-row"><span>Hora</span><span>{selectedTime}</span></div>
                    </>
                  )}
                  {selectedCabin && (
                    <div className="confirm-row"><span>Cabina</span><span>{getSelectedCabinObj()?.name} (automática)</span></div>
                  )}
                  <div className="confirm-row"><span>Terapeuta</span><span>{getSelectedTherapistObj()?.name}</span></div>
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
                            <span style={{ fontSize: '0.78rem', color: 'var(--land-text-muted)' }}>{formatHours(g.hours)} h c/u</span>
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
                            <span style={{ fontSize: '0.78rem', color: 'var(--land-text-muted)' }}>{fmtDur(dur)}</span>
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
              {selectedCabin && (
                <div className="sidebar-row">
                  <span className="sidebar-label">Cabina</span>
                  <span className="sidebar-value">{getSelectedCabinObj()?.name} (auto)</span>
                </div>
              )}
              {selectedTherapist && (
                <div className="sidebar-row">
                  <span className="sidebar-label">Terapeuta</span>
                  <span className="sidebar-value">{getSelectedTherapistObj()?.name}</span>
                </div>
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
          <button
            type="button"
            className={`btn btn-primary btn-lg ${submitting ? 'is-loading' : ''}`}
            disabled={submitting || !canProceed()}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <span className="btn-spinner" aria-hidden="true" /> Confirmando...
              </>
            ) : (
              'Confirmar Reserva'
            )}
          </button>
        )}
      </div>

      <NotificationModal
        open={!!notify}
        type={notify?.type || 'info'}
        title={notify?.title || ''}
        message={notify?.message || ''}
        onClose={() => setNotify(null)}
      />
    </div>
  );
}
