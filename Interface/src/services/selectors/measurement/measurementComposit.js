import { createSelector } from '@reduxjs/toolkit';
import {
  selectLumexDetectorProgramData, selectIsMeasurement, selectActMeasuredChromatogram, selectMainMeasurementStatus, selectStreamedMeasurementId, selectTabMeasurementType,
  selectAdditionalStepValid,
} from '../../reduxImportDispatcher';
import { MEASUREMENT_STATUSES, MEASUREMENT_TYPES } from '../../../constants/constants';

export const selectMeasurementProgress = createSelector(
  [
    selectStreamedMeasurementId,
    selectIsMeasurement,
    selectTabMeasurementType,
    selectLumexDetectorProgramData,
    selectActMeasuredChromatogram,
    selectMainMeasurementStatus,
    selectAdditionalStepValid,
    (state, tabId) => tabId],
  (
    streamedId, isMeasurement, tabMeasurementType, 
    detectorProgram, measuredChromatogram, measurementStatus, additionalStep, tabId) => {
    if (!isMeasurement || tabId !== streamedId || tabMeasurementType !== MEASUREMENT_TYPES.chroma) return null; // we need to return progress only for streamed chroma tab or all finised and stop will show their progress bars

    const statuses = [MEASUREMENT_STATUSES.MEASUREMENT_RUNNING];
    if (measuredChromatogram && statuses.includes(measurementStatus)) {
      // Get the last time point in seconds
      const lastToSec = detectorProgram?.steps?.at(-1)?.to ?? null;
      if (!lastToSec) return null

      const lastTimeInSeconds = measuredChromatogram.x[measuredChromatogram.x.length - 1];
      const additionalStepLengthSec = (additionalStep?.maxDuration ?? 0) * 60;
      
      const fullLength = lastToSec + additionalStepLengthSec
      return Math.floor((lastTimeInSeconds / fullLength) * 100) || null;
    }
    return null;
  },
);
