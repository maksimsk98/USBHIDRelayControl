import { useEffect, useState } from 'react';

const useParentSize = (elementRef) => {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!elementRef.current) return;

    const handleResize = (entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(elementRef.current);

    return () => resizeObserver.disconnect();
  }, [elementRef]);

  return size;
};

export default useParentSize;
