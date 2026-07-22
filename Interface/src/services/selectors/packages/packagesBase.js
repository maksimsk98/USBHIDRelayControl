import { createSelector } from '@reduxjs/toolkit';
import { EMPTY_ARRAY } from '../../../constants/constants';

export const selectAllPackages = (state) => state.packagesReducer.packages;

export const selectAllPackagesCount = createSelector(
  [selectAllPackages],
  (allPackages) => allPackages.length ?? 0,
);

export const selectPackagesToOpen = createSelector(
  [selectAllPackages],
  (packages) => packages.filter((entry) => entry.shouldOpen),
);

export const selectIsPackage = (state, packageId) => state.packagesReducer.packages
  .some((packageEntry) => packageEntry.id === packageId);

export const selectPackageEntry = (state, id) => {
  const packageEntry = state.packagesReducer.packages.find(
    (pack) => pack.id === id,
  );
  return packageEntry ?? null;
};

export const selectPackageFilesIdsOnInit = createSelector(
  [selectPackageEntry],
  (packageEntry) => (packageEntry
    ? packageEntry?.packageFilesIdsOnInit ?? EMPTY_ARRAY
    : null),
);

export const selectIsSavingPackageOnClose = (state) => state.packagesReducer.settings.isSavingPackageOnClose;

export const selectPackageNameById = (state, id) => state.packagesReducer.packages.find((p) => p.id === id)?.name ?? null;
