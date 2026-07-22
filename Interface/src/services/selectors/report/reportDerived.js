import { createSelector } from '@reduxjs/toolkit';
import { selectChromaAveraging, selectNoiseEvalCalc, selectNoiseEvalParams } from '../../reduxImportDispatcher';

export const selectNoiseEvalReportData = createSelector(
  [
    selectNoiseEvalCalc,
    selectNoiseEvalParams,
    selectChromaAveraging,
  ],
  (noise, params, averaging) => {
    const from = params?.from ?? null;
    const to = params?.to ?? null;

    return {
      noise,
      from,
      to,
      averaging,
    };
  },
);
