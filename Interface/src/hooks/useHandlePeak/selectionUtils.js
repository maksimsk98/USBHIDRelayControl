import { isInnerRole } from './borderUtils';

export const createGetNewSelectedPeak = (peakBorders, clickX) => {
  for (let i = 0; i < peakBorders.length; i += 1) {
    const [left, right] = peakBorders[i].borders;

    if (clickX >= left && clickX <= right) {
      const riders = peakBorders.filter((peak) => peak.ridesOnPeakNum === i);

      for (let j = 0; j < riders.length; j += 1) {
        const [nextLeft, nextRight] = riders[j].borders;

        const isTighter = (left <= nextLeft && nextRight < right)
          || (left < nextLeft && nextRight <= right);
        const isClickInRange = clickX >= nextLeft && clickX <= nextRight;

        if (isTighter && isClickInRange) {
          return i + j + 1;
        }
      }

      return i;
    }
  }
  return null;
};

export const defineActiveShapeStyles = (peakBorders, selectedPeakNum) => {
  const roles = [];

  for (let i = 0; i < peakBorders.length; i++) {
    const peak = peakBorders[i];
    const isSelected = selectedPeakNum === i;

    roles.push([peak.borders[0], isSelected  ? 'ab' : 'b']);
    roles.push([null, 'c']);
    roles.push([peak.center, 'p']);
    roles.push([peak.borders[1], isSelected ? 'ab' : 'b']);
  }

  return roles;
};

export function getCurrentPeakIndex(shapeMap, selectedPeakNum) {
  return shapeMap.indexOf(shapeMap
    .find((shape) => shape.customData.type === 'peak' && shape.customData.parentPeakNum === selectedPeakNum));
}

export const getActiveBorderLoc = (currentPeakIndex, currentShapeIndex) => 
  (currentPeakIndex > currentShapeIndex ? 'leftBorder' : 'rightBorder');

export const clearPathElems = (pathElems, message) => {
  pathElems.current = [];
};