export const findIntersections = (xIntersector, xData, yData) => {
  const typeCorrectIntersector = parseFloat(xIntersector); // for some reasone peak data has numbers as strings, i work with what i get
  let left = 0; let
    right = xData.length - 1;

  // Binary search to find the closest left index where xData[left] < xBorder < xData[left + 1]
  while (left < right - 1) {
    const mid = Math.floor((left + right) / 2);
    if (xData[mid] < typeCorrectIntersector) left = mid;
    else right = mid;
  }

  // Ensure we have two valid points to interpolate
  if (xData[left] === typeCorrectIntersector) {
    return { x: typeCorrectIntersector, y: yData[left] };
  }
  if (xData[right] === typeCorrectIntersector) {
    return { x: typeCorrectIntersector, y: yData[right] };
  }

  // Linear interpolation to find y at xBorder
  const slope = (yData[right] - yData[left]) / (xData[right] - xData[left]);
  const yIntersection = yData[left] + slope * (typeCorrectIntersector - xData[left]);

  return { x: typeCorrectIntersector, y: yIntersection };
};

export const findXOfClosestPoint = (xIntersector, xData) => {
  const typeCorrectIntersector = parseFloat(xIntersector); // for some reasone peak data has numbers as strings, i work with what i get

  const binarySearch = (array, target, start, end) => {
    const middleIndex = Math.floor((start + end) / 2);
    const middleValue = array[middleIndex];

    if (start > end) return { left: end, right: start };
    if (target < array[start] || target > array[end]) return { left: null, right: null, exact: null };
    if (middleValue === target) return { left: null, right: null, exact: middleIndex };

    // Right-side frame
    if (
      middleIndex < array.length - 1
      && middleValue <= target
      && array[middleIndex + 1] >= target
    ) {
      return { left: middleIndex, right: middleIndex + 1, exact: null };
    }

    // Left-side frame
    if (
      middleIndex > 0
      && array[middleIndex - 1] <= target
      && middleValue >= target
    ) {
      return { left: middleIndex - 1, right: middleIndex, exact: null };
    }

    if (middleValue < target) {
      return binarySearch(array, target, middleIndex + 1, end);
    } if (middleValue > target) {
      return binarySearch(array, target, start, middleIndex - 1);
    }
  };

  const { left, right, exact } = binarySearch(xData, typeCorrectIntersector, 0, xData.length - 1); // length is bigger than max index by 1

  if (exact !== null && exact !== undefined) return exact;
  if (left === undefined || right === undefined) return null;
  const closestX = Math.abs(xData[left] - typeCorrectIntersector) <= Math.abs(xData[right] - typeCorrectIntersector)
    ? left
    : right;

  return closestX;
};

export const findYOfClosestPoint = (xIntersector, xData, yData) => {
  const closestIndex = findXOfClosestPoint(xIntersector, xData);

  return closestIndex !== null ? yData[closestIndex] : null;
};

export const generatePeakAnnotations = (peakBorders, plotData, config) => {
  if (!plotData?.x?.length) return [];

  if (!config.useAnnotations) return [];

  return peakBorders.map((peak, index) => {
    const { center, meta } = peak;
    const { component, concentrationCalc = null, concentrationRef = null } = meta || {};

    let text = '';

    // Determine text based on config
    switch (config.namingMode) {
      case 'number':
        text = `${index + 1}`;
        break;
      case 'time':
        text = `${center}`;
        break;
      case 'component':
        text = component || `${index + 1}`;
        break;
      case 'component_concentration':
        const effectiveConcentration = concentrationCalc || concentrationRef;
        if (component && effectiveConcentration != undefined) {
          text = `${component} [${effectiveConcentration}]`;
        } else {
          console.warn('No concentration for peak annotation', concentrationRef, concentrationCalc);
          text = `${index + 1}`;
        }
        break;
      default:
        text = `${index + 1}`;
    }

    // Orientation: vertical or horizontal
    const isVertical = config.orientation === 'vertical';

    return {
      x: center,
      y: findYOfClosestPoint(center, plotData.x, plotData.y),
      text,
      showarrow: true,
      arrowhead: 0,
      arrowwidth: 1.5,
      arrowcolor: 'grey',
      ax: 0,
      ay: -15,
      textangle: isVertical ? -90 : 0,
      xanchor: isVertical ? 'left' : 'center',
      yanchor: isVertical ? 'center' : 'bottom',
    };
  });
};

export const assertPeaksSortedByTime = (
  peaks,
  {
    label = 'assertPeaksSortedByTime',
    strict = false,
    key = 'time',
  } = {},
) => {
  if (!Array.isArray(peaks) || peaks.length < 2) return true;

  let ok = true;

  for (let i = 1; i < peaks.length; i++) {
    const prev = peaks[i - 1];
    const curr = peaks[i];

    const prevVal = prev?.[key];
    const currVal = curr?.[key];

    if (prevVal == null || currVal == null) continue;

    if (prevVal > currVal) {
      ok = false;

      console.groupCollapsed(
        `[${label}] ❌ Peaks order invariant violated at index ${i - 1} → ${i}`,
      );
      console.log('prev peak:', {
        index: i - 1,
        time: prevVal,
        peakNumber: prev.peakNumber,
        isRider: prev.isRiderPeak,
        ridesOn: prev.masterPeakNumber,
      });
      console.log('curr peak:', {
        index: i,
        time: currVal,
        peakNumber: curr.peakNumber,
        isRider: curr.isRiderPeak,
        ridesOn: curr.masterPeakNumber,
      });
      console.log('full array:', peaks);
      console.groupEnd();

      if (strict) {
        throw new Error(
          `[${label}] Peaks are not sorted by "${key}". See logs above.`,
        );
      }
    }
  }

  if (!ok) {
    console.warn(
      `[${label}] Peaks order invariant failed. Backend order MUST NOT be trusted.`,
    );
  }

  return ok;
};
