import { createSlice } from '@reduxjs/toolkit';

import { NODE_STATUSES } from '../../constants/constants';

const assignStatusWithFallback = (target, source, defaultStatus) => {
  target.status = source?.status ?? defaultStatus;
};

const assignLastPointIfNotUndef = (target, source, property) => {
  const sourceField = source?.[property]?.y;
  const lastValue = sourceField?.[sourceField.length - 1];
  if (lastValue !== undefined) {
    target[property] = lastValue;
  }
};

const assignIfNotNullish = (target, source, property) => {
  if (source[property] !== undefined) {
    target[property] = source[property];
  }
};

const checkBackendOnline = (detector, thermostat, pumps) => {
  const pumpsStatuses = Object.values(pumps).map((pump) => (pump.status === undefined ? NODE_STATUSES.NOT_RESPONSIVE : pump.status));
  const allStatuses = [
    detector.status === undefined ? NODE_STATUSES.NOT_RESPONSIVE : detector.status,
    thermostat.status === undefined ? NODE_STATUSES.NOT_RESPONSIVE : thermostat.status,
    ...pumpsStatuses,
  ];

  return allStatuses.every((status) => status !== NODE_STATUSES.NOT_RESPONSIVE);
};

const initialState = {
  data: {
    detector: {
      wavelength: null,
      sensitivity: null,
      excitationWavelength: null,
      registrationWavelength: null,
      signalFluor: null,
      signalPhoto: null,
      signalRef: null,
      status: NODE_STATUSES.NOT_CONNECTED,
      initializingProgress: null,
      // === Поля для RID === //
      signalRiu: null,
      temperature: null,
      purge: null,
      polarity: null,
      // ==================== //
    },
    thermostat: {
      columnTemp: null,
      roomTemp: null,
      status: NODE_STATUSES.NOT_CONNECTED,
    },
    pumps: {
      A1: {
        flowRate: null, pressure: null, volume: null, volumeMax: null, status: NODE_STATUSES.NOT_CONNECTED, state: null,
      },
      B1: {
        flowRate: null, pressure: null, volume: null, volumeMax: null, status: NODE_STATUSES.NOT_CONNECTED, state: null,
      },
      A2: {
        flowRate: null, pressure: null, volume: null, volumeMax: null, status: NODE_STATUSES.NOT_CONNECTED, state: null,
      },
      B2: {
        flowRate: null, pressure: null, volume: null, volumeMax: null, status: NODE_STATUSES.NOT_CONNECTED, state: null,
      },
      degasser: {
        state: null,
      },
    },
    isBackendOnline: null, // this will keep logical sum of all connection statuses
  },
  loading: false,
  error: null,
};

/* eslint-disable no-param-reassign */
const statusSlice = createSlice({
  name: 'status',
  initialState,
  reducers: {
    updateStatus: (state, action) => {
      const { detectorData, thermostatData, pumpsData: { pumps, degasser } } = action.payload;

      assignStatusWithFallback(state.data.detector, detectorData, NODE_STATUSES.NOT_CONNECTED);
      assignStatusWithFallback(state.data.thermostat, thermostatData, NODE_STATUSES.NOT_CONNECTED);

      Object.keys(pumps).forEach((key) => {
        if (state.data.pumps[key]) {
          assignStatusWithFallback(state.data.pumps[key], pumps[key], NODE_STATUSES.NOT_CONNECTED);
          assignIfNotNullish(state.data.pumps[key], pumps[key], 'state');
        }
      });

      const isBackendOnline = checkBackendOnline(detectorData, thermostatData, pumps);
      state.data.isBackendOnline = isBackendOnline;

      // if type of detector is wrong data will be undefined and not assigned
      assignIfNotNullish(state.data.detector, detectorData, 'wavelength');
      assignIfNotNullish(state.data.detector, detectorData, 'excitationWavelength');
      assignIfNotNullish(state.data.detector, detectorData, 'registrationWavelength');
      assignIfNotNullish(state.data.detector, detectorData, 'sensitivity');
      assignIfNotNullish(state.data.detector, detectorData, 'initializingProgress');

      assignLastPointIfNotUndef(state.data.detector, detectorData, 'signalPhoto');
      assignLastPointIfNotUndef(state.data.detector, detectorData, 'signalFluor');
      assignLastPointIfNotUndef(state.data.detector, detectorData, 'signalRef');
      // === Поля для RID === //
      assignLastPointIfNotUndef(state.data.detector, detectorData, 'signalRiu');
      assignIfNotNullish(state.data.detector, detectorData, 'temperature');
      assignIfNotNullish(state.data.detector, detectorData, 'purge');
      assignIfNotNullish(state.data.detector, detectorData, 'polarity');
      // ==================== //
      assignLastPointIfNotUndef(state.data.thermostat, thermostatData, 'columnTemp');
      assignLastPointIfNotUndef(state.data.thermostat, thermostatData, 'roomTemp');

      Object.keys(pumps).forEach((key) => {
        if (state.data.pumps[key]) {
          const dataSource = pumps[key];

          assignLastPointIfNotUndef(state.data.pumps[key], dataSource, 'flowRate');
          assignLastPointIfNotUndef(state.data.pumps[key], dataSource, 'pressure');
          assignLastPointIfNotUndef(state.data.pumps[key], dataSource, 'volume');

          assignIfNotNullish(state.data.pumps[key], pumps[key], 'volumeMax');
        }
      });

      assignIfNotNullish(state.data.pumps.degasser, degasser, 'state');
    },
  },
});
/* eslint-disable no-param-reassign */

export const statusActions = statusSlice.actions;
export default statusSlice.reducer;
