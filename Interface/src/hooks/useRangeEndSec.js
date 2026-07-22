import { useMemo } from 'react';

function useRangeEndSec(lastStepBorder, lastDataPointX, timeUnit) {
  return useMemo(() => {
    if (lastStepBorder) {
      return lastStepBorder;
    }
    return lastDataPointX;
  }, [lastStepBorder, lastDataPointX, timeUnit]);
}

export default useRangeEndSec;
