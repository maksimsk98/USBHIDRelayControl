import { createSelector } from '@reduxjs/toolkit';
import { DEFAULT_POINTS, EMPTY_ARRAY } from '../../../constants/constants';

export const selectSpectroPlotById = (state, tabId) => state.spectroPlotsReducer[tabId]?.measuredSpectroscopic ?? DEFAULT_POINTS;

export const selectSpectroProcessedPlotsById = (state, tabId) => state.spectroPlotsReducer[tabId]?.processedSpectroscopic ?? EMPTY_ARRAY;

export const selectSpectroTraceCountById = createSelector(
  [selectSpectroProcessedPlotsById],
  (traces) => traces.length ?? 0,
);
