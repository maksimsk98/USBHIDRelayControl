import { createSelector } from '@reduxjs/toolkit';
import { selectNameById } from '../selectNames';
import { selectAllDirtyChangeIds, selectTabMarkedAsChanged } from './changeBase';
import { selectTabMeasurementType, selectTabType } from '../tabs/tabsDerived';
import { selectChromaDataIfAltered, selectSpectroDataIfAltered } from '../selectAllData';
import { MEASUREMENT_TYPES, TAB_TYPES } from '../../../constants/constants';
import { selectChangedPackageIds, selectPackageChangesIfAltered } from '../packages/packageComposite';
import { selectAllFilesIds } from '../file/fileBase';
import { selectChromaMeasurementIds, selectSpectroMeasurementIds } from '../measurement/measureDerived';
import {selectFileDataSnapshotDiff, selectMeasurementDataSnapshotDiff } from '../selectSnapDiff';

export const selectTabAlteredData = createSelector(
  [
    (state, tabId) => selectTabType(state, tabId),
    (state, tabId) => selectTabMeasurementType(state, tabId),
    (state, tabId) => tabId, // tabId for nested selectors
    (state) => state,
  ],
  (tabType, measurementType, tabId, state) => {
    if (tabType === TAB_TYPES.FILE || tabType === TAB_TYPES.MEASUREMENT) {
      if (measurementType === MEASUREMENT_TYPES.chroma) {
        return selectChromaDataIfAltered(state, tabId);
      }
      if (measurementType === MEASUREMENT_TYPES.spectro) {
        return selectSpectroDataIfAltered(state, tabId);
      }
      console.error(`Unsupported measurement type '${measurementType}'`);
      return null;
    }

    if (tabType === TAB_TYPES.PACKAGE) {
      return selectPackageChangesIfAltered(state, tabId);
    }

    // For tabs that don’t have altered data
    return null;
  },
);

export const selectTabHasAlteredData = createSelector(
  [selectTabAlteredData, selectTabMarkedAsChanged],
  (alteredData, isMarked) => {
    console.log(isMarked, alteredData);
    return isMarked || alteredData != null;
  },
);

export const selectDirtyFileChangeIds = createSelector(
  [
    selectAllDirtyChangeIds,
    selectAllFilesIds,
  ],
  (dirtyIds, fileIds) => {
    const fileSet = new Set(fileIds);
    return dirtyIds.filter((id) => fileSet.has(id));
  },
);

export const selectValidatedFileChangeIds = createSelector(
  [
    selectDirtyFileChangeIds,
    (state) => state,
  ],
  (dirtyFileIds, state) => dirtyFileIds.filter((id) => {
    const diff = selectFileDataSnapshotDiff(state, id);
    return diff?.hasChanges;
  }),
);

export const selectDirtyMeasurementChromaChangeIds = createSelector(
  [
    selectAllDirtyChangeIds,
    selectChromaMeasurementIds,
  ],
  (dirtyIds, chromaIds) => {
    const chromaSet = new Set(chromaIds);
    return dirtyIds.filter((id) => chromaSet.has(id));
  },
);

export const selectValidatedMeasurementChromaChangeIds = createSelector(
  [
    selectDirtyMeasurementChromaChangeIds,
    (state) => state,
  ],
  (dirtyChromaIds, state) => dirtyChromaIds.filter((id) => {
    const diff = selectMeasurementDataSnapshotDiff(state, id);
    return diff?.hasChanges;
  }),
);

export const selectDirtyMeasurementSpectroChangeIds = createSelector(
  [
    selectAllDirtyChangeIds,
    selectSpectroMeasurementIds,
  ],
  (dirtyIds, spectroIds) => {
    const spectroSet = new Set(spectroIds);
    return dirtyIds.filter((id) => spectroSet.has(id));
  },
);

export const selectValidatedMeasurementSpectroChangeIds = createSelector(
  [selectDirtyMeasurementSpectroChangeIds],
  (dirtySpectroIds) => dirtySpectroIds,
  // TODO: добавить snapshot diff для spectro
);

export const selectAllValidatedChangedIds = createSelector(
  [
    selectValidatedFileChangeIds,
    selectValidatedMeasurementChromaChangeIds,
    selectValidatedMeasurementSpectroChangeIds,
    selectChangedPackageIds,
  ],
  (fileIds, chromaIds, spectroIds, packageIds) => [
    ...fileIds,
    ...chromaIds,
    ...spectroIds,
    ...packageIds,
  ],
);

export const selectAllChangedIds = selectAllValidatedChangedIds;

export const selectChangedNames = createSelector(
  [selectAllChangedIds, (state) => state],
  (changedIds, state) => changedIds
    .map((id) => selectNameById(state, id))
    .filter((name) => name != null),
);

export const selectAppHasAlteredData = createSelector(
  [selectAllValidatedChangedIds],
  (ids) => ids.length > 0,
);
