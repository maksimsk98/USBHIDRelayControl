// calibConcSelectors.js

import { createSelector } from '@reduxjs/toolkit';

/**
 * Вся информация calibMeta
 */
export const selectCalibMetaAll = (state) => state.calibMetaReducer;

export const selectCalibMeta = (state, calibName) => state.calibMetaReducer[calibName] ?? null;

/**
 * Имя calibConc (может отличаться от ключа)
 */
export const selectCalibConcName = (state, calibName) => state.calibMetaReducer[calibName]?.calibrationName ?? null;

/**
 * Имя стандарта для calibConc
 */
export const selectCalibConcStandardName = (state, calibName) => state.calibMetaReducer[calibName]?.standardName ?? null;

/**
 * Концентрация calibConc
 */
export const selectCalibConcConcentration = (state, calibName) => state.calibMetaReducer[calibName]?.concentration ?? null;

/**
 * Единицы концентрации calibConc
 */
export const selectCalibConcConcentrationUnits = (state, calibName) => state.calibMetaReducer[calibName]?.concentrationUnits ?? null;

export const selectCalibConcType = (state, calibName) => state.calibMetaReducer[calibName]?.calibrationType ?? null;

export const selectCalibMetaRepPeak = (state, calibName) => state.calibMetaReducer[calibName]?.reperPeak ?? null;

export const selectRepPeakAvailable = createSelector(
  [selectCalibMetaRepPeak],
  (reperPeak) => reperPeak != null && reperPeak !== '',
);
