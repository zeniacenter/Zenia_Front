const CACHE_TTL = 60 * 1000;
const cache = new Map();

export const getCachedBusy = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.intervals;
};

export const setCachedBusy = (key, intervals) => {
  cache.set(key, { intervals, ts: Date.now() });
};

export const clearBusyCache = () => {
  cache.clear();
};
