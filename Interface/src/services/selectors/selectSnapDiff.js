import { createSelector } from '@reduxjs/toolkit';
import isEqual from 'lodash/isEqual';
import isObject from 'lodash/isObject';
import { selectChromaDataSnapshot } from './selectAllData';
import {
  selectAllFilesIds,
  selectChromaMeasurementIds, selectFileMethodSnapshotEntry, selectFileSnapshotEntry, selectMeasurementDataSnapshotEntry, selectMeasurementMethodSnapshotEntry, selectMethodData, selectTabMethod,
} from '../reduxImportDispatcher';
import { formatDurationHMSfromMS } from '../../utils/time';

const LOG_SNAP_DIFF = true;

const logSnap = (...args) => {
  if (!LOG_SNAP_DIFF) return;
  console.log('[SNAP-DIFF]', ...args);
};

/**
 * Returns array of changed paths between two objects.
 * Example: ["integration.minHalfWidth", "chromaMiscData.averaging"]
 */
export function diffObjectPaths(before, after, basePath = '') {
  const changes = [];

  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  for (const key of keys) {
    const path = basePath ? `${basePath}.${key}` : key;

    const a = before?.[key];
    const b = after?.[key];

    if (isObject(a) && isObject(b)) {
      changes.push(...diffObjectPaths(a, b, path));
      continue;
    }

    if (!isEqual(a, b)) {
      changes.push(path);
    }
  }

  return changes;
}

export const selectFileDataSnapshotDiff = createSelector(
  [
    (state, fileId) => selectChromaDataSnapshot(state, fileId),
    (state, fileId) => selectFileSnapshotEntry(state, fileId),
  ],
  (currentSnapshot, snapshotEntry) => {
    // если baseline ещё не снят — считаем, что изменений нет
    if (!snapshotEntry) {
      const result = {
        noEntry: true, // сервисный флаг для SC
        hasChanges: false,
        diffTimeMs: null,
        diffTimeHMS: null,
      };

      logSnap('file:no-entry', result);

      return result;
    }

    const { payload: baseline, takenAt } = snapshotEntry;

    // baseline может быть null — это валидный случай (чистый файл)
    const hasChanges = !isEqual(currentSnapshot, baseline);

    const changedPaths = diffObjectPaths(
      baseline,
      currentSnapshot,
    );

    const now = Date.now();
    const diffTimeMs = takenAt != null ? now - takenAt : null;

    const result = {
      hasChanges,
      changedPaths,
      diffTimeMs,
      diffTimeHMS: formatDurationHMSfromMS(diffTimeMs),
    };

    logSnap('file:diff', result);

    return result;
  },
);

export const selectFileMethodDeviation = createSelector(
  [
    (state, fileId) => selectMethodData(state, fileId),           // текущий payload
    (state, fileId) => selectFileMethodSnapshotEntry(state, fileId), // снапшот для файла
    (state, fileId) => selectTabMethod(state, fileId),            // текущий метод
  ],
  (currentPayload, snapshotEntry, currentMethod) => {
    if (currentMethod === null) {
      const result = {
        diff: null,
        snapMethod: null,
        currentMethod,
      };

      logSnap('method:nullish-method', result);
      return result;
    }

    // снапа нет → нерелевантно
    if (!snapshotEntry) {
      const result = {
        diff: null,
        snapMethod: null,
        currentMethod,
      };
      logSnap('file:method:no-snapshot', result);
      return result;
    }

    const { payload: baselinePayload, method: snapMethod } = snapshotEntry;

    // метод сменили → снап больше не применим
    if (snapMethod !== currentMethod) {
      const result = {
        diff: null,
        snapMethod,
        currentMethod,
      };
      logSnap('file:method:mismatch', result);
      return result;
    }

    const changedPaths = diffObjectPaths(baselinePayload, currentPayload);
    const diff = changedPaths.length > 0;

    // defensive clones для логов
    const before = structuredClone(baselinePayload);
    before.__snapRole = 'before';

    const after = structuredClone(currentPayload);
    after.__snapRole = 'after';

    logSnap('file:method:payload-diff', {
      method: currentMethod,
      diff,
      changedPaths,
      before,
      after,
    });

    return {
      diff,
      snapMethod,
      currentMethod,
      changedPaths,
    };
  },
);

export const selectAllFileMethodDeviations = createSelector(
  [
    selectAllFilesIds,
    (state) => state,
  ],
  (fileIds, state) => fileIds
    .map((id) => ({
      id,
      ...selectFileMethodDeviation(state, id),
    }))
    .filter((entry) => entry.diff === true),
);

export const selectFileIdsWithMethodDeviation = createSelector(
  [selectAllFileMethodDeviations],
  (entries) => entries.map((e) => e.id),
);

