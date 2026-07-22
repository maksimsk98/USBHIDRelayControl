import { createSelector } from '@reduxjs/toolkit';
import { selectIsMeasurement, selectIsOpened } from '../reduxImportDispatcher';

export const selectIsAnalysisTab = createSelector(
  [selectIsMeasurement, selectIsOpened],
  (isMeasurement, isOpened) => isMeasurement || isOpened,
);
