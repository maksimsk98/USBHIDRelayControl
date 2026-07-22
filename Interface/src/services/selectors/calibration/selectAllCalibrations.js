import { createSelector } from '@reduxjs/toolkit';
import { selectAllFileCalibs, selectGenCalibsByMethod } from '../../reduxImportDispatcher';

export const selectAllCalibrations = createSelector(
  [
    (state, props) => selectGenCalibsByMethod(state, props.method), // gets calbis for method
    (state, props) => selectAllFileCalibs(state, props.tabId), // gets calibs from file
  ],
  (generalCalibrations, fileCalibrations) => {
    // Combine both lists while avoiding duplicate calibrations
    const allCalibrationsSet = new Set(generalCalibrations.concat(fileCalibrations));
    return Array.from(allCalibrationsSet);
  },
);
