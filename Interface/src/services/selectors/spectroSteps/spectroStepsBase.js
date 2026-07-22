import { createSelector } from '@reduxjs/toolkit';
import { selectEffectiveDetectorType } from '../steps/stepsDerived';

const { EMPTY_ARRAY, DETECTOR_TYPES } = require('../../../constants/constants');

export const selectSpectroSteps = (state, tabId) => state.spectroStepsReducer[tabId]?.steps ?? EMPTY_ARRAY;

export const selectIsRedactingSpectroSteps = (state, tabId) => state.spectroStepsReducer[tabId]?.isRedacting ?? false;

export const selectSpectroDetParams = (state, tabId) => state.spectroStepsReducer[tabId]?.params;

export const selectSpectroFocusedStep = (state, tabId) => state.spectroStepsReducer[tabId]?.focusedStep;

export const selectSpectroFocusedStepData = createSelector(
  [selectSpectroSteps, selectSpectroFocusedStep],
  (steps, focusedStep) => {
    const focusedStepData = steps[focusedStep];
    return { ...focusedStepData };
  },
);

export const selectMaxWavelengthForFocusedStep = createSelector(
  [selectSpectroFocusedStepData],
  (focusedStep) => focusedStep?.to,
);

export const selectSpectroStepsCount = (state, tabId) => state.spectroStepsReducer[tabId]?.steps?.length ?? null;

export const selectSpectroAveragingValue = createSelector(
  [selectEffectiveDetectorType, selectSpectroDetParams],
  (detectorType, params) => {
    if (!params) return null;

    console.log(detectorType, params);

    switch (detectorType) {
      case DETECTOR_TYPES.PANORAMA:
      case DETECTOR_TYPES.PANORAMA2:
        return params.averagingFlashes;
      default:
        return params.averagingTime;
    }
  },
);

export const selectSpectroDetDepParams = createSelector(
  [selectEffectiveDetectorType, selectSpectroDetParams],
  (detectorType, params) => {
    if (!params) return null;

    console.log(detectorType, params);

    switch (detectorType) {
      case DETECTOR_TYPES.PANORAMA:
      case DETECTOR_TYPES.PANORAMA2:
        const { sensitivity, correction, averagingFlashes } = params;
        return { sensitivity, correction, averaging: averagingFlashes };

      case DETECTOR_TYPES.SPHDETECTOR:
      case DETECTOR_TYPES.SPHDETECTOR2:
        const { averagingTime } = params;
        return { averaging: averagingTime };
      default:
        return params.averagingTime;
    }
  },
);

export const selectSpectroPending = (state, tabId, operation) => state.spectroStepsReducer.pending[tabId]?.[operation] ?? false;
