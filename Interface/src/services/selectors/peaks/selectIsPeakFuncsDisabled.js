import { createSelector } from '@reduxjs/toolkit';
import { selectIsTabInitialized } from '../tabs/tabsDerived';
import { selectIsActCalculatedEmpty } from '../chromaPlots/plotsBase';

export const selectIsPeakFuncsDisabled = createSelector(
  [
    (state, tabId) => selectIsActCalculatedEmpty(state, { tabId }),
    (state, tabId) => selectIsTabInitialized(state, tabId),
  ],
  (isCalcEmpty, isInitialized) => isCalcEmpty || !isInitialized,
);
