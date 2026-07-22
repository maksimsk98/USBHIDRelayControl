import { createSelector } from '@reduxjs/toolkit';
import { selectFileNameById, selectMeasurementName, selectPackageNameById } from '../reduxImportDispatcher';

export const selectNameById = createSelector(
  [
    (state, id) => selectMeasurementName(state, id),
    (state, id) => selectFileNameById(state, id),
    (state, id) => selectPackageNameById(state, id),
  ],
  (measurementName, fileName, packageName) => measurementName ?? fileName ?? packageName ?? null,
);
