import { createSelector } from '@reduxjs/toolkit';

import { EMPTY_ARRAY, EMPTY_OBJECT, NOT_GENERAL_CALIBRATION } from '../../../constants/constants';
import { selectActiveTab } from '../tabs/tabsBase';
import { computeCalibKey } from '../../../utils/calib';

export const selectGenCalibsByMtdEntries = (state, method) => state.calibrationReducer.options[method] ?? EMPTY_ARRAY;

export const selectGenCalibsByMethod = createSelector(
  [selectGenCalibsByMtdEntries],
  (entries) => entries.map((entry) => entry.name),
);

export const selectAllFileCalibsObj = (state) => state.calibrationReducer.openedFileCalibrations ?? EMPTY_OBJECT;
export const selectFileCalibsById = (state, fileId) => state.calibrationReducer.openedFileCalibrations[fileId] ?? EMPTY_ARRAY;

export const selectSelectedCalibration = (state) => state.calibrationReducer.selectedCalibration;

export const selectSelectedCalibrationIfGeneral = createSelector(
  [
    (state, props) => selectSelectedCalibration(state),
    (state, props) => selectGenCalibsByMethod(state, props.method),
  ],
  (selectedCalibration, generalCalibrations) => (generalCalibrations.includes(selectedCalibration) ? selectedCalibration : NOT_GENERAL_CALIBRATION),
);

export const selectIsSelCalibGen = createSelector(
  [
    (state, props) => selectSelectedCalibration(state),
    (state, props) => selectGenCalibsByMethod(state, props.method),
  ],
  (selectedCalibration, generalCalibrations) => generalCalibrations.includes(selectedCalibration),
);

export const selectIsCalibGen = createSelector(
  [
    (_, props) => props?.calibration,
    (state, props) => selectGenCalibsByMethod(state, props.method),
  ],
  (calibration, generalCalibrations) => {
    const isNotNullish = calibration !== null && calibration !== undefined;
    return isNotNullish && generalCalibrations.includes(calibration);
  },
);

export const selectGenCalibType = (state, props) => {
  const foundEntry = state.calibrationReducer.options[props.method]?.find((entry) => entry?.name && entry?.name === props.calibration) ?? EMPTY_OBJECT;
  return foundEntry?.type ?? null;
};

export const selectIsCalibType = createSelector(
  [
    (_, props) => props?.calibration,
    (_, props) => props?.type,
    (state, props) => selectGenCalibsByMethod(state, props.method),
  ],
  (calibration, type, generalCalibrations) => {
    const isNotNullish = calibration !== null && calibration !== undefined;
    return isNotNullish && generalCalibrations.includes(calibration);
  },
);

export const selectCalibrationTabs = (state) => state.calibrationReducer.calibrationTabs;

export const selectCalibrationHashToId = createSelector(
  [selectCalibrationTabs],
  (calibTabs) => {
    if (!calibTabs.length) return {};
    const map = {};
    for (const tab of calibTabs) {
      const hash = computeCalibKey(tab.method, tab.calibration, tab.originFile);
      map[hash] = tab.id; // key = hash, value = tabId
    }
    return map;
  },
);

export const selectCalibrationTabsIds = createSelector(
  [selectCalibrationTabs],
  (calibTabs) => {
    if (!calibTabs.length) return EMPTY_ARRAY;

    return calibTabs.map((tab) => tab.id);
  },
);

export const selectCalibEntriesToFocus = createSelector(
  [
    selectCalibrationTabs,
  ],
  (calibTabs) => {
    if (!calibTabs.length) return EMPTY_ARRAY;

    return calibTabs.filter((entry) => entry.shouldFocus);
  },
);

export const selectCalibTabCalibration = createSelector(
  [selectCalibrationTabs, (state, id) => id],
  (calibTabs, id) => {
    if (!id) return undefined;

    const foundCalibTab = calibTabs?.find((calibTab) => calibTab.id === id);

    if (!foundCalibTab) {
      console.warn(`No calibration found for active tab ${id}`);
      return undefined;
    }

    return foundCalibTab.calibration;
  },
);

export const selectCalibTabMethod = createSelector(
  [selectCalibrationTabs, (state, id) => id],
  (calibTabs, id) => {
    if (!id) return undefined;

    const foundCalibTab = calibTabs?.find((calibTab) => calibTab.id === id);

    if (!foundCalibTab) {
      console.warn(`No method found for active tab ${id}`);
      return undefined;
    }

    return foundCalibTab.method;
  },
);

// selectors for calibration view

export const selectFetchedCalibrationByTabId = (state, tabId) => state.calibrationReducer.fetchedCalibrationData[tabId];

export const selectCalibTabDetector = createSelector(
  [selectFetchedCalibrationByTabId],
  (calibData) => {
    return calibData?.detectorType ?? null;
  },
);

export const selectCompDataById = (state, tabId) => state.calibrationReducer.fetchedCalibrationData[tabId]?.substances;

export const selectCompListByTabId = createSelector(
  [selectCompDataById],
  (components) => {
    if (!components) return [];
    return components.map((comp) => comp.data);
  },
);

