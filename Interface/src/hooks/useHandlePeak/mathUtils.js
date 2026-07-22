import { envAwareNotify } from '../../utils/debug';

export const findIntersections = (xBorder, xData, yData) => {
  let left = 0; let
    right = xData.length - 1;

  if (!xData?.length || !yData?.length || xData.length !== yData.length) {
    envAwareNotify('findIntersections: malformed plot data');
    return { x: xBorder, y: 0 };
  }

  // Binary search to find the closest left index where xData[left] < xBorder < xData[left + 1]
  while (left < right - 1) {
    const mid = Math.floor((left + right) / 2);
    if (xData[mid] < xBorder) left = mid;
    else right = mid;
  }

  // Ensure we have two valid points to interpolate
  if (xData[left] === xBorder) return { x: xBorder, y: yData[left] };
  if (xData[right] === xBorder) return { x: xBorder, y: yData[right] };

  // Linear interpolation to find y at xBorder
  const slope = (yData[right] - yData[left]) / (xData[right] - xData[left]);
  const yIntersection = yData[left] + slope * (xBorder - xData[left]);

  return { x: xBorder, y: yIntersection };
};

const snapToPrecision = (value, precision = 0.01) => Math.round(value / precision) * precision;

export const clampToRange = (coordX, startCoordX, leftBorder, rightBorder, gap = 0.2) => {
  if (coordX < startCoordX && coordX <= leftBorder + gap) {
    return snapToPrecision(leftBorder + gap);
  }

  if (coordX > startCoordX && coordX >= rightBorder - gap) {
    return snapToPrecision(rightBorder - gap);
  }

  return snapToPrecision(coordX);
};