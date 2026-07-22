import { useState, useCallback } from 'react';

export function useCaptureRange() {
  const [range, setRange] = useState({ x: null, y: null });

  const onRelayout = useCallback((layoutUpdate) => {
    let x = null;
    let y = null;

    // flattened keys ("xaxis.range[0]" / "[1]")
    if (
      layoutUpdate['xaxis.range[0]'] != null
      && layoutUpdate['xaxis.range[1]'] != null
    ) {
      x = [
        layoutUpdate['xaxis.range[0]'],
        layoutUpdate['xaxis.range[1]'],
      ];
    }
    // or nested
    else if (layoutUpdate.xaxis?.range) {
      x = layoutUpdate.xaxis.range;
    }

    if (
      layoutUpdate['yaxis.range[0]'] != null
      && layoutUpdate['yaxis.range[1]'] != null
    ) {
      y = [
        layoutUpdate['yaxis.range[0]'],
        layoutUpdate['yaxis.range[1]'],
      ];
    } else if (layoutUpdate.yaxis?.range) {
      y = layoutUpdate.yaxis.range;
    }

    setRange({ x, y });
  }, []);

  return { range, onRelayout };
}