export const selectActiveCompIndexByTabId = (state, tabId) => state.calibrationReducer.calibrationTabs.find((tab) => tab.id === tabId)?.activeComponentIndex;

export const selectActiveCompByTabId = createSelector(
  [selectCompDataById, selectActiveCompIndexByTabId],
  (compData, activeCompIndex) => compData[activeCompIndex],
);

export const selectPointsByTabId = createSelector(
  [
    (state, tabId) => selectActiveCompIndexByTabId(state, tabId),
    (state, tabId) => selectCompDataById(state, tabId),
  ],
  (activeComponentIndex, substances) => substances[activeComponentIndex]?.calibrationPoints?.points,
);

export const selectCalibPointsForDisplay = createSelector(
  [selectPointsByTabId],
  (points) => {
    if (!points) {
      return {
        active: { x: [], y: [] },
        disabled: { x: [], y: [] },
      };
    }

    return points.reduce(
      (acc, point) => {
        const group = point.isActive ? acc.active : acc.disabled;
        group.x.push(point.concentration);
        group.y.push(point.response);
        return acc;
      },
      {
        active: { x: [], y: [] },
        disabled: { x: [], y: [] },
      },
    );
  },
);

export const selectCheckPointsByTabId = createSelector(
  [
    (state, tabId) => selectActiveCompIndexByTabId(state, tabId),
    (state, tabId) => selectCompDataById(state, tabId),
  ],
  (activeComponentIndex, substances) => substances[activeComponentIndex]?.calibrationCheck?.points,
);

export const selectCalibrationPassport = createSelector(
  [(state, tabId) => state.calibrationReducer.fetchedCalibrationData[tabId]],
  (fetchedCalibration) => {
    if (!fetchedCalibration) return null;

    return {
      calibrationType: fetchedCalibration.calibrationType,
      column: fetchedCalibration.column,
      correction: fetchedCalibration.correction,
      detector: fetchedCalibration.detector,
      flow: fetchedCalibration.flow,
      operator: fetchedCalibration.operator,
      standard: fetchedCalibration.standard,
      time: fetchedCalibration.time,
      eluentA: fetchedCalibration.eluentA,
      eluentB: fetchedCalibration.eluentB,
    };
  },
);

export const selectCalibrationReport = createSelector(
  [(state, tabId) => state.calibrationReducer.fetchedCalibrationData[tabId]],
  (fetchedCalibration) => {
    if (!fetchedCalibration) return null;
    const report = fetchedCalibration?.report

    return report;
  },
);

export const selectCalibDepFormData = createSelector(
  [
    (state, tabId) => selectActiveCompIndexByTabId(state, tabId),
    (state, tabId) => selectCompDataById(state, tabId),
  ],
  (activeComponentIndex, substances) => {
    const calibrationPoints = substances?.[activeComponentIndex]?.calibrationPoints;

    if (!calibrationPoints) return null;

    return {
      curveTypes: calibrationPoints.curveParameters?.curveFormuleComboBox ?? [],
      statWeights: calibrationPoints.statWeightCombobox ?? [],
      equation: calibrationPoints.curveParameters?.equationStaticCalibration ?? 'не указано',
      absError: calibrationPoints.curveParameters?.valueCalibration_MSD_ABS ?? 'не указано',
      relError: calibrationPoints.curveParameters?.valueCalibration_MSD_REL ?? 'не указано',
      corrCoef: calibrationPoints.curveParameters?.valueCalibration_CORR_COEF ?? 'не указано',
    };
  },
);

export const selectActiveCompNameByTabId = createSelector(
  [selectActiveCompByTabId],
  (activeComponent) => activeComponent?.data?.name ?? null,
);

export const selectFittedCurveByTabId = createSelector(
  [
    (state, tabId) => selectActiveCompIndexByTabId(state, tabId),
    (state, tabId) => selectCompDataById(state, tabId),
  ],
  (activeComponentIndex, substances) => {
    const rawFitted = substances[activeComponentIndex]?.fittedCurve;
    const xValues = rawFitted.map((point) => point.x);
    const yValues = rawFitted.map((point) => point.y);

    return { x: xValues, y: yValues };
  },
);

export const selectStoredCalibTabOriginFile = (state, tabId) => state.calibrationReducer.calibrationTabs.find((tab) => tab.id === tabId)?.originFile ?? null;

export const selectActiveStoredOriginFile = (state) => {
  const activeTab = selectActiveTab(state);
  if (!activeTab) return null;
  const activeStoredOriginFile = selectStoredCalibTabOriginFile(state, activeTab);
  return activeStoredOriginFile ?? null;
};

export const selectOriginFileCalibs = createSelector(
  [selectStoredCalibTabOriginFile, selectAllFileCalibsObj],
  (originFile, fileCalibsObj) => {
    if (!originFile) return EMPTY_ARRAY;

    return fileCalibsObj[originFile] ?? EMPTY_ARRAY;
  },
);

export const selectIsMarkedForClose = (state, tabId) => state.calibrationReducer.calibrationTabs.find((tab) => tab.id === tabId)?.markedForClosure ?? null;
