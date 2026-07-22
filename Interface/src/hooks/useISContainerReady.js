import { useState, useEffect } from 'react';

const useIsContainerReady = (ref) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const container = ref.current;

    if (!container) return; // Guard against null

    const checkReady = () => {
      // it's a bit of a crutch, I suspect allotment to set children to 1 px until layout
      // is resolved, so to not falsestart plot render i set > 1
      if (container.offsetHeight > 1) {
        setIsReady(true);
      }
    };

    checkReady(); // Initial check

    // Create a ResizeObserver to monitor changes in the container's size
    const observer = new ResizeObserver(() => {
      checkReady();
    });

    observer.observe(container); // Observe the container

    return () => {
      observer.disconnect(); // Cleanup when the component unmounts
    };
  }, []);

  return isReady;
};

export default useIsContainerReady;
