import { createSelector } from "@reduxjs/toolkit";
import { EMPTY_ARRAY } from "../../../constants/constants";

export const selectRIDSlice = (state) => state.RIDReducer

export const selectRIDProgramData = (state, parentId) => state.RIDReducer[parentId];

export const selectRIDStepsData = createSelector(
    [selectRIDProgramData],
    (programData) => programData?.steps ?? EMPTY_ARRAY
);

export const selectRIDExportProgram = createSelector(
  [(state, tabId) => selectRIDProgramData(state, tabId)],
  (RIDprogram) => {
    if (!RIDprogram) return null;
    return {stepsData: RIDprogram.steps}
  }
);

export const selectRIDParamsData = createSelector(
    [selectRIDProgramData],
    (programData) => programData?.params ?? null
);

export const selectRIDLastStepTo = createSelector(
  [selectRIDStepsData],
  (stepsData) => {
    if (!stepsData || stepsData.length === 0) {
      return 600; // WATCHLIST TODO CONST
    }
    const stepBorders = stepsData.map((step) => step.to);
    const lastStepTo = Math.max(...stepBorders);
    return lastStepTo;
  },
);

export const selectIsRIDRedacting = createSelector(
  [(state, tabId) => selectRIDProgramData(state, tabId)],
  (RIDprogram) => {
    if (!RIDprogram) return false;
    return RIDprogram?.isRedacting ?? false;
  },
);