import { useEffect, useRef } from 'react';
import { Plotly } from '../utils/setupPlotly';

// Utility function for debouncing resize actions
const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

const useResizePlot = (PlotlyComponent, isActive) => {
  const isMountedRef = useRef(true); // Track if the component is still mounted

  useEffect(() => {
    isMountedRef.current = true;

    /*     console.log(PlotlyComponent, PlotlyComponent?.el) */

    if (!PlotlyComponent || !PlotlyComponent.el || !isActive) {
      return;
    }

    const plotEl = PlotlyComponent.el; // Access the Plotly DOM node
    const parentEl = plotEl.parentNode; // Get the parent element of the plot

    // Function to resize the plot when it's visible or parent container changes
    const resizePlot = () => {
      if (plotEl && isMountedRef.current) {
        debouncedResize(); // Trigger debounced resize
      }
    };

    // Debounced version of the resize function
    const debouncedResize = debounce(() => {
      // Check if the plot is mounted and visible
      if (isMountedRef.current && plotEl.offsetParent !== null) {
        Plotly.Plots.resize(plotEl).catch((err) => console.error('useResizePlot: Error resizing plot:', err));
      }
    }, 50); // Debounce delay set to 200ms

    // Initialize ResizeObserver to track changes in the parent container size
    const resizeObserver = new ResizeObserver(() => {
      resizePlot();
    });

    // Start observing changes on the parent element
    resizeObserver.observe(parentEl);

    // Cleanup on unmount or when `isActive` changes
    return () => {
      isMountedRef.current = false; // Mark component as unmounted
      resizeObserver.disconnect();
    };
  }, [PlotlyComponent, isActive]);
};

export default useResizePlot;
