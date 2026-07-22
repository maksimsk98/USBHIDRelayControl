import { createSelector } from '@reduxjs/toolkit';
import { MEASUREMENT_STATUSES } from '../../constants/constants';
import { selectMeasurements, selectAllFiles, selectCalibTabDetector } from '../reduxImportDispatcher';

export const selectUsedDetectorType = createSelector(
  [
    selectAllFiles,
    selectMeasurements,
    selectCalibTabDetector,
    (_, tabId) => tabId,
  ],
  (openedFiles, measurements, calibTabDetector, tabId) => {
    const fileEntry = openedFiles.find((file) => file.id === tabId);

    const measurementEntry = measurements.find(
      (m) => m.id === tabId && m.status === MEASUREMENT_STATUSES.MEASUREMENT_FINISHED,
    );

    const detectorType = fileEntry?.detectorType ?? measurementEntry?.detectorType ?? calibTabDetector ?? null

    return detectorType;
  },
);
