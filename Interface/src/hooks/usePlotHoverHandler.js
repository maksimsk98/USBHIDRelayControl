import {
  useEffect, useRef, useMemo, useCallback,
} from 'react';
import _ from 'lodash';

export const useCustomHoverHandlers = (timeUnit) => {
  const tooltipRef = useRef(null);

  // --------------------------
  // 1) Создаём tooltip-призрак
  // --------------------------
  useEffect(() => {
    const div = document.createElement('div');

    Object.assign(div.style, {
      position: 'fixed',
      pointerEvents: 'none',
      background: 'rgba(0,0,0,0.85)',
      color: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '0.8rem',
      zIndex: 9999,
      display: 'none',
      whiteSpace: 'nowrap',
      transition: 'none',
    });

    document.body.appendChild(div);
    tooltipRef.current = div;

    return () => {
      div.remove();
    };
  }, []);

  // --------------------------
  // 2) Throttled обновление tooltip
  // --------------------------
  const throttledUpdate = useMemo(
    () => _.throttle((clientX, clientY, text, color) => {
      const el = tooltipRef.current;
      if (!el) return;

      el.textContent = text;
      el.style.left = `${clientX + 12}px`;
      el.style.top = `${clientY + 12}px`;
      el.style.borderLeft = `4px solid ${color}`;
      el.style.borderRight = `4px solid ${color}`;
    }, 16), // ~60 fps но throttled
    [],
  );

  // --------------------------
  // 3) Лёгкий hover handler
  // --------------------------
  const onHover = useCallback(
    (event) => {
      const point = event.points?.[0];
      if (!point) return;

      const { x, y } = point;
      const traceColor = point.fullData?.line?.color ?? '#ccc';

      const coef = timeUnit === 'min' ? 60 : 1;
      const timeStr = `${(x / coef).toFixed(2)} ${timeUnit === 'min' ? 'мин' : 'сек'}`;
      const text = `${timeStr}, ${y.toFixed(2)}`;

      const { clientX, clientY } = event.event;

      const el = tooltipRef.current;
      if (el && el.style.display !== 'block') el.style.display = 'block';

      throttledUpdate(clientX, clientY, text, traceColor);
    },
    [timeUnit, throttledUpdate],
  );

  // --------------------------
  // 4) Unhover handler
  // --------------------------
  const onUnhover = useCallback(() => {
    const el = tooltipRef.current;
    if (el) el.style.display = 'none';
  }, []);

  return { onHover, onUnhover };
};
