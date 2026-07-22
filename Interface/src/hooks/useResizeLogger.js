import { useEffect } from 'react';

const useResizeLogger = (elementRef) => {
  useEffect(() => {
    if (!elementRef.current) return;

    const logElementSize = (entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        console.log(`Element width: ${width}px, height: ${height}px`);
      }
    };

    // Create the ResizeObserver
    const resizeObserver = new ResizeObserver(logElementSize);

    // Start observing the passed element
    resizeObserver.observe(elementRef.current);

    // Clean up observer when the component unmounts
    return () => {
      resizeObserver.disconnect();
    };
  }, [elementRef]);
};

export default useResizeLogger;
