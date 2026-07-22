import { createSelector } from '@reduxjs/toolkit';
import {
  DEFAULT_Y_LABEL, DETECTOR_Y_LABELS, EMPTY_ARRAY, FILE_ID_CATEGORIES, OPEN_STATES,
} from '../../../constants/constants';

export const selectIsOpened = (state, fileId) => {
  const file = selectFileEntry(state, fileId);
  return file?.indexedCategories?.[FILE_ID_CATEGORIES.OPENED]?.includes(fileId) ?? false;
};

export const selectCategoryFiles = (state, category) => state.filesReducer.files.filter((file) => file.category === category);

export const selectAllFiles = (state) => state.filesReducer.files;

export const selectAllFilesIds = createSelector(
  [selectAllFiles],
  (files) => files.map((file) => file?.id ?? null).filter((id) => id != null),
);

export const selectAllFullFiles = createSelector(
  [selectAllFiles],
  (files) => files.filter((file) => file.isFull),
);

export const selectAllFullFilesIds = createSelector(
  [selectAllFullFiles],
  (fullFiles) => fullFiles.map((file) => file.id),
);

export const selectLoadedDetectorType = (state, tabId) => {
  const openedFile = state.filesReducer.files.find(
    (file) => file.id === tabId,
  );
  return openedFile?.detectorType ?? null;
};

export const selectUniqueDetectorTypesByIds = createSelector(
  [selectAllFiles, (_, ids) => ids],
  (files, ids) => {
    if (!ids?.length) return [];
    const detectors = ids.map(
      (id) => files.find((f) => f.id === id)?.detectorType ?? null,
    );
    return Array.from(new Set(detectors.filter((d) => d != null)));
  },
);

export const selectUniqueYLabelsByIds = createSelector(
  [selectUniqueDetectorTypesByIds],
  (detectorTypes) => {
    const labels = detectorTypes.map((dt) => DETECTOR_Y_LABELS[dt]);
    if (!labels.length) return [DEFAULT_Y_LABEL];
    return Array.from(new Set(labels.filter((lbl) => lbl != null)));
  },
);

export const selectDetectorTypesByIds = createSelector(
  [
    (state, _) => selectAllFiles(state),
    (_, idsArr) => idsArr, // idsArr must be referentially stable (memoized upstream)
  ],
  (files, idsArr) => {
    const map = files.reduce((acc, file) => {
      if (idsArr.includes(file.id)) {
        acc[file.id] = file;
      }
      return acc;
    }, {});

    return idsArr.map((id) => map[id]?.detectorType ?? null);
  },

);

export const selectFileEntry = (state, tabId) => {
  const openedFile = state.filesReducer.files.find(
    (file) => file.id === tabId,
  );
  return openedFile ?? null;
};

export const selectFilePathById = createSelector(
  [selectFileEntry],
  (fileEntry) => fileEntry?.path ?? null,
);

export const selectFilesToOpen = createSelector(
  [selectAllFiles],
  (files) => files.filter((file) => file.openState === OPEN_STATES.QUEUE),
);

export const selectShouldFileOpen = (state, fileId) => selectFileEntry(state, fileId)?.openState === OPEN_STATES.QUEUE;

export const selectFilesByCategoryAndIndexer = createSelector(
  [
    selectAllFiles,
    (_, category) => category,
    (_, __, indexer) => indexer,
  ],
  (files, category, indexer) => files.filter((file) => file.indexedCategories?.[category]?.includes(indexer)),
);

export const selectFileIndexersMap = createSelector(
  [selectAllFiles],
  (files) => {
    const map = {};
    for (const file of files) {
      const indexers = Object.values(file.indexedCategories ?? {}).flat();
      map[file.id] = Array.from(new Set(indexers)); // uniq
    }
    return map;
  },
);

export const selectFilesByIndexer = createSelector(
  [selectAllFiles, selectFileIndexersMap, (_, indexer) => indexer],
  (files, indexersMap, indexer) => files.filter((file) => indexersMap[file.id]?.includes(indexer)),
);

export const selectFilesByPackageId = selectFilesByIndexer;

export const selectPreviewFilesByPackage = createSelector(
  [selectAllFiles, (_, packageId) => packageId],
  (files, packageId) => files.filter((file) => file.indexedCategories?.[FILE_ID_CATEGORIES.PREVIEW]?.includes(packageId)),
);

