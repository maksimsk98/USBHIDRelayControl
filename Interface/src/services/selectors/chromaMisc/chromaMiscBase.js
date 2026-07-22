import { createSelector } from '@reduxjs/toolkit';
import { CUSTOM_DEVIATION_INTERVALS_MAP, EMPTY_OBJECT } from '../../../constants/constants';

export const selectWholeChromaMiscState = (state) => state.chromaMiscReducer;

export const selectSmoothingParamsById = (state, tabId) => state.chromaMiscReducer[tabId]?.smoothingParams ?? EMPTY_OBJECT;

export const selectPeakIdParamsById = (state, tabId) => state.chromaMiscReducer[tabId]?.peakIdParams ?? EMPTY_OBJECT;

export const selectChromaMiscState = (state, parentId) => state.chromaMiscReducer[parentId];

export const selectChromaAveraging = createSelector(
  [selectChromaMiscState],
  (chromaMiscData) => {
    // This will now only recalculate if `chromaMiscReducer[measurementId]` changes
    if (!chromaMiscData) return null;
    const { averaging } = chromaMiscData;
    return averaging;
  },
);

export const selectChromaMiscData = createSelector(
  [selectChromaMiscState],
  (chromaMiscData) => {
    // This will now only recalculate if `chromaMiscReducer[measurementId]` changes
    if (!chromaMiscData) return null;
    const { averaging, thermostatTemp, timeUnit } = chromaMiscData;
    return { averaging, thermostatTemp, timeUnit };
  },
);

export const selectExportMiscData = createSelector(
  [selectChromaMiscState],
  (chromaMiscData) => {
    // This will now only recalculate if `chromaMiscReducer[measurementId]` changes
    if (!chromaMiscData) return null;
    const { averaging, thermostatTemp, isWritingBaseline } = chromaMiscData;
    return { averaging, thermostatTemp, isWritingBaseline };
  },
);

export const selectTimeUnit = createSelector(
  [selectChromaMiscState],
  (chromaMiscState) => chromaMiscState?.timeUnit ?? null,
);

export const selectTabSignalParams = createSelector(
  [selectChromaMiscState],
  (chromaMiscState) => {
    const isCaptureInterval = chromaMiscState?.signalParams?.standardDeviationInterval === 'captureInterval';
    const params = { ...chromaMiscState?.signalParams, isCaptureInterval } ?? EMPTY_OBJECT;

    return params;
  },
);

export const selectDiviationIntervalSec = createSelector(
  [selectChromaMiscState],
  (chromaMiscState) => {
    let interval = chromaMiscState?.signalParams?.standardDeviationInterval;

    if (Object.keys(CUSTOM_DEVIATION_INTERVALS_MAP).includes(interval)) interval = chromaMiscState?.signalParams?.customUserDeviationInterval;

    return interval < 1 ? 1 : interval;
  },
);

export const isCaptureInterval = createSelector(
  [selectChromaMiscState],
  (chromaMiscState) => chromaMiscState?.signalParams?.standardDeviationInterval === 'captureInterval',
);

export const selectPeakAnnotationParams = createSelector(
  [selectChromaMiscState],
  (chromaMiscState) => chromaMiscState?.peakAnnotationParams,
);
