import { isPlainObject } from 'lodash';
import { useReducer } from 'react';
import { assertPeaksSortedByTime } from '../../utils/peakUtils';

// NOTE:
// Server returns only one-sided "not separated" info.
// We intentionally reconstruct full bidirectional pairing here
// using boundary equality + flags.
// Resulting pairedWithLeft/RightPeakIndex form a linear chain.

const formatInitialPeaks = (initPeaks) => {
  if (!Array.isArray(initPeaks)) return [];

  const normalizedPeaks = initPeaks.map((peak) => { // 0-based as it should be
    const zeroPeak = Number(peak.peakNumber) - 1;

    const zeroMaster = peak.masterPeakNumber != null
      ? Number(peak.masterPeakNumber) - 1
      : null;

    const zeroRiders = Array.isArray(peak.riderPeakNumbers)
      ? peak.riderPeakNumbers.map((n) => Number(n) - 1)
      : [];

    return {
      ...peak,
      _zeroPeakIndex: zeroPeak,
      _zeroMasterIndex: zeroMaster,
      _zeroRiderIndices: zeroRiders,
    };
  });

  const resultBorders = [];

  for (const peak of normalizedPeaks) {
    const {
      _zeroPeakIndex: zeroBasePeakIndex,
      _zeroMasterIndex: zeroBaseMasterIndex,
      _zeroRiderIndices: zeroBaseRiderIndices,
    } = peak;

    const meta = {
      component: peak.component,
      concentrationCalc: peak.concentrationCalc,
      concentrationRef: peak.concentrationRef,
    };

    const center = peak.time;
    const borders = [peak.leftBoundary, peak.rightBoundary];

    // Rider wing logic
    let ridesWing = null;
    if (peak.isRiderPeak && zeroBaseMasterIndex != null) {
      const master = normalizedPeaks[zeroBaseMasterIndex];

      if (master) {
        const masterCenter = master.time;
        ridesWing = center < masterCenter ? 'leftWing' : 'rightWing'; // "wings" are locations on master peak border-peak/peak-border
      }
    }

    // Pairing logic
    let pairedWithLeftPeakIndex = null;
    let pairedWithRightPeakIndex = null;

    const leftCheckFunc = (peak) => (sibling) => sibling.rightBoundary === peak.leftBoundary
      && sibling.time < peak.time
      && sibling.isNotSeparatedRight;

    const rightCheckFunc = (peak) => (sibling) => sibling.leftBoundary === peak.rightBoundary
      && sibling.time > peak.time
      && sibling.isNotSeparatedLeft;

    if (peak.isNotSeparatedLeft || peak.isNotSeparatedRight) {
      const getSiblings = () => {
        if (peak.isRiderPeak && zeroBaseMasterIndex != null) {
          const master = normalizedPeaks[zeroBaseMasterIndex];
          return master
            ? master._zeroRiderIndices.map((i) => normalizedPeaks[i])
            : [];
        }
        return normalizedPeaks.filter((p) => !p.isRiderPeak);
      };

      const siblings = getSiblings();

      if (peak.isNotSeparatedLeft) {
        const match = siblings.find(leftCheckFunc(peak));

        if (match) {
          pairedWithLeftPeakIndex = normalizedPeaks.indexOf(match);
        }
      }

      if (peak.isNotSeparatedRight) {
        const match = siblings.find(rightCheckFunc(peak));
        if (match) {
          pairedWithRightPeakIndex = normalizedPeaks.indexOf(match);
        }
      }
    }

    resultBorders.push({
      peakNumber: zeroBasePeakIndex, // 0-based as it should be
      center,
      borders,

      // flags
      isNotSeparatedLeft: peak.isNotSeparatedLeft,
      isNotSeparatedRight: peak.isNotSeparatedRight,
      isRiderPeak: peak.isRiderPeak,
      isMasterPeak: peak.isMasterPeak,

      // riders
      ridesOnPeakNum: zeroBaseMasterIndex, // 0-based as it should be
      riderPeakNumbers: zeroBaseRiderIndices,
      ...(ridesWing !== null && { ridesWing }),

      // pairs
      ...(pairedWithLeftPeakIndex != null && { pairedWithLeftPeakIndex }),
      ...(pairedWithRightPeakIndex != null && { pairedWithRightPeakIndex }),
      meta,
    });
  }

  return resultBorders;
};

function init(initialArg) {
  return formatInitialPeaks(initialArg);
}

const borderReducer = (state, action) => {
  const { type, payload } = action;
  switch (type) {
    case 'set':
      if (!payload) return state;
      return formatInitialPeaks(payload);

    case 'move':
      if (!payload) return state;
      const { peakNum, location, xCoord } = payload;
      const borderNum = location === 'left' ? 0 : 1;

      const result = state.map((peak, index) => {
        if (index === peakNum) {
          const peakCopy = {
            ...peak,
            borders: [...peak.borders],
          };
          peakCopy.borders[borderNum] = xCoord;
          return peakCopy;
        }
        return peak;
      });
      return result;
    default:
      return state;
  }
};

export const usePeakBordersSingleSource = (peaks) => {
  const [peakBorders, borderDispatch] = useReducer(borderReducer, peaks, init);

  return { peakBorders, borderDispatch };
};

export const formatManyInitialPeaks = (peaksByFileId) => {
  if (!isPlainObject(peaksByFileId)) return {};

  const result = {};
  for (const [fileId, peaks] of Object.entries(peaksByFileId)) {
    result[fileId] = formatInitialPeaks(peaks);
  }

  assertPeaksSortedByTime(result, {
    label: 'formatInitialPeaks → peakBorders',
    key: 'center', // или 'time', если хочешь
  });

  return result;
};
