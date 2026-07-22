import { useEffect, useRef } from 'react';

const useRenderCount = () => {
  // Initialize ref to keep track of re-renders
  const rerenderCount = useRef(0);

  // Increment the ref on every render
  useEffect(() => {
    rerenderCount.current += 1;
  });

  // Set up an interval to log and reset the re-render count every 30 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Log the average number of re-renders per second
      console.log(rerenderCount.current / 30);
      // Reset the re-render count
      rerenderCount.current = 0;
    }, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
};

export default useRenderCount;
