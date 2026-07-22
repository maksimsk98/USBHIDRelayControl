import { createSelector } from '@reduxjs/toolkit';

import {
  selectAllChromaPlotsData,
  selectStreamedMeasurementId,
  selectMainMeasurementStatus,
  selectPlotsDataByIdAndType,
} from '../../reduxImportDispatcher';

import { EMPTY_OBJECT, MEASUREMENT_STATUSES } from '../../../constants/constants';

export const selectStreamingMeasuredChromatogram = createSelector(
  [selectStreamedMeasurementId, (state) => state],
  (streamedMeasurementId, state) => selectPlotsDataByIdAndType(state, {
    tabId: streamedMeasurementId,
    pointTypes: ['measuredChromatogram'],
  }).measuredChromatogram || null,
);

// Selector to get the measurement time in min:sec format
export const selectMeasurementTime = createSelector(
  [selectStreamingMeasuredChromatogram, selectMainMeasurementStatus],
  (measuredChromatogram, measurementStatus) => {
    if (
      measurementStatus === MEASUREMENT_STATUSES.MEASUREMENT_RUNNING
      && measuredChromatogram
      && Array.isArray(measuredChromatogram.x)
      && measuredChromatogram.x.length > 0
    ) {
      const lastTimeInSeconds = measuredChromatogram.x[measuredChromatogram.x.length - 1];

      if (!Number.isFinite(lastTimeInSeconds)) return '--:--';

      const minutes = Math.floor(lastTimeInSeconds / 60);
      const seconds = Math.floor(lastTimeInSeconds % 60);

      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    return '--:--';
  },
);

export const selectChromaPlotTable = createSelector(
  [(state, tabId) => tabId, selectAllChromaPlotsData],
  (tabId, chromaPlots) => {
    const { photoParams = {}, referenceParams = {}, mainParams = {} } = chromaPlots[tabId]?.chromaPlotsTable || EMPTY_OBJECT;
    return { photoParams, referenceParams, mainParams };
  },
);
