import { createSelector } from "@reduxjs/toolkit";
import { DETECTOR_LAMBDA_RANGES, DETECTOR_TYPES, EMPTY_OBJECT, LUMEX_DETECTOR_TYPES } from "../../../constants/constants";
import { selectTabMeasurementType } from "../tabs/tabsDerived";
import { selectEffectiveDetectorType, selectLumexExportDetectorProgram, selectLumexLastStepTo, selectLumexProgram } from "../steps/stepsDerived";
import { selectDADProgramData, selectDadStepsData, selectDadParamsData, selectDadLastStepTo, selectIsDadRedacting, selectDADExportProgram } from "../DAD/DADBase";
import { selectIsRIDRedacting, selectRIDExportProgram, selectRIDLastStepTo, selectRIDParamsData, selectRIDProgramData, selectRIDStepsData } from "../RID/ridBase";
import { selectIsLumexChromaRedacting, selectLumexDetectorProgramData, selectLumexParamsData, selectLumexStepsData } from "../steps/stepsBase";
import { selectIsWritingBaseLine } from "../measurement/measureBase";
import { selectIsRedactingSpectroSteps } from "../spectroSteps/spectroStepsBase";

const LOG_CROSS_DETECTOR = false;

const logCross = (...args) => {
  if (LOG_CROSS_DETECTOR) {
    logCross("[crossDetectorSelectors]", ...args);
  }
}


export const selectDetectorSpecificStepEntryData = createSelector(
    [
      (state, tabId) => selectEffectiveDetectorType(state, tabId ),
      (state, tabId) => selectLumexDetectorProgramData(state, tabId),
      (state, tabId) => selectDADProgramData(state, tabId),
      (state, tabId) => selectRIDProgramData(state, tabId),
    ],
    (detectorType, lumexData, dadData, ridData) => {
      console.log({detectorType, lumexData, dadData, ridData})
      if (LUMEX_DETECTOR_TYPES.includes(detectorType)) {
          logCross('selectDetectorSpecificStepEntryData - lumexData', lumexData);
          return lumexData ?? EMPTY_OBJECT;
      }
      if (detectorType === DETECTOR_TYPES.DAD) {
          logCross('selectDetectorSpecificStepEntryData - dadData', dadData);
          return dadData ?? EMPTY_OBJECT;
      }
      if (detectorType === DETECTOR_TYPES.RID) {
          logCross('selectDetectorSpecificStepEntryData - ridData', ridData);
          return ridData ?? EMPTY_OBJECT;
      }
      console.warn(`Unsupported detector type: ${detectorType}`);
      return null;
    }
);


export const selectDetSpecStepsData = createSelector(
  [
    (state, tabId) => selectEffectiveDetectorType(state, tabId),
    (state, tabId) => selectLumexStepsData(state, tabId),
    (state, tabId) => selectDadStepsData(state, tabId),
    (state, tabId) => selectRIDStepsData(state, tabId),
  ],
  (detectorType, lumexResult, dadResult, ridResult) => {
    if (LUMEX_DETECTOR_TYPES.includes(detectorType)) {
      logCross('lumexResult', lumexResult)
      return lumexResult;
    }

    if (detectorType === DETECTOR_TYPES.DAD) {
      logCross('dadResult', dadResult)
      return dadResult;
    }

    if (detectorType === DETECTOR_TYPES.RID) {
      logCross('ridResult', ridResult)
      return ridResult;
    }

    return null;
  }
);

export const selectDetSpecExportDetectorProgram = createSelector(
  [
    (state, tabId) => selectEffectiveDetectorType(state, tabId ),
    (state, tabId) => selectLumexExportDetectorProgram(state, tabId),
    (state, tabId) => selectDADExportProgram(state, tabId),
    (state, tabId) => selectRIDExportProgram(state, tabId),
  ],
  (detectorType, lumexExportResult, dadExportResult, ridExportResult) => {
    if (LUMEX_DETECTOR_TYPES.includes(detectorType)) {
      logCross('lumexExportResult', lumexExportResult)
      return lumexExportResult;
    }

    if (detectorType === DETECTOR_TYPES.DAD) {
      logCross('dadExportResult', dadExportResult)
      return dadExportResult;
    }

    if (detectorType === DETECTOR_TYPES.RID) {
      logCross('ridExportResult', ridExportResult)
      return ridExportResult;
    }

    return null;
  }
);

