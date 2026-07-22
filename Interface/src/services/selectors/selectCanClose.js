import { createSelector } from '@reduxjs/toolkit';
import { selectIsMainStreaming } from '../reduxImportDispatcher';
import { selectAppHasAlteredData } from './changeTrack/changeComposite';

export const selectConfirmCloseIsReq = createSelector(
  [selectIsMainStreaming, selectAppHasAlteredData],
  (isStreaming, appHasAlteredData) => (isStreaming || appHasAlteredData) ?? false,
);
