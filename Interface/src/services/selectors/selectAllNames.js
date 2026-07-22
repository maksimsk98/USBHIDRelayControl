import { createSelector } from '@reduxjs/toolkit';
import { selectMeasurements, selectOpenedFiles } from '../reduxImportDispatcher';

export const selectAllNames = createSelector(
  [
    selectMeasurements,
    selectOpenedFiles,
  ],
  (measurements, files) => {
    const measurementNames = Object.values(measurements).map((entry) => entry.name).filter((name) => name);
    const fileIds = Object.values(files).map((entry) => entry.id).filter((id) => id);

    const fileNames = fileIds.map((id) => id.replace(/\.mdfx$/, ''));

    return [...measurementNames, ...fileNames];
  },
);
