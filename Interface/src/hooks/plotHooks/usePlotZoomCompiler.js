import { useCallback } from 'react';
import usePlotKeyboardZoom from './usePlotKeyboardZoom';
import usePlotScroll from './usePlotScroll';

/**
 * Hook Compiler: combines keyboard zoom + scroll zoom into a single interface
 */
const usePlotZoomCompiler = (plotlyObj, bounds, options = {}) => {
  const {
    enabled = true,
    scrollSpeed = 0.5,
    axis = 'both',
  } = options;

  // Keyboard zoom
  const {
    handleKeyDown,
    ctrlZoom,
    shiftZoom,
    clampRange,
    getCurrentRange,
    onAfterPlot: keyboardAfterPlot,
  } = usePlotKeyboardZoom(plotlyObj, bounds, { enabled });

  // Scroll zoom
  const {
    onAfterPlot: scrollAfterPlot,
    handleWheel,

    setScrollSpeed,
    setEnabled,
    setAxis,
    setBounds,
    getHoverAxis,
  } = usePlotScroll(plotlyObj, bounds, {
    enabled,
    scrollSpeed,
    axis,
    ctrlZoom,
    shiftZoom,
    clampRange,
    getCurrentRange,
  });


  // Unified afterPlot attacher

    const onAfterPlot = useCallback(() => {
    // Attach scroll listeners / overlays
    scrollAfterPlot?.();

    // Attach keyboard listeners
    keyboardAfterPlot?.();

  }, [scrollAfterPlot, keyboardAfterPlot, plotlyObj?.el]);

  return {
    /**
     * Plot wiring
     */
    onAfterPlot,

    /**
     * setters
     */
    setScrollSpeed,
    setEnabled,
    setAxis,
    setBounds,

    /**
     * getters
     */
    getHoverAxis,

    /**
     * exposed handlers (optional manual wiring)
     */
    handleKeyDown,
    handleWheel,

    /**
     * underlying zoom logic
     */
    ctrlZoom,
    shiftZoom,
    clampRange,
    getCurrentRange,
  };
};

export default usePlotZoomCompiler;