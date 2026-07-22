import { createSelector } from '@reduxjs/toolkit';
import { EMPTY_ARRAY } from '../../../constants/constants';

export const selectStepReducerState = (state) => state.stepReducer;

export const selectLumexDetectorProgramData = (state, parentId) => {
  const entry = state.stepReducer[parentId];
  return entry
}
export const selectLumexStepsData = (state, parentId) => {
  const result = state.stepReducer[parentId]?.steps ?? EMPTY_ARRAY;
  return result;
};

export const selectLumexParamsData = (state, parentId) => {
  const entry = state.stepReducer[parentId];
  return entry?.params ?? null;
};

export const selectAdditionalStepRaw = (state, tabId) => state.stepReducer[tabId]?.additionalStep ?? {
  maxDuration: null,  // WATCHLIST it is in min , not my idea
  window: null,
  threshold: null,
};

export const selectIsLumexChromaRedacting = (state, parentId) => state.stepReducer[parentId]?.isRedacting ?? false;

export const selectStepsBorders = createSelector(
  [selectLumexStepsData],
  (steps) => steps.map((step) => step.to),
);

export const selectActiveStep = createSelector(
  [selectLumexDetectorProgramData],
  (programData) => programData?.activeStep ?? -1,
);
