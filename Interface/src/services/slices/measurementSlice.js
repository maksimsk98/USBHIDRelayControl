import { createSlice } from '@reduxjs/toolkit';

import { MEASUREMENT_STATUSES } from '../../constants/constants';

const initialState = {
  measurementStatus: MEASUREMENT_STATUSES.INACTIVE,
  streamedMeasurementId: null,
  streamedMeasurementType: null,
  measurements: [], // This will now contain objects with { id, type, status, method, calibration }

  snapshots: {
    data: {}, // [measurementId]: { payload, takenAt }
    method: {}, // [measurementId]: { payload, takenAt, method }
  },
};

/* eslint-disable no-param-reassign */
const measurementSlice = createSlice({
  name: 'measurement',
  initialState,
  reducers: {
    addMeasurement: (state, action) => {
      const {
        id, type, method = null,
        calibration = null, name = null,
        shouldOpen = false, shouldClose = false,
        sourceId = null, sourcePath = null
      } = action.payload;
      state.measurements.push({
        id,
        type,
        status: MEASUREMENT_STATUSES.INACTIVE,
        method,
        calibration,
        name,
        shouldOpen,
        shouldClose,
        sourceId,
        sourcePath
      });
    },
    copyMeasurement: (state, action) => {
      const {
        sourceId, targetId, name = null, shouldOpen = false,
      } = action.payload;
      const foundMeasurement = state.measurements.find((measurement) => measurement.id === sourceId);

      if (foundMeasurement) {
        const {
          type,
          method,
          calibration,
        } = foundMeasurement;
        state.measurements.push({
          id: targetId,
          type,
          method,
          calibration,
          name,
          shouldOpen,
          status: MEASUREMENT_STATUSES.INACTIVE,
        });
      } else {
        console.error('no measurement found', sourceId);
      }
    },
    appendDetectorType: (state, action) => {
      const { id, detectorType } = action.payload;
      console.log(id, detectorType);
      const foundMeasurement = state.measurements.find((measurement) => measurement.id === id);

      if (foundMeasurement && detectorType) {
        foundMeasurement.detectorType = detectorType;
      } else {
        console.error(`Can't append (${detectorType}) detector to measurement (${foundMeasurement})`);
      }
    },
    changeMethodAndCheckCalib: (state, action) => {
      const { id, method, isCalibGeneral = false } = action.payload;
      const foundMeasurement = state.measurements.find((measurement) => measurement.id === id);

      if (foundMeasurement && method !== undefined) {
        foundMeasurement.method = method;
        if (!isCalibGeneral) {
          foundMeasurement.calibration = null;
        }
      }
    },
    changeCalibration: (state, action) => {
      const { id, calibration } = action.payload;
      const foundMeasurement = state.measurements.find((measurement) => measurement.id === id);

      if (foundMeasurement && calibration !== undefined) {
        foundMeasurement.calibration = calibration;
      }
    },
    changeMethod: (state, action) => {
      const { id, method } = action.payload;
      const foundMeasurement = state.measurements.find((measurement) => measurement.id === id);

      if (foundMeasurement && method !== undefined) {
        foundMeasurement.method = method;
        foundMeasurement.calibration = null;
      }
    },
    changeName: (state, action) => {
      const { id, name } = action.payload;
      const foundMeasurement = state.measurements.find((measurement) => measurement.id === id);

      if (foundMeasurement && name != undefined) { // != null is not the best also
        foundMeasurement.name = name;
      } else {
        console.error(`failed changing name for "${id}" to "${name}"`);
      }
    },
    changeCurStreamStatus: (state, action) => {
      const status = action.payload;
      state.measurementStatus = status;
      const runningMeasureId = state.streamedMeasurementId;
      const foundMeasurement = state.measurements.find((measurement) => measurement.id === runningMeasureId);
      foundMeasurement.status = status;
    },
    stopMeasurement: (state) => {
      state.measurementStatus = MEASUREMENT_STATUSES.MEASUREMENT_FINISHED;
      const tabId = state.streamedMeasurementId;

      const foundMeasurement = state.measurements.find((measurement) => measurement.id === tabId);
      foundMeasurement.status = MEASUREMENT_STATUSES.MEASUREMENT_FINISHED;

      state.streamedMeasurementId = null;
      state.streamedMeasurementType = null;
      console.log(`measurement chroma stopped ${tabId}`);
    },
    closeMeasurement: (state, action) => {
      const tabId = action.payload;

      const existing = state.measurements.find((m) => m.id === tabId);
      if (!existing) {
        // irrelevant close, do nothing safely
        return;
      }

      const prevLength = state.measurements.length;
      const measurementType = existing.type;

      state.measurements = state.measurements
        .filter((measurement) => measurement.id !== tabId);
      const wasRemoved = state.measurements.length < prevLength;

      if (state.streamedMeasurementId === tabId) {
        state.measurementStatus = MEASUREMENT_STATUSES.INACTIVE;
        state.streamedMeasurementId = null;
        state.streamedMeasurementType = null;
      }

      delete state.snapshots.data[tabId];
      delete state.snapshots.method[tabId];

      if (wasRemoved) {
        console.log(`measurement ${measurementType} was closed and removed from redux ${tabId}`);
      }
    },
    startMeasurement: (state, action) => {
      const { tabId, type = 'chroma' } = action.payload; // for now when no other type is available
      state.measurementStatus = MEASUREMENT_STATUSES.AWAITING_BACKEND;
      state.streamedMeasurementId = tabId;
      state.streamedMeasurementType = type;

      const foundMeasurement = state.measurements.find((measurement) => measurement.id === tabId);
      foundMeasurement.status = MEASUREMENT_STATUSES.AWAITING_BACKEND;
      console.log(`measurement chroma started ${tabId}`);
    },
    markAsOpened: (state, action) => {
      const { tabId } = action.payload;

      const foundMeasurement = state.measurements.find((measurement) => measurement.id === tabId);
      if (foundMeasurement) {
        foundMeasurement.shouldOpen = false;
      } else {
        console.error('No measurement to mark as opened');
      }
    },
    markForClosure: (state, action) => {
      const { tabId } = action.payload;

      const foundMeasurement = state.measurements.find((measurement) => measurement.id === tabId);
      if (foundMeasurement) {
        foundMeasurement.shouldClose = true;
      } else {
        console.error('No measurement to mark for closure');
      }
    },

    setDataSnapshot: (state, action) => {
      const { id, payload, takenAt = Date.now() } = action.payload;

      state.snapshots.data[id] = {
        payload,
        takenAt,
      };
    },

    clearDataSnapshot: (state, action) => {
      const { id } = action.payload;
      delete state.snapshots.data[id];
    },

    setMethodSnapshot: (state, action) => {
      const {
        id, payload, method, takenAt = Date.now(),
      } = action.payload;

      state.snapshots.method[id] = {
        payload,
        method,
        takenAt,
      };
    },

    clearMethodSnapshot: (state, action) => {
      const { id } = action.payload;
      delete state.snapshots.method[id];
    },
  },
});
/* eslint-disable no-param-reassign */

export default measurementSlice.reducer;
export const measurementActions = measurementSlice.actions;
