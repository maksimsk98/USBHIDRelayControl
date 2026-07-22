import { createSelector } from '@reduxjs/toolkit';

import {
  selectActiveTab, selectActiveTabType, selectAllFileCalibsObj, selectStoredCalibTabOriginFile, selectTabType,
} from '../../reduxImportDispatcher';
import { EMPTY_ARRAY, TAB_TYPES } from '../../../constants/constants';

export const selectActiveTabFileCalibs = createSelector(
  [selectActiveTab, selectActiveTabType, selectAllFileCalibsObj],
  (activeTab, tabType, fileCalibsObj) => {
    if (tabType === TAB_TYPES.FILE) return fileCalibsObj[activeTab];
    return EMPTY_ARRAY;
  },
);

export const selectTabCalibOriginFile = createSelector( // TODO check it is id not name
  [
    (_, props) => props.tabId,
    (state, props) => selectTabType(state, props.tabId),
    /*     (_, props) => props.calibration,
    (state, props) => selectFileCalibsById(state, props.tabId),  */
    (state, props) => selectStoredCalibTabOriginFile(state, props.tabId),
  ],
  (tabId, tabType, /*  calibration, fileCalibs, */ calibTabOrigin) => {
    if (tabId === null) return null;
    if (tabType === 'file') {
      // i was told to count as origin not only calibs loaded from file, BUT file that was active tab when calib opened

      /*       if (isArray(fileCalibs) && fileCalibs.includes(calibration)) {
        return tabId
        } */

      return tabId;
    }
    if (tabType === 'calibration') {
      return calibTabOrigin;
    }
    return null;
  },
);
