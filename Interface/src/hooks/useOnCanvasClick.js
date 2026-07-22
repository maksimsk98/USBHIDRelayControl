import { useEffect, useState } from 'react';

const useOnCanvasClick = (plotRef, isInitialized) => {
  const [clickData, setClickData] = useState({ 
    x: null, 
    y: null, 
    ctrlKey: false, 
    shiftKey: false, 
    altKey: false,
    metaKey: false 
  });

  useEffect(() => {
    // Always read the ref inside the effect
    const el = plotRef?.el;
    const plotArea = el?.querySelector('g > rect');

    if (!plotArea || !isInitialized) {
      // If the <Plot> is not yet rendered, just return
      return;
    }

    const handleClick = (event) => {
      const boundingBox = event.target.getBoundingClientRect();

      setClickData({
        x: el._fullLayout.xaxis.p2d(event.clientX - boundingBox.left),
        y: el._fullLayout.yaxis.p2d(event.clientY - boundingBox.top),
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey
      });
    };

    plotArea.addEventListener('click', handleClick);

    return () => {
      plotArea.removeEventListener('click', handleClick);
    };
  }, [plotRef, isInitialized]);

  return clickData; // Return object instead of array
};

export default useOnCanvasClick;