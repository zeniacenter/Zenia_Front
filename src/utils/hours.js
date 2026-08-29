export function buildHourRange(startStr, endStr) {
  const toHour = (s) => {
    const h = parseInt(String(s || '').slice(0, 2), 10);
    return Number.isFinite(h) ? h : null;
  };
  let start = toHour(startStr);
  let end = toHour(endStr);
  if (start === null) start = 8;
  if (end === null) end = 19;
  if (end < start) [start, end] = [end, start];
  const lo = Math.max(0, start);
  const hi = Math.min(23, end);
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

export function formatHour(h) {
  return `${String(h).padStart(2, '0')}:00`;
}

export function formatDuration(hoursFloat) {
  const totalMin = Math.round((Number(hoursFloat) || 0) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
