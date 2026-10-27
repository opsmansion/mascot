// Protection for anonymous rendering: per-visitor rate limits, a cap on renders running at once,
// and a small cache so the same icon set is never drawn twice while it is still wanted.

export class BusyError extends Error {}

// At most `max` tasks run at once; up to `queue` more wait their turn, and the rest are refused.
export function gate(max, queue) {
  let active = 0;
  const waiting = [];
  return async (task) => {
    if (active < max) active++;
    else if (waiting.length >= queue) throw new BusyError("The server is busy.");
    else await new Promise((resolve) => waiting.push(resolve));
    try {
      return await task();
    } finally {
      // Hand the slot straight to the next waiting task, so new arrivals cannot jump the queue.
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}

// Fixed one-minute windows per key. Returns the seconds to wait, or 0 when the request may go ahead.
export function rateLimiter(perMinute, now = () => Date.now()) {
  const windows = new Map();
  const sweep = setInterval(() => {
    const cutoff = now() - 60_000;
    for (const [key, window] of windows) if (window.start < cutoff) windows.delete(key);
  }, 60_000);
  sweep.unref?.();
  return (key) => {
    const time = now();
    let window = windows.get(key);
    if (!window || time - window.start >= 60_000) windows.set(key, (window = { start: time, count: 0 }));
    if (window.count >= perMinute) return Math.ceil((window.start + 60_000 - time) / 1000);
    window.count++;
    return 0;
  };
}

// A least-recently-used cache of promises. Concurrent requests for the same key share one render,
// and a failed render is forgotten so the next request tries again.
export function cache(max) {
  const entries = new Map();
  return (key, make) => {
    if (entries.has(key)) {
      const hit = entries.get(key);
      entries.delete(key);
      entries.set(key, hit);
      return hit;
    }
    const pending = make();
    entries.set(key, pending);
    pending.catch(() => entries.get(key) === pending && entries.delete(key));
    while (entries.size > max) entries.delete(entries.keys().next().value);
    return pending;
  };
}
