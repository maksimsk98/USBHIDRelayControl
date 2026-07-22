import { createSelector } from '@reduxjs/toolkit';

import _ from 'lodash';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '../../../constants/constants';
import { DEFAULT_AUTO_MARK_PARAMS } from '../../../constants/defaultParams';

export const selectWholePeaksData = (state) => state.peaksReducer.data;

export const selectPeaksById = (state, measurementId) => state.peaksReducer.data[measurementId]?.peaks ?? EMPTY_ARRAY;

export const selectPeaksRevision = (state, tabId) => state.peaksReducer.data[tabId]?.revision ?? 0;

export const selectPeaksByIds = createSelector(
  [selectWholePeaksData, (_, ids) => ids],
  (allPeaksData, ids) => {
    const result = {};
    for (const id of ids) {
      result[id] = allPeaksData[id]?.peaks ?? EMPTY_ARRAY;
    }
    return result;
  },
);

export const selectIsPeaksEmpty = createSelector(
  [selectPeaksById],
  (peaks) => !peaks.length,
);

export const selectPeakHistoryMove = (state, measurementId) => state.peaksReducer.data[measurementId]?.historyMove ?? EMPTY_OBJECT;

export const selectPeaksParams = (state, measurementId) => state.peaksReducer.data[measurementId]?.params ?? EMPTY_OBJECT;

export const selectAutomarkParams = createSelector(
  [selectPeaksParams],
  (params) => {
    if (!params || typeof params !== 'object') {
      return DEFAULT_AUTO_MARK_PARAMS;
    }

    const {
      markStart,
      minHeight,
      minHalfWidth,
    } = params;

    return {
      markStart: markStart ?? DEFAULT_AUTO_MARK_PARAMS.markStart,
      minHeight: minHeight ?? DEFAULT_AUTO_MARK_PARAMS.minHeight,
      minHalfWidth: minHalfWidth ?? DEFAULT_AUTO_MARK_PARAMS.minHalfWidth,
    };
  },
);

export const selectPeaksMarkers = (state, measurementId) => state.peaksReducer.data[measurementId]?.markers ?? EMPTY_OBJECT;

export const selectPeaksStatistics = (state, measurementId) => state.peaksReducer.data[measurementId]?.statistics ?? EMPTY_OBJECT;

export const selectMainPeaksData = createSelector(
  [selectPeaksById],
  (peaks) => peaks.map((peak) => ({
    peakNumber: peak.peakNumber,
    time: peak.time,
    component: peak.component,
    concentration: peak.concentration,
  })),
);

export const selectIsSomeDefinedRef = createSelector(
  [selectPeaksById],
  (peaks) => {
    if (!peaks.length) return false;
    return peaks.some((p) => !!p.concentrationRef); // 0, '', null, undefined → false
  },
);

export const selectPeakWorkMode = (state, tabId) => state.peaksReducer.data[tabId]?.workMode ?? null;

export const selectCalibrationTable = (state, tabId) => state.peaksReducer.data[tabId]?.calibrationTable ?? EMPTY_OBJECT;

export const selectCalibrationTableSubstances = createSelector(
  [selectCalibrationTable],
  (calibrationTable) => calibrationTable?.substances ?? EMPTY_ARRAY,
);

export const selectComponentNamesOptions = createSelector(
  [selectCalibrationTableSubstances],
  (substances) => {
    if (!substances?.length) return EMPTY_ARRAY;

    return _.uniqBy(substances, 'name')
      .filter((s) => s?.name)
      .map((s) => ({
        value: s.name,
        label: s.name,
      }));
  },
);

export const selectIsPeaksRedacting = (state, tabId) => {
  if (!tabId) return false;
  return !!state.peaksReducer.data?.[tabId]?.isRedacting;
};

export const selectPeakValleyAvailable = createSelector(
  [selectPeaksById],
  (peaks) => peaks.length > 1,
);
