import { useState, useCallback } from 'react';

export default function useStatePlotRef() {
  const [plotlyObj, setPlotlyObj] = useState(null);

  // Callback ref that React calls whenever the Plot ref is set/unset.
  // If 'instance' is non-null, we store it in state, triggering a re-render.
  const setPlotlyRef = useCallback((instance) => {
    if (instance) {
      setPlotlyObj(instance);
    }
  }, []);

  return [plotlyObj, setPlotlyRef];
}
