import { createSelector } from '@reduxjs/toolkit';

import {
  selectLumexStepsData,
  selectDetectorType,
  selectUsedDetectorType,
  selectAdditionalStepRaw,
} from '../../reduxImportDispatcher';

import { filterObjectKeys } from '../../../utils/filterObjectByKeys';

import { DETECTOR_LAMBDA_RANGES, DETECTOR_TYPES, DETECTOR_UNITS, EXTERNAL_DETECTOR_TYPES, LUMEX_DETECTOR_TYPES } from '../../../constants/constants';

export const selectEffectiveDetectorType = createSelector(
  [
    (state, tabId) => selectUsedDetectorType(state, tabId),
    (state, tabId) => selectDetectorType(state),
  ],
  (loadedDetectorType, nodesDetectorType) => loadedDetectorType ?? nodesDetectorType,
);

export const selectDetectorUnit = createSelector(
  [
    (state, props) => selectEffectiveDetectorType(state, props.tabId),
  ],
  (detectorType) => DETECTOR_UNITS[detectorType] ?? 'ед.'
);

export const selectLumexProgram = createSelector(
  [
    (state, tabId) => selectEffectiveDetectorType(state, tabId),
    (state, tabId) => selectLumexStepsData(state, tabId),
  ],
  (detectorType, lumexSteps) => {
    if (!LUMEX_DETECTOR_TYPES.includes(detectorType)) {
      return null;
    }

    const commonKeys = ["from", "to", "component"];

    if (
      detectorType === DETECTOR_TYPES.SPHDETECTOR2 ||
      detectorType === DETECTOR_TYPES.SPHDETECTOR
    ) {
      return filterObjectKeys(lumexSteps, ["lambda", ...commonKeys]);
    }

    if (
      detectorType === DETECTOR_TYPES.PANORAMA2 ||
      detectorType === DETECTOR_TYPES.PANORAMA
    ) {
      return filterObjectKeys(lumexSteps, [
        "lambdaEx",
        "lambdaReg",
        "sensitivity",
        ...commonKeys,
      ]);
    }

    if (detectorType === DETECTOR_TYPES.FLUORAT) {
      return filterObjectKeys(lumexSteps, [
        "excitFilter",
        "regFilter",
        "sensitivity",
        ...commonKeys,
      ]);
    }

    return lumexSteps;
  }
);

export const selectAdditionalStepValid = createSelector(
  [selectAdditionalStepRaw],
  (step) => {
    const isValidNumber = (v) => typeof v === 'number' && !isNaN(v) && v > 0;

    if (
      isValidNumber(step.maxDuration)
      && isValidNumber(step.window)
      && isValidNumber(step.threshold)
    ) {
      return step;
    }

    return null;
  },
);

export const selectLumexExportDetectorProgram = createSelector(
  [selectLumexStepsData, selectAdditionalStepValid],
  (stepsData, additionalStep) => {
    const result = {
      ...(stepsData && { stepsData }),
      ...(additionalStep && { additionalStage: additionalStep }),
    };
    return result;
  },
);

export const selectLumexLastStepTo = createSelector(
  [selectLumexStepsData, selectAdditionalStepValid],
  (stepsData, additionalStep) => {
    if (!stepsData || stepsData.length === 0) {
      return 600; // WATCHLIST TODO CONST
    }
    const stepBorders = stepsData.map((step) => step.to);
    const lastStepTo = Math.max(...stepBorders);
    const fullProgTo = lastStepTo + (Number(additionalStep?.maxDuration) * 60 || 0); // WATCHLIST TODO convert to secs for plots, send in mins
    return fullProgTo;
  },
);
