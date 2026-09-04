import { useState, useEffect, useRef, useCallback } from 'react';
import { therapistsAPI } from '../services/api';
import { getCachedBusy, setCachedBusy } from '../utils/busyCache';
import Skeleton from './Skeleton';

const SkeletonSlots = ({ compact }) => (
  <div
    className="wizard-time-grid"
    style={{
      display: 'grid',
      gridTemplateColumns: compact ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)',
      gap: compact ? '0.3rem' : '0.4rem',
      overflow: 'hidden',
    }}
  >
    {Array.from({ length: 8 }).map((_, i) => (
      <Skeleton key={i} height={compact ? '30px' : '36px'} radius="8px" />
    ))}
  </div>
);

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

const toTimeString = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

export default function TimeSlotPicker({
  therapistId,
  schedule,
  date,
  value,
  onChange,
  excludeAppointmentId = null,
  available = true,
  hours = 1,
  compact = false,
  disabled = false,
}) {
  const [busyIntervals, setBusyIntervals] = useState([]);
  const [remoteSlots, setRemoteSlots] = useState(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);
  const availabilityAbortRef = useRef(null);

  const fetchBusy = useCallback(async () => {
    if (!therapistId || !date) {
      setBusyIntervals([]);
      return;
    }
    const cacheKey = `${therapistId}_${date}${excludeAppointmentId ? `_ex${excludeAppointmentId}` : ''}`;
    const cached = getCachedBusy(cacheKey);
    if (cached) {
      setBusyIntervals(cached);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const res = await therapistsAPI.busySlots(therapistId, date, excludeAppointmentId);
      if (!controller.signal.aborted) {
        let entries = res.data.busy_intervals || [];
        if (entries.length === 0 && res.data.busy_slots?.length) {
          entries = res.data.busy_slots.map((slot) => {
            const start = toMinutes(slot);
            return {
              start: slot,
              end: `${String(Math.floor((start + 30) / 60)).padStart(2, '0')}:${String((start + 30) % 60).padStart(2, '0')}`,
            };
          });
        }
        setCachedBusy(cacheKey, entries);
        setBusyIntervals(entries);
      }
    } catch {
      if (!controller.signal.aborted) setBusyIntervals([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [therapistId, date, excludeAppointmentId]);

  useEffect(() => {
    fetchBusy();
  }, [fetchBusy]);

  const needsRemoteSchedule = !schedule;

  useEffect(() => {
    if (!needsRemoteSchedule || !therapistId || !date) {
      setRemoteSlots(null);
      return;
    }
    if (availabilityAbortRef.current) availabilityAbortRef.current.abort();
    const controller = new AbortController();
    availabilityAbortRef.current = controller;
    setLoading(true);
    therapistsAPI.availability(therapistId, date, { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) setRemoteSlots(res.data.available_slots || []);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRemoteSlots([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [needsRemoteSchedule, therapistId, date]);

  useEffect(() => () => {
    if (availabilityAbortRef.current) availabilityAbortRef.current.abort();
  }, []);

  const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const today = new Date().toISOString().split('T')[0];

  const getAvailableSlots = () => {
    if (!date) return [];
    if (!schedule && remoteSlots === null) return [];

    let marks;
    if (schedule) {
      const dateObj = new Date(date + 'T12:00:00');
      const dayName = dayNames[dateObj.getDay()];
      marks = (schedule[dayName] || []).map(toMinutes);
    } else {
      marks = (remoteSlots || []).map(toMinutes);
    }

    if (marks.length === 0) return [];

    const duration = Math.round(hours * 60);
    const step = Math.max(5, gcd(duration, 60));
    const sorted = [...marks].sort((a, b) => a - b);

    const blocks = [];
    let blockStart = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      const m = sorted[i];
      if (m - prev > 60) {
        blocks.push([blockStart, prev + 60]);
        blockStart = m;
      }
      prev = m;
    }
    blocks.push([blockStart, prev + 60]);

    const candidates = new Set();
    blocks.forEach(([bs, be]) => {
      for (let t = bs; t < be - duration + 1; t += step) {
        candidates.add(t);
      }
    });

    const isToday = date === today;
    const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    return [...candidates]
      .filter((start) => {
        const end = start + duration;
        if (isToday && start <= currentMinutes) return false;
        return !busyIntervals.some(
          (interval) => start < toMinutes(interval.end) && toMinutes(interval.start) < end
        );
      })
      .sort((a, b) => a - b)
      .map(toTimeString);
  };

  if (available === false) {
    return (
      <div style={{ padding: compact ? '0.5rem' : '1rem', textAlign: 'center', color: '#A89888', fontSize: compact ? '0.7rem' : '0.8rem' }}>
        Terapeuta no disponible
      </div>
    );
  }

  if (!date || (!therapistId && !schedule)) {
    return (
      <div className="wizard-time-placeholder">
        <p style={{ fontSize: compact ? '0.7rem' : '0.8rem', color: '#A89888' }}>
          {!date ? 'Selecciona una fecha' : 'Selecciona un terapeuta'}
        </p>
      </div>
    );
  }

  if (!schedule && remoteSlots === null) {
    return <SkeletonSlots compact={compact} />;
  }

  if (loading) {
    return <SkeletonSlots compact={compact} />;
  }

  const slots = getAvailableSlots();

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
      {slots.map((slot) => (
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
      {slots.length === 0 && (
        <p className="wizard-empty" style={{ gridColumn: '1 / -1', fontSize: '0.75rem' }}>
          No hay horarios disponibles para este día
        </p>
      )}
    </div>
  );
}
