import { useEffect } from 'react';

export function useClickOutside({
  isActiveRef = { current: true },
  ignoreRefs = [],
  ignoreIds = [],
  onOutsideClick,
  enabled = true,
}) {
  useEffect(() => {
    if (!enabled) return;

    const handleClick = (event) => {
      if (!isActiveRef.current) return;

      for (const ref of ignoreRefs) {
        const node = ref?.current;
        if (node?.contains?.(event.target)) return;
      }

      for (const id of ignoreIds) {
        if (event.target.closest(`#${id}`)) {
          return; // do NOT trigger outside-click
        }
      }

      onOutsideClick?.();
    };

    document.addEventListener('mousedown', handleClick, true);
    return () => {
      document.removeEventListener('mousedown', handleClick, true);
    };
  }, [enabled, ignoreRefs, onOutsideClick, isActiveRef]);
}
