import { createSelector } from '@reduxjs/toolkit';
import { selectCalibTabCalibration, selectGenCalibsByMethod } from './calibBase';
import { selectTabMethod } from '../method/methodDerived';

export const selectIsCalibTabCalibGen = createSelector(
  [
    (state, props) => selectCalibTabCalibration(state, props.tabId),
    (state, props) => selectGenCalibsByMethod(state, selectTabMethod(state, props.tabId)),
  ],
  (calibration, generalCalibrations) => {
    const isNotNullish = calibration !== null && calibration !== undefined;
    return isNotNullish && generalCalibrations.includes(calibration);
  },
);
