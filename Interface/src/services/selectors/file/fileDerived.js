import { createSelector } from '@reduxjs/toolkit';

import { selectActiveTab, selectAllFiles } from '../../reduxImportDispatcher';

const isTabOpened = (activeTab, openedFiles) => openedFiles.some((file) => file.id === activeTab);

export const selectIsActiveTabOpened = createSelector(
  [selectActiveTab, selectAllFiles],
  isTabOpened, // second argument is callback
);

export const selectActiveTabIdIfOpened = createSelector(
  [selectActiveTab, selectAllFiles],
  (activeTab, openedFiles) => (isTabOpened(activeTab, openedFiles) ? activeTab : null),
);
