import { createSelector } from '@reduxjs/toolkit';
import { selectActiveTab } from './tabsBase';
import { selectTabType } from './tabsDerived';
import { selectMeasurementName } from '../measurement/measureDerived';
import { TAB_TYPES } from '../../../constants/constants';
import { selectTabCalibration } from '../calibration/calibDerived';

const selectTitleMap = {
  [TAB_TYPES.MEASUREMENT]: selectMeasurementName,
  [TAB_TYPES.FILE]: () => {}, // TODO add here file name selection after package
  [TAB_TYPES.CALIBRATION]: selectTabCalibration,
};

const selectActiveTabTitle = createSelector(
  [selectActiveTab, selectTabType],
  (activeTab, tabType) => {
    const selector = selectTitleMap[tabType];

    if (!selector) {
      return ''; // Default fallback
    }

    return selector(state, activeTab);
  },
);
