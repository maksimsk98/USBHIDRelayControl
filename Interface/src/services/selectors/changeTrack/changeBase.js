import { createSelector } from '@reduxjs/toolkit';

// some alterations are not tracked like adding to package cause they finalize on close, so look at altered data there
export const selectTabMarkedAsChanged = (state, measurementId) => state.changeTrackerReducer[measurementId]?.hasAlteredData ?? false; // if this measurement hasn't yet made any changes (didn't start) it is undefined which default to false;

export const selectAllDirtyChangeIds = (state) => Object.entries(state.changeTrackerReducer)
  .filter(([, value]) => value.hasAlteredData)
  .map(([id]) => id);

export const selectAppHasChromaAlteredData = createSelector(
  [selectAllDirtyChangeIds],
  (changedIds) => changedIds.length > 0,
);
