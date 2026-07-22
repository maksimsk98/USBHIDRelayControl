import { useRef, useEffect, useCallback } from 'react';
import { Plotly } from '../../utils/setupPlotly';

const SQRT_HALF = Math.SQRT1_2;
const DEFAULT_TOLERANCE = 1e-6;

const isRangeEqual = (a, b, eps = DEFAULT_TOLERANCE) => {
  if (!a || !b || a.length !== b.length) return false;
  return Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps;
};

export const smartClamp = (range, boundary, doClamp = true) => {
  if (!boundary || !doClamp) return range;

  let [min, max] = range;
  const span = max - min;

  let leftoverLower = 0;
  if (min < boundary[0]) {
    leftoverLower = boundary[0] - min;
    min = boundary[0];
    max += leftoverLower;
  }

  let leftoverUpper = 0;
  if (max > boundary[1]) {
    leftoverUpper = max - boundary[1];
    max = boundary[1];
    min -= leftoverUpper;
  }

  if (min < boundary[0]) min = boundary[0];
  if (max > boundary[1]) max = boundary[1];

  return [min, max];
};

export const usePlotKeyboardZoom = (plotlyObj, bounds, { enabled = true } = {}) => {
  const enabledRef = useRef(enabled);
  const boundsRef = useRef(bounds);
  const ctrlStepStackRef = useRef({ x: [], y: [] });
  const attachedRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
    boundsRef.current = bounds;
  }, [enabled, bounds]);

  const getCurrentRange = useCallback((plotInstance) => {
    const layout = plotInstance?.layout;
    if (!layout) return null;
    return {
      x: layout.xaxis?.range,
      y: layout.yaxis?.range,
    };
  }, []);

  const clampRange = useCallback((axis, min, max, doClamp = true) => {
    const boundary = boundsRef.current?.[axis];
    return smartClamp([min, max], boundary, doClamp);
  }, []);

  const ctrlZoom = useCallback((plotInstance, axis, range, direction) => {
    const ticks = plotInstance.layout?.[axis + 'axis']?.tickvals;
    const tickStep = ticks?.length > 1 ? ticks[1] - ticks[0] : 0.1 * (range[1] - range[0]);
    let [min, max] = range;
    let stack = ctrlStepStackRef.current[axis];

    const lastAnchor = stack.length ? stack[stack.length - 1].anchorRange : null;
    if (lastAnchor && !isRangeEqual([min, max], lastAnchor)) {
      ctrlStepStackRef.current[axis] = [];
      stack = ctrlStepStackRef.current[axis];
    }

    if (direction === 'in') {
      min += tickStep;
      max -= tickStep;
      stack.push({ minTick: tickStep, maxTick: tickStep, anchorRange: [min, max] });
    } else {
      const { minTick = tickStep, maxTick = tickStep } = stack.pop() || {};
      min -= minTick;
      max += maxTick;
    }

    return smartClamp([min, max], boundsRef.current?.[axis]);
  }, []);

  const shiftZoom = useCallback((range, axis, direction, doClamp = true) => {
    const center = (range[0] + range[1]) / 2;
    const span = range[1] - range[0];
    const factor = direction === 'in' ? SQRT_HALF : 1 / SQRT_HALF;
    const newSpan = span * factor;
    return smartClamp([center - newSpan / 2, center + newSpan / 2], boundsRef.current?.[axis], doClamp);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!enabledRef.current || !plotlyObj?.el) return;
    const plotInstance = plotlyObj.el;
    const ranges = getCurrentRange(plotInstance);
    if (!ranges) return;

    let axis = null;
    let direction = null;
    switch (e.key) {
      case 'ArrowUp': axis = 'y'; direction = 'in'; break;
      case 'ArrowDown': axis = 'y'; direction = 'out'; break;
      case 'ArrowRight': axis = 'x'; direction = 'in'; break;
      case 'ArrowLeft': axis = 'x'; direction = 'out'; break;
      default: return;
    }

    let newRange = null;
    if (e.ctrlKey) newRange = ctrlZoom(plotInstance, axis, ranges[axis], direction);
    else if (e.shiftKey) newRange = shiftZoom(ranges[axis], axis, direction);
    else return;

    Plotly.relayout(plotInstance, {
      [`${axis}axis.range`]: newRange,
      [`${axis}axis.autorange`]: false,
    });

    e.preventDefault();
  }, [plotlyObj, getCurrentRange, ctrlZoom, shiftZoom]);

  /** attach/detach for onAfterPlot */
  const attachHandlers = useCallback(() => {
    if (!plotlyObj?.el || attachedRef.current) return;
    window.addEventListener('keydown', handleKeyDown);
    attachedRef.current = true;
  }, [plotlyObj?.el, handleKeyDown]);

  const detachHandlers = useCallback(() => {
    if (!attachedRef.current) return;
    window.removeEventListener('keydown', handleKeyDown);
    attachedRef.current = false;
  }, [handleKeyDown]);

  const onAfterPlot = useCallback(() => {
    detachHandlers();
    attachHandlers();
  }, [detachHandlers, attachHandlers]);

  return {
    handleKeyDown,
    ctrlZoom,
    shiftZoom,
    clampRange,
    getCurrentRange,
    onAfterPlot,
  };
};

export default usePlotKeyboardZoom;