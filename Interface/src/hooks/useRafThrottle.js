import { useCallback, useEffect, useRef } from 'react';

export function useRafThrottle() {
  const rafRef = useRef(0);
  const queuedRef = useRef(null);

  const schedule = useCallback((fn) => {
    queuedRef.current = fn;
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const cb = queuedRef.current;
      queuedRef.current = null;
      if (cb) cb();
    });
  }, []);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  return schedule;
}
