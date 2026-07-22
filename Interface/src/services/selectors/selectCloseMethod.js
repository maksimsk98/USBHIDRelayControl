import { createSelector } from '@reduxjs/toolkit';

import {
  selectIsOpened, selectIsMeasureInit, selectIsActiveCalibTab, selectIsPackage,
} from '../reduxImportDispatcher';
import { TAB_TYPES } from '../../constants/constants';

export const selectCloseMethod = createSelector(
  [selectIsOpened, selectIsMeasureInit, selectIsActiveCalibTab, selectIsPackage],
  (isOpened, isMeasurInit, isCalibTab, isPackage) => {
    if (!isOpened && !isMeasurInit && !isCalibTab && !isPackage) return 'uninitialized';
    if (isMeasurInit) return 'startedClose';
    if (isOpened) return 'openedClose';
    if (isCalibTab) return 'calibClose';
    if (isPackage) return TAB_TYPES.PACKAGE;
    return 'error'; // Safe fallback, just in case
  },
);
