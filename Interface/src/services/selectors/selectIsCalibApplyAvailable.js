import { createSelector } from '@reduxjs/toolkit';
import {
  selectIsSomeDefinedRef, selectIsPeaksEmpty,
} from '../reduxImportDispatcher';

export const selectIsCalibApplyAvailable = createSelector(
  [
    (state, props) => selectIsPeaksEmpty(state, props.tabId),
    (state, props) => (props.calibration != null),
    /* (state, props) => selectIsCalibGen(state, {calibration: props.calibration, method: props.method}), */ // WATCHLIST Maxim said in pew-1440 that ALL calibs are valid here so don't limit
    (state, props) => selectIsSomeDefinedRef(state, props.tabId),
  ],
  (isPeaksEmpty, isNonNullCalib, isDefinedRef) => isNonNullCalib && !isPeaksEmpty && isDefinedRef,
);
