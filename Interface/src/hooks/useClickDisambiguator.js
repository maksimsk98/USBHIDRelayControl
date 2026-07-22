// useClickDisambiguator.js
import { useRef, useCallback } from 'react';

export default function useClickDisambiguator(delay = 200) {
  const t = useRef(null);

  const onSingle = useCallback((fn, { stop = true } = {}) => (e) => {
    if (stop) e.stopPropagation();
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => { t.current = null; fn?.(e); }, delay);
  }, [delay]);

  const onDouble = useCallback((fn, { stop = true } = {}) => (e) => {
    if (t.current) clearTimeout(t.current);
    if (stop) e.stopPropagation();
    t.current = null;
    fn?.(e);
  }, []);

  return { onSingle, onDouble };
}
