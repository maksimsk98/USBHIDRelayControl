import { createSelector } from '@reduxjs/toolkit';

export const selectWholePumpProgram = (state, measurementId) => state.pumpProgramReducer[measurementId];

export const selectPumpProgramData = createSelector(
  [selectWholePumpProgram],
  (pumpProgramData) => {
    // This will only recalculate if `pumpProgramReducer[measurementId]` changes
    if (!pumpProgramData) return null;
    const { pumpMode, isocratProgram, gradientProgram } = pumpProgramData;
    return {
      pumpMode,
      ...(pumpMode === 'isocrat' && { isocratProgram }),
      ...(pumpMode === 'gradient' && { gradientProgram }),
    };
  },
);

export const selectIsocratProgram = (state, parentId) => state.pumpProgramReducer[parentId]?.isocratProgram;

export const selectPumpMode = (state, parentId) => state.pumpProgramReducer[parentId]?.pumpMode;

export const selectPumpParams = (state) => state.pumpProgramReducer.generalParams;

export const selectActiveStage = (state, parentId) => state.pumpProgramReducer[parentId]?.activeStage;
