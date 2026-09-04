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

export function buildSlotOptions(startStr, endStr) {
  const toMin = (s) => {
    const parts = String(s || '').slice(0, 5).split(':').map(Number);
    if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
    return parts[0] * 60 + parts[1];
  };
  let start = toMin(startStr);
  let end = toMin(endStr);
  if (start === null) start = 8 * 60;
  if (end === null) end = 19 * 60;
  if (end <= start) [start, end] = [end, start];
  const maxStart = Math.min(23 * 60 + 30, end - 60);
  const opts = [];
  for (let t = Math.max(0, start); t <= maxStart; t += 30) {
    opts.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
  }
  return opts;
}

export function formatDuration(hoursFloat) {
  const totalMin = Math.round((Number(hoursFloat) || 0) * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}
