import { createSelector } from "@reduxjs/toolkit";

export const selectDADState = (state) => state.DADReducer;

export const selectDADProgramData = (state, measurementId) =>
  state.DADReducer?.[measurementId] ?? null;

export const selectDADParams = (state, measurementId) =>
  state.DADReducer?.[measurementId]?.params ?? null;

export const selectDADChannels = (state, measurementId) =>
  state.DADReducer?.[measurementId]?.params?.channels ?? null;

export const selectDADChannel = (state, measurementId, channel) =>
  state.DADReducer?.[measurementId]?.params?.channels?.[channel] ?? null;

export const selectDADParamField = (state, measurementId, field) =>
  state.DADReducer?.[measurementId]?.params?.[field] ?? null;

const DEFAULT_STRING = "";
const DEFAULT_BOOL = false;
const DEFAULT_NUMBER = 0;
const DEFAULT_LAMBDA = null;

export const selectDadStepsData = createSelector(
  [(state, tabId) => selectDADProgramData(state, tabId)],
  (DADprogram) => {
    if (!DADprogram) return null;

    const { steps} = DADprogram;
    return steps
  }
);

export const selectDADExportProgram = createSelector(
  [(state, tabId) => selectDADProgramData(state, tabId)],
  (DADprogram) => {
    if (!DADprogram) return null;
    return {stepsData: DADprogram.steps}
  }
);

export const selectDadParamsData = createSelector(
  [(state, tabId) => selectDADProgramData(state, tabId)],
  (DADprogram) => {
    if (!DADprogram) return null;

    const { params} = DADprogram;
    return params
  }
);

export const selectDadLastStepTo = createSelector(
  [selectDadStepsData],
  (stepsData) => {
    if (!stepsData || stepsData.length === 0) {
      return 600; // WATCHLIST TODO CONST
    }
    const stepBorders = stepsData.map((step) => step.to);
    const lastStepTo = Math.max(...stepBorders);
    return lastStepTo;
  },
);

export const selectIsDadRedacting = createSelector(
  [(state, tabId) => selectDADProgramData(state, tabId)],
  (DADprogram) => {
    if (!DADprogram) return false;
    return DADprogram?.isRedacting ?? false;
  },
);

