import { createSelector } from '@reduxjs/toolkit';

export const selectTargetTemp = (state) => state.thermostatReducer.data.targetTemp;
export const selectThermoDispersion = (state) => state.thermostatReducer.data.dispersion;
export const selectIsThermostatOn = (state) => state.thermostatReducer.data.isThermostatOn;

export const selectThermoParams = createSelector(
  [selectTargetTemp, selectThermoDispersion],
  (targetTemp, dispersion) => ({ targetTemp, dispersion }),
);
