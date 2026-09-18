import { useMemo } from 'react';
import { unionSlotsForTherapists, minToHhmm, todayStr } from '../utils/hours';

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
  const slots = useMemo(() => {
    if (!date || !Array.isArray(therapists) || therapists.length === 0) return [];
    const duration = Math.max(30, Math.round(hours * 60));
    let list = unionSlotsForTherapists(therapists, date, duration, todayStr()).map(minToHhmm);
    if (availableHours instanceof Set) {
      list = list.filter((s) => availableHours.has(s));
    }
    return list;
  }, [therapists, date, hours, availableHours]);

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
          {emptyText}
        </p>
      )}
    </div>
  );
}