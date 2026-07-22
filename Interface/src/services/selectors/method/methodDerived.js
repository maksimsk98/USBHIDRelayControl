import { createSelector } from '@reduxjs/toolkit';

import {
  selectMeasurements,
  selectAllFiles,
  selectCalibrationTabs,
  selectActiveTab,
  selectFilesMethodsObject,
  selectGeneralMethods,
  selectSelectedMethod,
  selectDetectorType,
  selectUsedDetectorType,
  selectAutoControlSessionId,
} from '../../reduxImportDispatcher';

const findMethodForTab = (tabId, measurements, openedFiles, calibrationTabs) => {
  if (!tabId) {
    /* console.warn('no tab id for find tab method') */
    return undefined;
  }

  const foundMeasurement = measurements.find((measurement) => measurement.id === tabId);
  const foundOpenedFile = openedFiles.find((openedFile) => openedFile.id === tabId);
  const foundCalibrationTab = calibrationTabs.find((calibTab) => calibTab.id === tabId);

  if (!foundMeasurement && !foundOpenedFile && !foundCalibrationTab) {
    return undefined;
  }

  return [foundMeasurement?.method, foundOpenedFile?.method, foundCalibrationTab?.method]
    .find((value) => value !== undefined);
};

export const selectTabMethod = createSelector(
  [(state, tabId) => tabId, selectMeasurements, selectAllFiles, selectCalibrationTabs],
  (id, meas, files, calibs) =>
    /* console.log(id, meas, files, calibs) */
    findMethodForTab(id, meas, files, calibs),

);

export const selectActiveTabMethod = createSelector(
  [selectActiveTab, selectMeasurements, selectAllFiles, selectCalibrationTabs],
  findMethodForTab,
);

export const selectActiveTabFileMethod = createSelector(
  [selectActiveTab, selectFilesMethodsObject],
  (activeTab, openedFilesMethods) => openedFilesMethods[activeTab],
);

export const selectAllMethods = createSelector(
  [selectGeneralMethods, selectActiveTabFileMethod],
  (generalMethods, activeTabFileMethod) => (activeTabFileMethod
    ? [...new Set([...generalMethods, activeTabFileMethod])]
    : generalMethods),
);

export const selectMethodForDisplay = createSelector(
  [selectActiveTabMethod, selectSelectedMethod],
  (activeTabMethod, selectedMethod) => (activeTabMethod === undefined ? selectedMethod : activeTabMethod),
);

export const selectActiveTabMethodParams = createSelector(
  [selectActiveTabMethod, (state) => state.methodReducer],
  (activeTabMethod, methodReducer) => {
    const method = activeTabMethod === undefined ? null : activeTabMethod; // if active tab has no method or there is no active tab, default to null method
    const methodData = methodReducer.methodsData[method] ?? methodReducer.methodsData.null; // WATCHLIST patch with defaults for now
    return methodData;
  },
);

export const selectInstrumentForMetod = createSelector(
  [
    (state, tabId) => selectDetectorType(state),
    (state, tabId) => selectUsedDetectorType(state, tabId),
  ],
  (chosenDetector, usedDetector) => usedDetector ?? chosenDetector // detector used for files and selected for new measurement
  ,
);

export const selectTabMethodParams = createSelector(
  [selectTabMethod, (state) => state.methodReducer],
  (tabMethod, methodReducer) => {
    const method = tabMethod === undefined ? null : tabMethod; // if tab has no method or there is no active tab, default to null method
    console.log(method, methodReducer)
    return methodReducer.methodsData[method];
  },
);

export const selectTabSaveToFile = createSelector(
  [selectTabMethodParams],
  (methodParams) => {
    console.log('methodParams', methodParams)
    return methodParams?.optionsSp?.autoSave ?? false
  },
);

export const selectAutoControlCurMethod = createSelector(
  [
    selectAutoControlSessionId,
    selectMeasurements,
  ],
  (sessionId, measurements) => {
    const foundMeasurement = measurements.find((measurement) => measurement.id === sessionId);
    if (!foundMeasurement) {
      console.error('no measurement for sessionId', sessionId, measurements);
      return null;
    }
    return foundMeasurement.method;
  },
);
