import {
  useEffect, useRef, useCallback, useMemo, useState,
} from 'react';
import { Plotly } from '../utils/setupPlotly';
import { useRafThrottle } from './useRafThrottle';
import { CUSTOM_DRAGMODES } from '../constants/constants';

export const usePanHandlers = ({
  plotElem,
  convertersRef,
  layout,
  setLayout,
  maxX,
  minX = 0,
  buffer = {
    minCoef: 0,
    maxCoef: 0.05,
  },
  fallbackDragmode = 'zoom',
  noMoveRelayout = false,
  hasCompetition = false,
  activeDragmode,
  setActiveDragmode,
}) => {
  const [isPanning, setIsPanning] = useState(false);
  const startPixelXRef = useRef(null);
  const startRangeRef = useRef(null);
  const previewRangeRef = useRef(null); // stores [newMin, newMax]
  const schedule = useRafThrottle();

  useEffect(() => {
    setLayout((prev) => ({
      ...prev,
      dragmode: activeDragmode == CUSTOM_DRAGMODES.PAN && !hasCompetition ? false : fallbackDragmode,
    }));
  }, [activeDragmode, setLayout, fallbackDragmode, hasCompetition]);

  const togglePanMode = useCallback((explicitSet) => {
    setIsPanning((prev) => (
      typeof explicitSet === 'boolean' ? explicitSet : !prev
    ));
  }, []);

  useEffect(() => {
    setActiveDragmode((prev) => (isPanning
      ? CUSTOM_DRAGMODES.PAN
      : (prev === CUSTOM_DRAGMODES.PAN ? fallbackDragmode : prev)));
  }, [isPanning, setActiveDragmode]);

  useEffect(() => {
    const dragEl = plotElem?.querySelector('.draglayer');
    if (!dragEl) return;

    if (activeDragmode == CUSTOM_DRAGMODES.PAN) {
      dragEl.classList.add('sneak-pointy-force-move');
    }
    return () => {
      dragEl.classList.remove('sneak-pointy-force-move');
    };
  }, [plotElem, activeDragmode]);

  useEffect(() => {
    const button = plotElem?.querySelector('[data-attr="custom-pan"]');
    if (!button) return;
    if (activeDragmode === CUSTOM_DRAGMODES.PAN) {
      button.classList.add('custom-active-mod-button');
    } else {
      button.classList.remove('custom-active-mod-button');
    }
  }, [plotElem, activeDragmode]);

  useEffect(() => {
    if (hasCompetition || activeDragmode !== CUSTOM_DRAGMODES.PAN) {
      setIsPanning(false);
    }
  }, [hasCompetition, activeDragmode]);

  useEffect(() => {
    if (!isPanning || !convertersRef.current || !plotElem || activeDragmode !== CUSTOM_DRAGMODES.PAN) return;
    const dragEl = plotElem.querySelector('.nsewdrag');
    if (!dragEl) return;
    const p2c = convertersRef.current.pixelToX;
    if (!p2c || !layout?.xaxis?.range) return;

    const handleMouseDown = (e) => {
      if (e.button !== 0) return; // Only left click
      startPixelXRef.current = e.clientX;
      startRangeRef.current = layout.xaxis.range.slice(); // snapshot start range

      document.addEventListener('mousemove', handleMouseMove, { capture: true });
      document.addEventListener('mouseup', handleMouseUp, { capture: true });
    };

    const handleMouseMove = (e) => {
      if (startPixelXRef.current == null || !startRangeRef.current) return;

      const deltaCoord = p2c(startPixelXRef.current) - p2c(e.clientX);
      const [oldMin, oldMax] = startRangeRef.current;
      const span = oldMax - oldMin;

      const bufferedMin = minX - span * (buffer.minCoef ?? 0);
      const bufferedMax = maxX + span * (buffer.maxCoef ?? 0);

      const newMin = Math.max(bufferedMin, Math.min(bufferedMax - span, oldMin + deltaCoord));
      const newMax = newMin + span;

      previewRangeRef.current = [newMin, newMax];

      if (!noMoveRelayout) {
        // Golden crutch:
        // - relayout on move gives instant feedback
        // - final range synced declaratively via setLayout on mouseup
        // - avoids extra onRelayout call while keeping layout as SSOT
        schedule(() => {
          Plotly.relayout(plotElem, {
            'xaxis.range': [newMin, newMax],
            excludeFromHistory: true,
          });
        });
      }
    };

    const handleMouseUp = (e) => {
      document.removeEventListener('mousemove', handleMouseMove, { capture: true });
      document.removeEventListener('mouseup', handleMouseUp, { capture: true });

      if (!previewRangeRef.current) return;
      const [newMin, newMax] = previewRangeRef.current;

      if (noMoveRelayout) {
        Plotly.relayout(plotElem, {
          'xaxis.range': [newMin, newMax],
        });
      }

      setLayout((prev) => ({
        ...prev,
        xaxis: {
          ...prev.xaxis,
          range: [newMin, newMax],
          autorange: false,
        },
      }));

      previewRangeRef.current = null;
      startPixelXRef.current = null;
      startRangeRef.current = null;
    };

    dragEl.addEventListener('mousedown', handleMouseDown, { capture: true });

    return () => {
      dragEl.removeEventListener('mousedown', handleMouseDown, { capture: true });
    };
  }, [isPanning, convertersRef, plotElem, layout, setLayout, maxX, minX, buffer]);

  useEffect(() => {
    if (!plotElem) return;

    const handleRelayout = (eventData) => {
      const newDragmode = eventData.dragmode;
      if (newDragmode && newDragmode !== false && newDragmode !== 'pan') {
        setIsPanning(false); // disable your pan if Plotly switches to zoom, etc.
      }
    };

    plotElem.on?.('plotly_relayout', handleRelayout);

    return () => {
      plotElem.removeAllListeners?.('plotly_relayout');
    };
  }, [plotElem]);

  const panButton = useMemo(
    () => {
      if (hasCompetition) return null;
      return {
        name: isPanning ? 'Выключить сдвиг' : 'Включить сдвиг',
        icon: Plotly.Icons.pan,
        click: () => togglePanMode(),
        attr: 'custom-pan',
      };
    },
    [isPanning, togglePanMode, hasCompetition],
  );

  return {
    togglePanMode,
    panButton,
  };
};
