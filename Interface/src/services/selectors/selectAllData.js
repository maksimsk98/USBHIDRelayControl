import { createSelector } from '@reduxjs/toolkit';

// base
import {
  selectTabMarkedAsChanged,
  selectPeaksById,
  selectPassportData,
  selectLumexStepsData,
  selectChromaMiscData,
  selectPumpProgramData,
  selectTabMethod,
  selectTabMeasurementType,
  selectChromaReportCheckboxes,
  selectChromaPeaksCheckboxes,
  selectReportCalcParams,
  selectPoorPlotSnapshot,
  selectAdditionalStepValid,
  selectDetSpecStepsData,
  selectDetSpecParamsData,
} from '../reduxImportDispatcher';
import { selectIntegrationForMethod } from './selectIntegration';

export const selectChromaDataSnapshot = createSelector(
  [
    selectTabMethod,
    selectPassportData,
    selectPeaksById,

    selectDetSpecStepsData,
    selectAdditionalStepValid,
    selectDetSpecParamsData,

    selectChromaMiscData,
    selectPumpProgramData,
    selectTabMeasurementType,

    selectChromaReportCheckboxes,
    selectChromaPeaksCheckboxes,
    selectIntegrationForMethod,
    selectReportCalcParams,

    selectPeaksById,
    selectPoorPlotSnapshot,
  ],
  (
    tabMethod,
    passportData,
    peakData,

    stepsData,
    additionalStage,
    programParams,

    chromaMiscData,
    pumpProgramData,
    measurementType,
    reportChecks,
    reportPeakChecks,
    integration,
    reportCalcParams,

    // calced and recived
    peaks,
    poorPlotSnapshot,
  ) => ({
    selectedTemplateName: tabMethod,
    type: measurementType,
    passport: passportData,
    peakTable: peakData,

    stepsData,
    additionalStage,
    programParams,

    chromaMiscData,
    pumpProgramData,

    reportSectionChecks: {
      generalParams: reportChecks,
      peakParams: reportPeakChecks,
    },
    integration,
    reportCalcParams,

    // calced and recived
    peaks, // do not export
    plotSnapshot: poorPlotSnapshot, //do not export
  }),
);

// basically just whitelisting
export const selectChromaDataSnapshotExport = createSelector(
  [selectChromaDataSnapshot],
  (snapshot) => {
    if (!snapshot) return snapshot;

    return {
      selectedTemplateName: snapshot.selectedTemplateName,
      type: snapshot.type,
      passport: snapshot.passport,
      peakTable: snapshot.peakTable,

      stepsData: snapshot.stepsData,
      additionalStage: snapshot.additionalStage,
      programParams: snapshot.programParams,

      chromaMiscData: snapshot.chromaMiscData,
      pumpProgramData: snapshot.pumpProgramData,

      reportSectionChecks: snapshot.reportSectionChecks,
      integration: snapshot.integration,
      reportCalcParams: snapshot.reportCalcParams,
    };
  }
);

export const selectChromaDataIfAltered = createSelector(
  [
    selectChromaDataSnapshotExport,
    selectTabMarkedAsChanged,
  ],
  (snapshot, hasAlteredData) => {
    console.log('selectAltered', hasAlteredData, snapshot)
    return hasAlteredData ? snapshot : null
  },
);


export const selectSpectroDataIfAltered = createSelector(
  [
    selectTabMarkedAsChanged,
  ],
  (hasAlteredData) => {
    if (!hasAlteredData) return null;
    return null; // TODO WATCHLIST implement spectro altered data selector
  },
);
