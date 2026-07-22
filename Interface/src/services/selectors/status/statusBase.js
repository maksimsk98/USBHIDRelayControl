import { NODE_STATUSES } from '../../../constants/constants';

export const selectThermostatData = (state) => state.statusReducer
  .data.thermostat;

export const selectIsDetectorConnected = (state) => state.statusReducer
  .data.detector.status === NODE_STATUSES.CONNECTED;

export const selectIsThermostatConnected = (state) => state.statusReducer
  .data.thermostat.status === NODE_STATUSES.CONNECTED;

export const selectIsPumpA1Connected = (state) => state.statusReducer
  .data.pumps.A1.status === NODE_STATUSES.CONNECTED;

export const selectIsPumpB1Connected = (state) => state.statusReducer
  .data.pumps.B1.status === NODE_STATUSES.CONNECTED;

export const selectIsPumpA2Connected = (state) => state.statusReducer
  .data.pumps.A2.status === NODE_STATUSES.CONNECTED;

export const selectIsPumpB2Connected = (state) => state.statusReducer
  .data.pumps.B2.status === NODE_STATUSES.CONNECTED;

export const selectStatusData = (state) => state.statusReducer.data;

export const selectDetectorStatusData = (state) => state.statusReducer.data.detector;
export const selectThermostatStatusData = (state) => state.statusReducer.data.thermostat;
export const selectPumpsStatusData = (state) => state.statusReducer.data.pumps;

export const selectIsBackendOnline = (state) => state.statusReducer.data.isBackendOnline;

export const selectDegasserState = (state) => state.statusReducer.data.pumps.degasser.state;

export const selectDetectorInitializingProgress = (state) => state.statusReducer.data.detector.initializingProgress;

export const selectIsDetectorInitializing = (state) => {
  const p = state.statusReducer.data.detector.initializingProgress;
  return typeof p === 'number' && p < 100;
};
