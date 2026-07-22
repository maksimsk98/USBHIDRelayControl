import { createSelector } from '@reduxjs/toolkit';

import {
  selectActiveTab,
  selectPassportData,
  selectChromaMiscState,
  selectWholePumpProgram,
  selectExportMiscData,
  selectReportData,
  selectActMeasuredChromatogram,
  selectIsThermostatChosen,
  selectAdditionalStepValid,
  selectSpectroFocusedStepData,
  selectTabMeasurementType,
  selectSpectroDetDepParams,
  selectDetectorType,
  selectDetSpecParamsData,
} from '../reduxImportDispatcher';

import { selectDetSpecStepsData } from '../reduxImportDispatcher';

// Memoized selector for method and calibration using props
const selectMethodAndCalibration = createSelector(
  (state) => state.measurementReducer.measurements, // input: measurements array
  (_, props) => props.tabId, // input: activePanelId from props
  (measurements, tabId) => {
    const foundMeasurement = measurements.find((measurement) => measurement.id === tabId) || {};
    const { method = null, calibration = null } = foundMeasurement;

    return {
      currentMethod: method,
      currentCalibration: calibration,
    };
  },
);

const isEmptyObject = (obj) => Object.keys(obj).length === 0 && obj.constructor === Object;

export const selectChromaData = createSelector(
  [
    (state, props) => selectDetSpecStepsData(state, props.tabId ),
    (state, props) => selectDetSpecParamsData(state, props.tabId),
    (state, props) => selectAdditionalStepValid(state, props.tabId),
    (state, props) => selectWholePumpProgram(state, props.tabId),
    (state, props) => selectExportMiscData(state, props.tabId),
    (state, props) => selectPassportData(state, props.tabId),
    (_, props) => props.measurementType ?? 'none',
    (state) => selectActiveTab(state),
    (state, props) => selectMethodAndCalibration(state, props),
    (state, _) => selectDetectorType(state),
    (state, _) => selectIsThermostatChosen(state),
  ],
  (stepsData, paramsData, validAdditionalStep, pumpProgramReducer, exportMiscData, passportReducer, measurementType, tabId, methodAndCalibration, detectorType, isThermostatChosen) => {
    if (measurementType === 'chroma') {
      const name = tabId;
      const pumpProgramData = pumpProgramReducer;
      const { pumpMode } = pumpProgramData;
      /* console.log(pumpProgramData, pumpMode) */
      const setPumpProg = {};
      if (pumpMode !== 'none') {
        Object.assign(setPumpProg, { pumpMode }, pumpProgramData[`${pumpMode}Program`]);
      }
      const miscData = { ...exportMiscData };
      // WATCHLIST supress it due to main param error handling
      /*       if (!isThermostatChosen) {
        miscData.thermostatTemp = null;
      } */

        console.log('Steps params for start', stepsData, paramsData)

      const sampleName = passportReducer?.sampleName;
      const measurementState = {
        measurementName: name,
        detectorType,
        sampleName,
        setDetectorProg: stepsData,
        ...(paramsData && {params: paramsData}),
        ...(validAdditionalStep && { additionalStage: validAdditionalStep }),
        ...(!isEmptyObject(setPumpProg) && { setPumpProg }),
        ...miscData,
        ...methodAndCalibration,
      };
      return measurementState;
    }
    return null;
  },
);

export const selectDataForDetUpd = createSelector(
  [
    (state, props) => selectDetSpecStepsData(state, props.tabId ),
    (state, props) => selectAdditionalStepValid(state, props.tabId),
    (state, props) => selectExportMiscData(state, props.tabId),
    (state, props) => selectPassportData(state, props.tabId),
    (_, props) => props.measurementType ?? 'none',
    (state) => selectActiveTab(state),
    (state, _) => selectDetectorType(state),
  ],
  (detectorProg, validAdditionalStep, exportMiscData, passportReducer, measurementType, tabId, detectorType) => {
    if (measurementType === 'chroma') {
      const name = tabId;
      const miscData = exportMiscData;
      const sampleName = passportReducer?.sampleName;
      const measurementState = {
        measurementName: name,
        detectorType,
        sampleName,
        ...(validAdditionalStep && { additionalStage: validAdditionalStep }),
        updateDetectorProg: detectorProg,
        ...miscData,
      };
      return measurementState;
    }
    return null;
  },
);

export const selectDataForCopy = createSelector(
  [
    (state, tabId) => selectDetSpecStepsData(state, tabId ),
    (state, tabId) => selectDetSpecParamsData(state, tabId ),
    (state, tabId) => selectAdditionalStepValid(state, tabId),
    (state, tabId) => selectWholePumpProgram(state, tabId),
    (state, tabId) => selectChromaMiscState(state, tabId),
    (state, tabId) => selectPassportData(state, tabId),
    (state, tabId) => selectReportData(state, tabId),
    (state, tabId) => selectActMeasuredChromatogram(state, tabId),
  ],
  (stepsData, programParams, additionalStep, pumpProgramData, chromaMiscData, passportData, reportData, measuredChromatogram) => ({
    stepsData, programParams, additionalStep, pumpProgramData, chromaMiscData, passportData, reportData, measuredChromatogram,
  }),
);

export const selectSpectroData = createSelector(
  [
    (state, props) => selectSpectroFocusedStepData(state, props.tabId),
    (state, props) => selectTabMeasurementType(state, props.tabId),
    (state, props) => selectSpectroDetDepParams(state, props.tabId),
    (state, props) => props.tabId,
  ],
  (spectroFocusedStep, measurementType, detectorDepParams, tabId) => {
    if (measurementType === 'spectro') {
      const measurementState = {
        measurementId: tabId,
        detectorProg: { ...spectroFocusedStep, ...detectorDepParams },
      };
      console.log('selector', measurementState);
      return measurementState;
    }
    return null;
  },
);
