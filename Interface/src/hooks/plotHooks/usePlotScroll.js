import { useEffect, useRef, useCallback } from 'react';
import { Plotly } from '../../utils/setupPlotly';

const usePlotScroll = (
  plotlyObj,
  bounds,
  {
    enabled = true,
    scrollSpeed = 0.5,
    axis = 'both',
    ctrlZoom,
    shiftZoom,
    clampRange,
    getCurrentRange,
  } = {}
) => {
  const enabledRef = useRef(enabled);
  const axisRef = useRef(axis);
  const boundsRef = useRef(bounds);
  const scrollSpeedRef = useRef(scrollSpeed);

  const scrollStateRef = useRef({ hoverAxis: null, lastScrollTime: 0 });
  const overlayRefs = useRef({ x: null, y: null });

  useEffect(() => {
    enabledRef.current = enabled;
    axisRef.current = axis;
    boundsRef.current = bounds;
    scrollSpeedRef.current = scrollSpeed;
  }, [enabled, axis, bounds, scrollSpeed]);

  const handleWheel = useCallback((event) => {
    if (!plotlyObj?.el || !enabledRef.current) return;
    event.preventDefault();

    const plotInstance = plotlyObj.el;
    const activeAxis = scrollStateRef.current.hoverAxis;
    if (!activeAxis) return;

    const now = Date.now();
    if (now - scrollStateRef.current.lastScrollTime < 16) return;
    scrollStateRef.current.lastScrollTime = now;

    const ranges = getCurrentRange?.(plotInstance);
    if (!ranges) return;

    const range = ranges[activeAxis];
    if (!range) return;

    let newRange = null;

    if (event.ctrlKey && event.altKey && ctrlZoom) {
      const direction = event.deltaY < 0 ? 'in' : 'out';
      newRange = ctrlZoom(plotInstance, activeAxis, range, direction);
    } else if (event.shiftKey && shiftZoom) {
      const direction = event.deltaY < 0 ? 'in' : 'out';
      newRange = shiftZoom(range, activeAxis, direction);
    } else {
      const direction =
        activeAxis === 'x'
          ? (event.deltaX !== 0 ? Math.sign(event.deltaX) : Math.sign(event.deltaY))
          : -Math.sign(event.deltaY);

      const rangeSize = range[1] - range[0];
      let delta = rangeSize * scrollSpeedRef.current * direction;

      let min = range[0] + delta;
      let max = range[1] + delta;

      if (clampRange) {
        [min, max] = clampRange(activeAxis, min, max);
      } else if (boundsRef.current?.[activeAxis]) {
        const [bMin, bMax] = boundsRef.current[activeAxis];
        if (min < bMin) { min = bMin; max = bMin + rangeSize; }
        if (max > bMax) { max = bMax; min = bMax - rangeSize; }
      }

      newRange = [min, max];
    }

    if (!newRange) return;

    Plotly.relayout(plotInstance, {
      [`${activeAxis}axis.range`]: newRange,
      [`${activeAxis}axis.autorange`]: false,
    });
  }, [plotlyObj?.el, ctrlZoom, shiftZoom, clampRange, getCurrentRange]);

  const attachAxisOverlay = useCallback(() => {
    if (!plotlyObj?.el) return;

    const plotEl = plotlyObj.el;
    const xLayer = plotEl.querySelector('.xaxislayer-above');
    const yLayer = plotEl.querySelector('.yaxislayer-above');
    if (!xLayer || !yLayer) return;

    // Remove previous overlays
    ['x', 'y'].forEach((ax) => {
      if (overlayRefs.current[ax]) {
        overlayRefs.current[ax].remove();
        overlayRefs.current[ax] = null;
      }
    });

    // Determine the base z-index of the plot container
    const computedPlotZ = window.getComputedStyle(plotEl).zIndex;
    // If 'auto', treat as 0; otherwise parse integer (default to 0 if NaN)
    const baseZ = computedPlotZ === 'auto' ? 0 : parseInt(computedPlotZ, 10) || 0;
    const overlayZ = baseZ + 1;   // one unit above the plot

    const createOverlay = (layer, axis) => {
      const { x, y, width, height } = layer.getBBox();
      const overlay = document.createElement('div');
      Object.assign(overlay.style, {
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'auto',
        background: 'transparent',
        zIndex: overlayZ,
        cursor: axis === 'x' ? 'ew-resize' : 'ns-resize', // pointer style
      });
      plotEl.appendChild(overlay);

      overlay.addEventListener('mouseenter', () => {
        scrollStateRef.current.hoverAxis = axis;
      });
      overlay.addEventListener('mouseleave', () => {
        scrollStateRef.current.hoverAxis = null;
      });
      overlay.addEventListener('wheel', handleWheel, { passive: false });

      return overlay;
    };

    overlayRefs.current = {
      x: createOverlay(xLayer, 'x'),
      y: createOverlay(yLayer, 'y'),
    };
  }, [plotlyObj, handleWheel]);

  const detachAxisOverlay = useCallback(() => {
    ['x', 'y'].forEach((ax) => {
      const el = overlayRefs.current[ax];
      if (!el) return;
      el.remove();
      overlayRefs.current[ax] = null;
    });
    scrollStateRef.current.hoverAxis = null;
  }, []);

  const onAfterPlot = useCallback(() => {
    detachAxisOverlay();
    attachAxisOverlay();
  }, [detachAxisOverlay, attachAxisOverlay]);

  useEffect(() => {
    return () => detachAxisOverlay();
  }, []);

  return {
    onAfterPlot,
    handleWheel,

    setScrollSpeed: (speed) => { scrollSpeedRef.current = speed; },
    setEnabled: (isEnabled) => { enabledRef.current = isEnabled; },
    setAxis: (newAxis) => { axisRef.current = newAxis; },
    setBounds: (newBounds) => { boundsRef.current = newBounds; },

    getHoverAxis: () => scrollStateRef.current.hoverAxis,
  };
};

export default usePlotScroll;