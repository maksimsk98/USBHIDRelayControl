import { createSelector } from '@reduxjs/toolkit';
import { selectPeakIdParamsById, selectPeaksParams, selectSmoothingParamsById } from '../reduxImportDispatcher';

export const selectIntegrationForMethod = createSelector(
  [
    selectPeakIdParamsById,
    selectSmoothingParamsById,
    selectPeaksParams,
  ],
  (peakIdParams, smoothingParams, automarkParams) => {
    const result = { ...peakIdParams, ...smoothingParams, ...automarkParams };
    return result;
  },
);
