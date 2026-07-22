import { createSelector } from '@reduxjs/toolkit';
import { difference } from 'lodash';
import { selectFilesIdsByPackage } from '../file/fileBase';
import { selectAllPackages, selectIsSavingPackageOnClose, selectPackageFilesIdsOnInit } from './packagesBase';

export const selectPackageChangesIfAltered = createSelector(
  [
    (state, packageId) => selectPackageFilesIdsOnInit(state, packageId),
    (state, packageId) => selectFilesIdsByPackage(state, packageId),
    (state, _) => selectIsSavingPackageOnClose(state),
  ],
  (packageFilesIdsOnInit, currentPackageFilesIds, isSaving) => {
    if (!isSaving) return null; // ignore if no need to save

    // Deleted file indexes are relative to the initial array order
    const currentSet = new Set(currentPackageFilesIds);
    const deletedFilesIndexes = [];
    for (let i = 0; i < packageFilesIdsOnInit.length; i += 1) {
      if (!currentSet.has(packageFilesIdsOnInit[i])) deletedFilesIndexes.push(i);
    }

    // Added ids = in current but not in initial (preserves current order)
    const filesIdsToAppend = difference(currentPackageFilesIds, packageFilesIdsOnInit);

    const changed = deletedFilesIndexes.length > 0 || filesIdsToAppend.length > 0;
    return changed ? { deletedFilesIndexes, filesIdsToAppend } : null;
  },
);

export const selectPackageHasAlteredData = (state, packageId) => {
  const changes = selectPackageChangesIfAltered(state, packageId);
  return changes != null;
};

export const selectChangedPackageIds = createSelector(
  [selectAllPackages, (state) => state],
  (packages, state) => {
    const changedIds = [];
    for (const pkg of packages) {
      if (!pkg?.id) continue;
      const diff = selectPackageChangesIfAltered(state, pkg.id);
      if (diff) changedIds.push(pkg.id);
    }
    return changedIds;
  },
);

export const selectAppHasPackageAlteredData = createSelector(
  [selectChangedPackageIds],
  (changedIds) => changedIds.length > 0,
);
