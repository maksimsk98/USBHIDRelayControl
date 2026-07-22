import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { packageActions, selectFilesIdsByPackage } from '../reduxImportDispatcher';

import { FILE_ID_CATEGORIES } from '../../constants/constants';
import { unlinkFileFromCategory } from '../thunks/file/fileThunks';

const {
  deletePackageEntry,
} = packageActions;

export const packagesGCListener = createListenerMiddleware();

packagesGCListener.startListening({
  matcher: isAnyOf(deletePackageEntry),
  effect: async (action, { getState, dispatch }) => {
    const { id: packageId } = action.payload;
    if (!packageId) return;

    const state = getState();
    const linkedFileIds = selectFilesIdsByPackage(state, packageId);

    linkedFileIds.forEach((fileId) => {
      // Remove PACKAGE category link
      dispatch(
        unlinkFileFromCategory({
          fileId,
          indexer: packageId,
          category: FILE_ID_CATEGORIES.PACKAGE,
        }),
      );

      // Remove PREVIEW category link (if present)
      dispatch(
        unlinkFileFromCategory({
          fileId,
          indexer: packageId,
          category: FILE_ID_CATEGORIES.PREVIEW,
        }),
      );
    });
  },
});