export const selectMeasurementMethodDeviation = createSelector(
  [
    (state, id) => selectMethodData(state, id),
    (state, id) => selectMeasurementMethodSnapshotEntry(state, id),
    (state, id) => selectTabMethod(state, id),
  ],
  (currentPayload, snapshotEntry, currentMethod) => {

    if (currentMethod === null) {
      const result = {
        diff: null,
        snapMethod: null,
        currentMethod,
      };

      logSnap('method:nullish-method', result);
      return result;
    }

    // снапа нет → нерелевантно
    if (!snapshotEntry) {
      const result = {
        diff: null,
        snapMethod: null,
        currentMethod,
      };

      logSnap('method:no-snapshot', result);
      return result;
    }

    const { payload: baselinePayload, method: snapMethod } = snapshotEntry;

    // метод сменили → снап больше не применим
    if (snapMethod !== currentMethod) {
      const result = {
        diff: null,
        snapMethod,
        currentMethod,
      };

      logSnap('method:mismatch', result);
      return result;
    }
    const changedPaths = diffObjectPaths(
      baselinePayload,
      currentPayload,
    );

    const diff = changedPaths.length > 0;

    // defensive clones for logs only
    const before = structuredClone(baselinePayload);
    before.__snapRole = 'before';

    const after = structuredClone(currentPayload);
    after.__snapRole = 'after';

    logSnap('method:payload-diff', {
      method: currentMethod,
      diff,
      changedPaths,
      before,
      after,
    });

    return {
      diff,
      snapMethod,
      currentMethod,
      changedPaths, // ⬅️ IMPORTANT: surfaced
    };
  },
);

export const selectAllMeasurementMethodDeviations = createSelector(
  [
    selectChromaMeasurementIds,
    (state) => state,
  ],
  (ids, state) => ids
    .map((id) => ({
      id,
      ...selectMeasurementMethodDeviation(state, id),
    }))
  // оставляем только реальные диффы
    .filter((entry) => entry.diff === true),
);

export const selectMeasurementIdsWithMethodDeviation = createSelector(
  [selectAllMeasurementMethodDeviations],
  (entries) => entries.map((e) => e.id),
);

export const selectMeasurementDataSnapshotDiff = createSelector(
  [
    (state, measurementId) => selectChromaDataSnapshot(state, measurementId),

    (state, measurementId) => selectMeasurementDataSnapshotEntry(state, measurementId),
  ],
  (currentSnapshot, snapshotEntry) => {
    // baseline ещё не снят → считаем чистым
    if (!snapshotEntry) {
      const result = {
        noEntry: true,
        hasChanges: false,
        diffTimeMs: null,
        diffTimeHMS: null,
      };

      logSnap('measurement:no-entry', result);
      return result;
    }

    const { payload: baseline, takenAt } = snapshotEntry;

    const hasChanges = !isEqual(currentSnapshot, baseline);

    const changedPaths = diffObjectPaths(
      baseline,
      currentSnapshot,
    );

    const now = Date.now();
    const diffTimeMs = takenAt != null ? now - takenAt : null;

    const result = {
      hasChanges,
      changedPaths,
      diffTimeMs,
      diffTimeHMS: formatDurationHMSfromMS(diffTimeMs),
    };

    logSnap('measurement:diff', {
      hasChanges,
      takenAt,
      diffTimeMs,
    });

    return result;
  },
);

export const selectUnifiedChromaSnapshotDiff = createSelector(
  [
    (state, id) => selectMeasurementDataSnapshotDiff(state, id),
    (state, id) => selectFileDataSnapshotDiff(state, id),
  ],
  (measurementDiff, fileDiff) => {
    // measurement имеет приоритет
    if (measurementDiff && !measurementDiff.noEntry) {
      return {
        scope: 'measurement',
        ...measurementDiff,
      };
    }

    if (fileDiff && !fileDiff.noEntry) {
      return {
        scope: 'file',
        ...fileDiff,
      };
    }

    return {
      scope: 'none',
      noEntry: true,
      hasChanges: false,
      diffTimeMs: null,
      diffTimeHMS: null,
    };
  },
);

export const selectUnifiedMethodDeviation = createSelector(
  [
    (state, id) => selectMeasurementMethodDeviation(state, id),
    (state, id) => selectFileMethodDeviation(state, id),
  ],
  (measurementDiff, fileDiff) => {
    // measurement имеет приоритет
    if (measurementDiff && measurementDiff.diff !== null) {
      return {
        scope: 'measurement',
        ...measurementDiff,
      };
    }

    if (fileDiff && fileDiff.diff !== null) {
      return {
        scope: 'file',
        ...fileDiff,
      };
    }

    return {
      scope: 'none',
      diff: null,
      snapMethod: null,
      currentMethod: null,
      changedPaths: [],
    };
  },
);