export const selectIndexedFilesByPackage = createSelector(
  [selectAllFiles, (_, packageId) => packageId],
  (files, packageId) => files.filter((file) => file.indexedCategories?.[FILE_ID_CATEGORIES.PACKAGE]?.includes(packageId)),
);

export const selectPreviewFilesIdsByPackage = createSelector(
  [selectPreviewFilesByPackage],
  (files) => files.map((file) => file.id),
);

export const selectFilesIdsByPackage = createSelector(
  [selectFilesByPackageId],
  (files) => files.map((file) => file.id),
);

export const selectCategoriesForFile = createSelector(
  [selectFileEntry],
  (fileEntry) => {
    if (!fileEntry) return EMPTY_ARRAY;
    return Object.entries(fileEntry.indexedCategories ?? {})
      .filter(([_, indexers]) => indexers?.length) // keep only non-empty
      .map(([category]) => category);
  },
);

// --- OPENED ---
export const selectOpenedIndexersForFile = createSelector(
  [selectFileEntry],
  (fileEntry) => (fileEntry?.indexedCategories?.[FILE_ID_CATEGORIES.OPENED]?.length
    ? fileEntry.indexedCategories[FILE_ID_CATEGORIES.OPENED]
    : EMPTY_ARRAY),
);

// --- PACKAGE ---
export const selectPackageIndexersForFile = createSelector(
  [selectFileEntry],
  (fileEntry) => (fileEntry?.indexedCategories?.[FILE_ID_CATEGORIES.PACKAGE]?.length
    ? fileEntry.indexedCategories[FILE_ID_CATEGORIES.PACKAGE]
    : EMPTY_ARRAY),
);

// --- PREVIEW ---
export const selectPreviewIndexersForFile = createSelector(
  [selectFileEntry],
  (fileEntry) => (fileEntry?.indexedCategories?.[FILE_ID_CATEGORIES.PREVIEW]?.length
    ? fileEntry.indexedCategories[FILE_ID_CATEGORIES.PREVIEW]
    : EMPTY_ARRAY),
);

export const selectIndexByWhoForFile = createSelector(
  [selectFileEntry],
  (fileEntry) => {
    if (!fileEntry) return EMPTY_ARRAY;
    const sets = Object.values(fileEntry.indexedCategories ?? {});
    return Array.from(new Set(sets.flat()));
  },
);

export const selectIsOrphanFile = createSelector(
  [selectFileEntry],
  (fileEntry) => {
    if (!fileEntry) return false;

    const nonEmptyCategories = Object.values(fileEntry.indexedCategories ?? {})
      .filter((indexers) => indexers.length > 0);

    return nonEmptyCategories.length === 0;
  },
);

export const isFileInState = (state, fileId) => selectAllFiles(state).some((f) => f.id === fileId);

export const selectArchiveCalibNameById = createSelector(
  [selectFileEntry],
  (fileEntry) => {
    if (!fileEntry) return null;
    return fileEntry?.archiveCalibration ?? null;
  },
);

export const selectFileEntriesToFocus = (state) => state.filesReducer.files?.filter((f) => f.shouldFocus) ?? [];

// --- DATA snapshots ---
export const selectFileSnapshotEntry = (state, fileId) =>
  state.filesReducer.snapshots.data[fileId] ?? null;

export const selectFileSnapshotPayload = (state, fileId) =>
  state.filesReducer.snapshots.data[fileId]?.payload ?? null;

export const selectFileSnapshotTime = (state, fileId) =>
  state.filesReducer.snapshots.data[fileId]?.takenAt ?? null;

// --- METHOD snapshots ---
export const selectFileMethodSnapshotEntry = (state, fileId) =>
  state.filesReducer.snapshots.method[fileId] ?? null;

export const selectFileMethodSnapshotPayload = (state, fileId) =>
  state.filesReducer.snapshots.method[fileId]?.payload ?? null;

export const selectFileMethodSnapshotTime = (state, fileId) =>
  state.filesReducer.snapshots.method[fileId]?.takenAt ?? null;

export const selectFileMethodSnapshotMethod = (state, fileId) =>
  state.filesReducer.snapshots.method[fileId]?.method ?? null;