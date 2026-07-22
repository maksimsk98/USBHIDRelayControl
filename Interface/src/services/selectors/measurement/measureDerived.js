import { createSelector } from '@reduxjs/toolkit';

import {
  selectActiveTab, selectMeasurements, selectStreamedMeasurementId,
} from '../../reduxImportDispatcher';
import { INITIALIZED_STATUSES, MEASUREMENT_STATUSES, MEASUREMENT_TYPES } from '../../../constants/constants';

export const selectActiveMeasurementCalibration = createSelector(
  [selectActiveTab, selectMeasurements],
  (activeTab, measurements) => {
    const foundMeasurement = measurements.find((measurement) => measurement.id === activeTab);
    return foundMeasurement?.calibration; /* ?? null; */ // this abscures when value is undefined or null
  },
);

export const selectIsActTabMeasurFinished = createSelector(
  [selectActiveTab, selectMeasurements],
  (activeTab, measurements) => {
    const foundMeasurement = measurements.find((measurement) => measurement.id === activeTab);
    return foundMeasurement?.status === MEASUREMENT_STATUSES.MEASUREMENT_FINISHED;
  },
);

export const selectIsTabMeasurFinished = createSelector(
  [(_, id) => id, selectMeasurements],
  (id, measurements) => {
    const foundMeasurement = measurements.find((measurement) => measurement.id === id);
    return foundMeasurement?.status === MEASUREMENT_STATUSES.MEASUREMENT_FINISHED;
  },
);

export const selectActiveMeasurementType = createSelector(
  [selectActiveTab, selectMeasurements],
  (activeTab, measurements) => {
    const foundMeasurement = measurements.find((measurement) => measurement.id === activeTab);
    return foundMeasurement?.type;
  },
);

export const selectMeasurementName = createSelector(
  [(state, tabId) => tabId, selectMeasurements],
  (tabId, measurements) => {
    const foundMeasurement = measurements.find((measurement) => measurement.id === tabId);
    return foundMeasurement?.name ?? null;
  },
);

export const selectStreamedMeasName = createSelector(
  [
    selectStreamedMeasurementId,
    selectMeasurements,
  ],
  (streamedId, measurements) => measurements
    .find((meas) => meas.id === streamedId)?.name ?? null,
);

export const selectChromaMeasurements = createSelector(
  [selectMeasurements],
  (measurements) => measurements.filter((m) => m.type === MEASUREMENT_TYPES.chroma),
);

export const selectChromaMeasurementIds = createSelector(
  [selectChromaMeasurements],
  (measurements) => measurements.map((m) => m.id),
);

export const selectSpectroMeasurements = createSelector(
  [selectMeasurements],
  (measurements) => measurements.filter((m) => m.type === MEASUREMENT_TYPES.spectro),
);

export const selectSpectroMeasurementIds = createSelector(
  [selectSpectroMeasurements],
  (measurements) => measurements.map((m) => m.id),
);

export const selectUninitializedMeasurements = createSelector(
  [selectMeasurements],
  (measurements) =>
    measurements.filter(
      (measurement) => !INITIALIZED_STATUSES.includes(measurement.status)
    ),
);

export const selectUninitializedMeasurementIds = createSelector(
  [selectUninitializedMeasurements],
  (uninitializedMeasurements) =>
    uninitializedMeasurements.map((m) => m.id),
);