import { createSelector } from '@reduxjs/toolkit';

import {
  selectPassportData,
  selectExportMiscData,
  selectPumpProgramData,
  selectActiveTabMethodParams,
  selectActiveMeasurementType,
  selectInstrumentForMetod,
  selectSpectroDetDepParams,
  selectSpectroSteps,
  selectChromaReportCheckboxes,
  selectChromaPeaksCheckboxes,
  selectReportCalcParams,
  selectDetSpecParamsData,
  selectDetSpecExportDetectorProgram,
} from '../reduxImportDispatcher';
import { selectIntegrationForMethod } from './selectIntegration';

export const selectSpectroMethodData = createSelector(
  [
    selectSpectroDetDepParams,
    selectSpectroSteps,
  ],
  (
    spectroDetDepParams,
    spectroSteps,
  ) => {
    const hasSpectro = (spectroDetDepParams && Object.keys(spectroDetDepParams).length > 0)
      && (Array.isArray(spectroSteps) && spectroSteps.length > 0);

    const spectroscopic = hasSpectro
      ? {
        ...spectroDetDepParams,
        stepsData: spectroSteps,
      }
      : null;

    return hasSpectro ? { spectroscopic } : null;
  },
);

export const selectMethodData = createSelector(
  [
    selectExportMiscData,
    selectDetSpecExportDetectorProgram,
    selectDetSpecParamsData,
    selectActiveTabMethodParams,
    selectPassportData,
    selectPumpProgramData,
    selectActiveMeasurementType,
    selectInstrumentForMetod,
    selectSpectroMethodData,

    selectChromaReportCheckboxes,
    selectChromaPeaksCheckboxes,
    selectIntegrationForMethod,
    selectReportCalcParams,
  ],
  (
    exportMiscData,
    detectorProgram,
    params,
    activeTabMethodParams,
    passportData,
    pumpProgramData,
    activeTabType,
    detectorType,
    spectroMethodData,

    reportChecks,
    reportPeakChecks,
    integration,
    reportCalcParams,
  ) => {
    const result = {
      chromaMethodData: {
        chromaMiscData: exportMiscData,
        detectorProgram,
        params,
        passport: passportData,
        pumpProgramData,
        reportSectionChecks: {
          generalParams: reportChecks,
          peakParams: reportPeakChecks,
        },
        integration,
        reportCalcParams,
      },

      common: {
        type: activeTabType,
        instrument: detectorType,
        options: activeTabMethodParams.options,
        optionsSp: activeTabMethodParams.optionsSp,
      },

      spectroMethodData: spectroMethodData ?? {},
    };

    /* console.log('selectData for method', result); */
    return result;
  },
);
