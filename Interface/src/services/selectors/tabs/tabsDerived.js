import { createSelector } from '@reduxjs/toolkit';

import {
  selectCalibrationTabs,
  selectIsMeasureInit,
  selectMeasurements,
  selectIsOpened,
  selectAllFiles,
  selectActiveTab,
  selectIsActTabMeasurFinished,
  selectIsActiveTabOpened,
  selectIsTabMeasurFinished,
  selectAllPackages,
} from '../../reduxImportDispatcher';
import { MEASUREMENT_TYPES, TAB_TYPES } from '../../../constants/constants';

export const selectTabType = createSelector(
  [
    (_, tabId) => tabId,
    selectMeasurements,
    selectAllFiles,
    selectCalibrationTabs,
    selectAllPackages,
  ],
  (tabId, measurements, openedFiles, calibrationTabs, packageTabs) => {
    if (!tabId) return TAB_TYPES.NONE;

    if (measurements.find((measurement) => measurement.id === tabId)) {
      return TAB_TYPES.MEASUREMENT;
    }

    if (openedFiles.find((openedFile) => openedFile.id === tabId)) {
      return TAB_TYPES.FILE;
    }

    if (calibrationTabs.find((calibTab) => calibTab.id === tabId)) {
      return TAB_TYPES.CALIBRATION;
    }

    if (packageTabs.find((packageTab) => packageTab.id === tabId)) {
      return TAB_TYPES.PACKAGE;
    }

    return TAB_TYPES.UNKNOWN;
  },
);

export const selectActiveTabType = createSelector(
  [selectActiveTab, (state) => state],
  (activeTab, state) => selectTabType(state, activeTab),
);

export const selectIsTabInitialized = createSelector( // this selector is needed to find if tab has queues on server
  [selectIsOpened, selectIsMeasureInit],
  (isOpened, isMeasureInit) => isOpened || isMeasureInit,
);

export const selectIsActiveTabFinished = createSelector( // this selector is needed to find if tab has queues on server
  [selectIsActTabMeasurFinished, selectIsActiveTabOpened],
  (isFinished, isOpened) => isOpened || isFinished,
);

export const selectIsTabFinished = createSelector( // this selector is needed to find if tab has queues on server
  [selectIsTabMeasurFinished, selectIsOpened],
  (isFinished, isOpened) => isOpened || isFinished,
);

export const selectTabMeasurementType = (state, tabId) => {
  const measurements = selectMeasurements(state);
  const measurement = measurements.find(
    (measurement) => measurement.id === tabId,
  );

  if (measurement) {
    return measurement?.type ?? MEASUREMENT_TYPES.unknown;
  }

  const openedFiles = selectAllFiles(state);
  const openedFile = openedFiles.find(
    (file) => file.id === tabId,
  );

  return openedFile
    ? openedFile.type ?? MEASUREMENT_TYPES.unknown
    : null;
};
