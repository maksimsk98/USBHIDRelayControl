import { useMemo } from 'react';

export function usePlotStats(plotsByIds) {
  return useMemo(() => {
    let latestSecX = -Infinity;
    let maxAbsY = -Infinity;
    let maxSourceId = null;

    for (const [fileId, plot] of Object.entries(plotsByIds)) {
      const xs = plot?.x;
      const ys = plot?.y;

      if (xs?.length) {
        const lastX = xs[xs.length - 1];
        if (lastX > latestSecX) latestSecX = lastX;
      }

      if (ys?.length) {
        for (let i = 0; i < ys.length; i++) {
          const absY = Math.abs(ys[i]);
          if (absY > maxAbsY) {
            maxAbsY = absY;
            maxSourceId = fileId;
          }
        }
      }
    }

    return {
      latestSecX,
      maxAbsY,
      maxSpikeSourceId: maxSourceId,
    };
  }, [plotsByIds]);
}