export const selectDetSpecParamsData = createSelector(
  [
    (state, tabId) => selectEffectiveDetectorType(state, tabId ),
    (state, tabId) => selectLumexParamsData(state, tabId),
    (state, tabId) => selectDadParamsData(state, tabId),
    (state, tabId) => selectRIDParamsData(state, tabId),
  ],
  (detectorType, lumexParamsResult, dadParamsResult, ridParamsResult) => {
    if (LUMEX_DETECTOR_TYPES.includes(detectorType)) {
      logCross('lumexParamsResult', lumexParamsResult)
      return lumexParamsResult;
    }

    if (detectorType === DETECTOR_TYPES.DAD) {
      logCross('dadParamsResult', dadParamsResult)
      return dadParamsResult;
    }

    if (detectorType === DETECTOR_TYPES.RID) {
      logCross('ridParamsResult', ridParamsResult)
      return ridParamsResult;
    }

    return null;
  }
);
export const selectIsDetectorProgramComplete = createSelector(
  [
    (state, props) => selectTabMeasurementType(state, props.tabId),
    (state, props) => selectDetSpecStepsData(state, props.tabId),
    (state, props) => selectEffectiveDetectorType(state, props.tabId),
  ],
  (measurementType, stepsData, effectiveDetectorType) => {
    if (measurementType === 'chroma') {
      if (!LUMEX_DETECTOR_TYPES.includes(effectiveDetectorType)) {
        return true; // TODO Assume complete for non-Lumex detectors, or implement other logic as needed
      }
      if (stepsData.length === 0) return false;
      if (stepsData.some(({ from, to }) => from === '' || to === '')) return false;
      return stepsData.every((step) => Object.entries(step)
        .every(([field, value]) => {
          if (DETECTOR_LAMBDA_RANGES[field]) {
            return (value >= DETECTOR_LAMBDA_RANGES[field][0]
            && value <= DETECTOR_LAMBDA_RANGES[field][1]);
          }
          return true;
        }));
    } if (measurementType === 'spectro') {
      if (effectiveDetectorType === DETECTOR_TYPES.FLUORAT) {
        return false;
      }
      return true; // WATCHLIST TODO EXPAND TO FULL LOGIC
    }
  },
);

export const selectLastStepTo = createSelector(
  [
    (state, props) => selectEffectiveDetectorType(state, props.tabId ),
    (state, props) => selectLumexLastStepTo(state, props.tabId),
    (state, props) => selectDadLastStepTo(state, props.tabId),
    (state, props) => selectRIDLastStepTo(state, props.tabId),
  ],
  (detectorType, lumexLastStepTo, dadLastStepTo, ridLastStepTo) => {
    if (LUMEX_DETECTOR_TYPES.includes(detectorType)) {
      return lumexLastStepTo;
    } else if (detectorType === DETECTOR_TYPES.DAD) {
      return dadLastStepTo; 
    } else if (detectorType === DETECTOR_TYPES.RID) {
      return ridLastStepTo; 
    }  else {
      console.warn(`Unsupported detector type for last step to: ${detectorType}`);
      return 600; // Default value for other detectors
    }
  },
);

export const selectLastStepToIfNotWB = createSelector(
  [
    (state, props) => selectLastStepTo(state, { tabId: props.tabId }),
    (state, props) => selectIsWritingBaseLine(state, props.tabId),
    
  ],
  (lastStepTo, isWritingBaseLine) => {
    return isWritingBaseLine ? null : lastStepTo;
  },
);

export const selectDetectorSpecificIsRedacting = createSelector(
  [
    (state, props) => selectEffectiveDetectorType(state, props.tabId ),
    (state, props) => selectIsLumexChromaRedacting(state, props.tabId),
    (state, props) => selectIsDadRedacting(state, props.tabId),
    (state, props) => selectIsRIDRedacting(state, props.tabId),
  ],
  (detectorType, isLumexRedacting, isDadRedacting, isRIDRedacting) => {
    if (LUMEX_DETECTOR_TYPES.includes(detectorType)) {
      return isLumexRedacting;
    } else if (detectorType === DETECTOR_TYPES.DAD) {
      return isDadRedacting; 
    } else if (detectorType === DETECTOR_TYPES.RID) {
      return isRIDRedacting; 
    } else {
      console.warn(`Unsupported detector type for redacting state: ${detectorType}`);
      return false; // Default to not redacting for other detectors
    }
  },
);

export const selectIsMeasurementSubTabRedacting = createSelector(
  [
    (state, tabId) => selectTabMeasurementType(state, tabId),
    (state, tabId) => selectIsRedactingSpectroSteps(state, tabId),
    (state, tabId) => selectDetectorSpecificIsRedacting(state, { tabId })
  ],
  (measurementType, isSpectroRedacting, isChromaRedacting) => {
    if (measurementType === 'spectro') return isSpectroRedacting;
    if (measurementType === 'chroma') return isChromaRedacting;
    return false;
  },
);

export const selectDetectorSpecificStepsCount = createSelector(
  [
    (state, props) => selectDetSpecStepsData(state, props.tabId),
  ],
  (stepsData) => stepsData?.length ?? 0,
);  
