import { createSelector } from '@reduxjs/toolkit';

import {
  STREAMING_STATUSES, MEASUREMENT_STATUSES, PREPARATION_STATUSES, INITIALIZED_STATUSES,
  PLACEHOLDER_REGEX,
} from '../../../constants/constants';
import { checkIsPlaceholder } from '../../../utils/validation';

export const selectIsMeasurement = (state, tabId) => state.measurementReducer.measurements
  .some((file) => file.id === tabId);

export const selectMainMeasurementStatus = (state) => state.measurementReducer.measurementStatus;

export const selectMeasStatusById = (state, tabId) => state.measurementReducer.measurements
  .find((meas) => meas.id === tabId)?.status ?? null;

export const selectIsMainStreaming = createSelector(
  [selectMainMeasurementStatus],
  (status) =>
    /* console.log(status, STREAMING_STATUSES.includes(status)); */
    STREAMING_STATUSES.includes(status),

);

export const selectIsThisMeasurementActive = (state, panelId) => panelId === state.measurementReducer.streamedMeasurementId && state.measurementReducer.streamedMeasurementId;

export const isThisTabMeasurementRunning = createSelector(
  [selectIsThisMeasurementActive, selectMainMeasurementStatus],
  (isMeasurementActive, status) => isMeasurementActive && (status === MEASUREMENT_STATUSES.MEASUREMENT_RUNNING),
);

export const isThisTabStreaming = createSelector(
  [selectIsThisMeasurementActive, selectMainMeasurementStatus],
  (isMeasurementActive, status) => isMeasurementActive && (STREAMING_STATUSES.includes(status)),
);

export const selectIsWritingBaseLine = createSelector(
  [selectMainMeasurementStatus],
  (status) => PREPARATION_STATUSES.includes(status),
);

export const selectIsMeasureInit = (state, measurementId) => state.measurementReducer.measurements
  .some((measurement) => measurement.id === measurementId && INITIALIZED_STATUSES.includes(measurement.status));

export const selectMeasurements = (state) => state.measurementReducer.measurements;

export const selectMeasCount = createSelector(
  [selectMeasurements],
  (measurements) => measurements.length ?? 0,
);

export const selectAllMeasNames = createSelector(
  [selectMeasurements],
  (measurements) => measurements.map((meas) => meas?.name ?? null),
);

export const selectAllPlaceholderNames = createSelector(
  [selectAllMeasNames],
  (names) => names.filter((nm) => checkIsPlaceholder(nm)),
);

export const selectNextPlaceholderNumber = createSelector(
  [selectAllPlaceholderNames],
  (placeholders) => {
    const numbers = placeholders
      .map((nm) => {
        const match = nm.match(PLACEHOLDER_REGEX);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n) => n !== null);

    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  },
);

export const selectNextPlaceholderName = createSelector(
  [selectNextPlaceholderNumber],
  (num) => `Хроматографическое измерение [${num}]`,
);

export const selectStreamedMeasurementId = (state) => state.measurementReducer.streamedMeasurementId;

export const selectMeasurementEntries = selectMeasurements; // HACK refactor dublicate later

export const selectMeasurementEntriesToOpen = createSelector(
  [selectMeasurements],
  (entries) => entries.filter((entry) => entry.shouldOpen),
);

export const selectMeasurementEntriesToClose = createSelector(
  [selectMeasurements],
  (entries) => entries.filter((entry) => entry.shouldClose),
);

export const selectMeasName = (state, tabId) => state.measurementReducer.measurements
  .find((meas) => meas.id === tabId)?.name;

export const selectMeasurementDataSnapshotEntry = (state, id) => state.measurementReducer.snapshots.data[id] ?? null;

export const selectMeasurementDataSnapshotPayload = (state, id) => state.measurementReducer.snapshots.data[id]?.payload ?? null;

export const selectMeasurementDataSnapshotTime = (state, id) => state.measurementReducer.snapshots.data[id]?.takenAt ?? null;

export const selectMeasurementMethodSnapshotEntry = (state, id) => state.measurementReducer.snapshots.method[id] ?? null;

export const selectMeasurementMethodSnapshotPayload = (state, id) => state.measurementReducer.snapshots.method[id]?.payload ?? null;

export const selectMeasurementMethodSnapshotTime = (state, id) => state.measurementReducer.snapshots.method[id]?.takenAt ?? null;

export const selectMeasurementMethodSnapshotMethod = (state, id) => state.measurementReducer.snapshots.method[id]?.method ?? null;

export const selectMeasurmentSourcePath = (state, id) =>  state.measurementReducer.measurements
  .find((meas) => meas.id === id)?.sourcePath;