import { useState, useEffect, useRef, useCallback } from 'react';
import { therapistsAPI } from '../services/api';

const BUSY_CACHE = {};

export default function TimeSlotPicker({
  therapistId,
  schedule,
  date,
  value,
  onChange,
  excludeAppointmentId = null,
  hours = 1,
  compact = false,
  disabled = false,
}) {
  const [busySlots, setBusySlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const fetchBusy = useCallback(async () => {
    if (!therapistId || !date) {
      setBusySlots([]);
      return;
    }
    const cacheKey = `${therapistId}_${date}${excludeAppointmentId ? `_ex${excludeAppointmentId}` : ''}`;
    if (BUSY_CACHE[cacheKey]) {
      setBusySlots(BUSY_CACHE[cacheKey]);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const res = await therapistsAPI.busySlots(therapistId, date, excludeAppointmentId);
      if (!controller.signal.aborted) {
        const slots = res.data.busy_slots || [];
        BUSY_CACHE[cacheKey] = slots;
        setBusySlots(slots);
      }
    } catch {
      if (!controller.signal.aborted) setBusySlots([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [therapistId, date, excludeAppointmentId]);

  useEffect(() => {
    fetchBusy();
  }, [fetchBusy]);

  const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const today = new Date().toISOString().split('T')[0];

  const getAvailableSlots = () => {
    if (!schedule || !date) return [];
    const dateObj = new Date(date + 'T12:00:00');
    const dayName = dayNames[dateObj.getDay()];
    const allSlots = schedule[dayName] || [];

    let available = allSlots.filter((slot) => !busySlots.includes(slot));

    if (date === today) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      available = available.filter((slot) => {
        const [h, m] = slot.split(':').map(Number);
        return h * 60 + m > currentMinutes;
      });
    }

    if (hours > 1) {
      available = available.filter((slot) => {
        const [h, m] = slot.split(':').map(Number);
        const slotStart = h * 60 + m;
        const slotEnd = slotStart + hours * 60;
        if (slotEnd > 24 * 60) return false;
        const endH = Math.floor(slotEnd / 60);
        const endM = slotEnd % 60;
        const endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        const lastSlot = allSlots[allSlots.length - 1] || '23:59';
        return endStr <= lastSlot;
      });
    }

    return available;
  };

  const available = getAvailableSlots();

  if (!therapistId || !date) {
    return (
      <div className="wizard-time-placeholder">
        <p style={{ fontSize: compact ? '0.7rem' : '0.8rem', color: '#A89888' }}>
          {therapistId ? 'Selecciona una fecha' : 'Selecciona un terapeuta y fecha'}
        </p>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div style={{ padding: compact ? '0.5rem' : '1rem', textAlign: 'center', color: '#A89888', fontSize: '0.8rem' }}>
        Cargando disponibilidad...
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: compact ? '0.5rem' : '1rem', textAlign: 'center', color: '#A89888', fontSize: '0.8rem' }}>
        Cargando horarios...
      </div>
    );
  }

  return (
    <div
      className="wizard-time-grid"
      style={{
        maxHeight: compact ? '100px' : '180px',
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: compact ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
        gap: compact ? '0.3rem' : '0.4rem',
      }}
    >
      {available.map((slot) => (
        <button
          key={slot}
          type="button"
          className={`wizard-time-slot ${value === slot ? 'selected' : ''}`}
          disabled={disabled}
          style={{
            fontSize: compact ? '0.7rem' : '0.8rem',
            padding: compact ? '0.3rem 0.4rem' : '0.45rem 0.6rem',
          }}
          onClick={() => onChange?.(slot)}
        >
          {slot}
        </button>
      ))}
      {available.length === 0 && (
        <p className="wizard-empty" style={{ gridColumn: '1 / -1', fontSize: '0.75rem' }}>
          No hay horarios disponibles para este día
        </p>
      )}
    </div>
  );
}
