import { createSelector } from '@reduxjs/toolkit';
import { selectStreamedMeasurementId } from '../measurement/measureBase';
import { selectWholeChromaMiscState } from './chromaMiscBase';

export const selectCurMeasMiscData = createSelector(
  [selectStreamedMeasurementId, selectWholeChromaMiscState],
  (runningId, wholeMiscState) => wholeMiscState[runningId],
);

export const selectCurMeasHasThermo = createSelector(
  [selectCurMeasMiscData],
  (curRunMisc) => curRunMisc?.thermostatTemp != null,
);
