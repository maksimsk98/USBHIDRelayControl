import { createSelector } from '@reduxjs/toolkit';

import {
  selectActiveTab,
  selectMeasurements,
  selectAllFiles,
  selectCalibrationTabs,
  selectSelectedCalibration,
  selectFileCalibsById,
  selectOriginFileCalibs,
  selectIsMarkedForClose,
  selectStoredCalibTabOriginFile,
  selectCalibTabCalibration,
  selectCalibTabMethod,
} from '../../reduxImportDispatcher';
import { EMPTY_ARRAY } from '../../../constants/constants';

export const selectActiveTabCalibration = createSelector(
  [selectActiveTab, selectMeasurements, selectAllFiles, selectCalibrationTabs],
  (activeTab, measurements, allFiles, calibrationTabs) => {
    if (!activeTab) return undefined;

    const foundMeasurement = measurements.find((measurement) => measurement.id === activeTab);
    const foundOpenedFile = allFiles.find((openedFile) => openedFile.id === activeTab);
    const foundCalibrationTabs = calibrationTabs.find((calibTab) => calibTab.id === activeTab);

    if (activeTab && !foundMeasurement && !foundOpenedFile && !foundCalibrationTabs) {
      return undefined;
    }
    // allow undefined for further logic
    const calibration = [foundMeasurement?.calibration, foundOpenedFile?.calibration, foundCalibrationTabs?.calibration]
      .find((value) => value !== undefined);
    return calibration;
  },
);

export const selectCalibrationByTabId = createSelector(
  [
    (_, tabId) => tabId,
    selectMeasurements,
    selectAllFiles,
    selectCalibrationTabs,
  ],
  (tabId, measurements, allFiles, calibrationTabs) => {
    if (!tabId) return null;

    const foundMeasurement = measurements.find((m) => m.id === tabId);
    const foundOpenedFile = allFiles.find((f) => f.id === tabId);
    const foundCalibrationTab = calibrationTabs.find((c) => c.id === tabId);

    // если tabId есть, но ни в одном источнике не найден — явно undefined
    if (!foundMeasurement && !foundOpenedFile && !foundCalibrationTab) {
      return null;
    }

    // приоритет — первый определённый
    return (
      foundMeasurement?.calibration
      ?? foundOpenedFile?.calibration
      ?? foundCalibrationTab?.calibration
      ?? null
    );
  },
);

export const isActiveMarkedForClose = createSelector(
  [selectActiveTab, (state) => state],
  (activeTab, state) => {
    if (!activeTab) return false;

    return selectIsMarkedForClose(state, activeTab);
  },
);

export const selectIsActiveCalibTab = createSelector(
  [selectActiveTab, selectCalibrationTabs],
  (activeTab, calibrationTabs) => {
    if (!activeTab) return false;

    // Check if the active tab exists in the list of calibration tabs
    const isActiveCalibTab = calibrationTabs.some((tab) => tab.id === activeTab);

    return isActiveCalibTab;
  },
);

export const selectCalibrationForDisplay = createSelector(
  [selectActiveTabCalibration, selectSelectedCalibration],
  (activeTabCalibration, selectedCalibration) => (activeTabCalibration === undefined ? selectedCalibration : activeTabCalibration),
);

export const selectAllFileCalibs = createSelector(
  [
    selectFileCalibsById,
    selectOriginFileCalibs,
  ],
  (currentFileCalibs, originFileCalibs) => {
    if (currentFileCalibs.length > 0) return currentFileCalibs;
    if (originFileCalibs.length > 0) return originFileCalibs;

    return EMPTY_ARRAY;
  },
);

export const selectIsSelCalibArchived = createSelector(
  [
    (state, props) => selectAllFileCalibs(state, props.tabId),
    (state, props) => props.calib,
  ],
  (currentFileCalibs, calib) => currentFileCalibs.includes(calib),
);

export const selectCalibDescriptors = createSelector(
  [
    (state, calibrationTabId) => selectCalibTabCalibration(state, calibrationTabId),
    (state, calibrationTabId) => selectStoredCalibTabOriginFile(state, calibrationTabId),
    (state, calibrationTabId) => selectCalibTabMethod(state, calibrationTabId),
  ],
  (calibration, chromaFileId, method) => ({
    calibration,
    chromaFileId,
    method,
  }),
);
