import { useEffect, useMemo, useState } from 'react';
import { therapistsAPI } from '../services/api';
import { minToHhmm, therapistSlotsForDay, todayStr } from '../utils/hours';

const toMinutes = (value) => {
  const [hours, minutes] = String(value || '').slice(0, 5).split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

export default function UnionSlotPicker({
  therapists,
  date,
  hours = 1,
  value,
  onChange,
  compact = false,
  disabled = false,
  emptyText = 'No hay horarios disponibles para este día',
  availableHours = null,
}) {
  const [busyByTherapist, setBusyByTherapist] = useState(null);
  const therapistKey = Array.isArray(therapists)
    ? therapists.map((therapist) => therapist.id).join(',')
    : '';

  useEffect(() => {
    let cancelled = false;

    if (!date || !Array.isArray(therapists) || therapists.length === 0) {
      setBusyByTherapist({});
      return () => { cancelled = true; };
    }

    setBusyByTherapist(null);
    Promise.all(therapists.map(async (therapist) => {
      try {
        const res = await therapistsAPI.busySlots(therapist.id, date);
        let intervals = res.data.busy_intervals || [];
        if (intervals.length === 0 && res.data.busy_slots?.length) {
          intervals = res.data.busy_slots.map((slot) => ({
            start: slot,
            end: minToHhmm(toMinutes(slot) + 30),
          }));
        }
        return [therapist.id, intervals];
      } catch {
        return [therapist.id, null];
      }
    })).then((entries) => {
      if (!cancelled) setBusyByTherapist(new Map(entries));
    });

    return () => { cancelled = true; };
  }, [date, therapistKey]);

  const slots = useMemo(() => {
    if (!date || !Array.isArray(therapists) || therapists.length === 0 || busyByTherapist === null) return [];
    const duration = Math.max(30, Math.round(hours * 60));
    const list = new Set();
    therapists.forEach((therapist) => {
      const busyIntervals = busyByTherapist.get(therapist.id);
      if (busyIntervals === null) return;
      therapistSlotsForDay({ schedule: therapist.schedule, date, durationMin: duration, today: todayStr() })
        .filter((start) => {
          const end = start + duration;
          return !busyIntervals.some((interval) => (
            start < toMinutes(interval.end) && toMinutes(interval.start) < end
          ));
        })
        .forEach((start) => list.add(minToHhmm(start)));
    });
    let availableSlots = [...list].sort();
    if (availableHours instanceof Set) {
      availableSlots = availableSlots.filter((s) => availableHours.has(s));
    }
    return availableSlots;
  }, [therapists, date, hours, availableHours, busyByTherapist]);

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
      {busyByTherapist === null ? (
        <p className="wizard-empty" style={{ gridColumn: '1 / -1', fontSize: '0.75rem' }}>
          Buscando horarios disponibles...
        </p>
      ) : slots.map((slot) => (
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
          {emptyText}
        </p>
      )}
    </div>
  );
}