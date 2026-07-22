import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  chromaMiscActions,
  passportActions,
  pumpProgramActions,
  chromaPlotsActions,
  peaksActions,
  measurementActions,
  fileActions,
  calibrationActions,
  methodActions,
  reportActions,
  selectIsCalibGen,
  changeTrackerActions,
  selectDetectorType,
} from '../reduxImportDispatcher';

// base
import {
  selectSelectedCalibrationIfGeneral,
  selectIsMethodGeneral,
  selectSelectedMethodIfGeneral,
} from '../reduxImportDispatcher';

import {
  DEFAULT_EXPECTED_PLOTS, NOT_GENERAL_CALIBRATION, NOT_GENERAL_METHOD, OPEN_STATES, PACKAGE_EXPECTED_PLOTS,
} from '../../constants/constants';
import { chooseMethod } from './method/chooseMethodThunk';
import { extractAndFormatMethodAndCalib } from '../../utils/validation';
import { parseIntegrationAndReport } from '../../utils/parsers';
import { takeFileDataSnapshotThunk, takeFileMethodSnapshotThunk, takeMeasurementMethodSnapshotThunk } from './snapshotThunk';
import { fetchCalibConcStandardThunk } from './calibConc/calibConcThunks';
import { addChromaByDetThunk, detectorProgramThunks } from './detectorAwareBranched/detectorAwareStateThunks';

const addChromaThunk = createAsyncThunk(
  'measurement/addChroma',
  async ({
    preId,
    loadedData,
    shouldOpen = false,
    fileCategory = null,
    fileHash = null,
    packageId = null,
    path = null,
  }, { dispatch, getState }) => {
    try {
      const {
        stepsData = null,
        params: programParams = null,
        additionalStage = null,
        chromaMiscData = null,
        passport = null,
        pumpProgramData = null,
        plotsData = null,
        peakTable = null,
        type: measurementType = 'unknownType',
        detectorType,
        automarkupParameters,
        calibrationTable = null,
        integration = null,
        reportSectionChecks = null,
        reportCalcParams = null,
        ...metaData
      } = loadedData || {}; // If something is not present in JSON, it will be undefined during destructuring

      const { selectedTemplateName, archiveCalibrationName, selectedCalibrationName } = extractAndFormatMethodAndCalib(loadedData);
      const state = getState();

      // if file id is name(that is id for meas) + hash
      const id = loadedData ? `${preId}_${fileHash}` : preId;

      const effectiveDetectorType = detectorType ?? selectDetectorType(state);

      console.log('addChromaThunk', effectiveDetectorType)
      dispatch(detectorProgramThunks.addChroma({ detectorType: effectiveDetectorType, id, stepsData, programParams, directAdditionalStep: additionalStage }));
      
      dispatch(chromaMiscActions.addChroma({ id, chromaMiscData }));
      dispatch(passportActions.addChroma({ measurementId: id, passportData: passport, metaData }));
      dispatch(pumpProgramActions.addChroma({ id, pumpProgramData }));
      dispatch(reportActions.initializeCheckboxes({ id }));

      // crutch default for safety, in file inits with data again
      dispatch(peaksActions.setPeaksParams({ tabId: id }));

      if (loadedData) { // means it is file
        const isLoadedMethodGeneral = selectIsMethodGeneral(state, { method: selectedTemplateName });
        const isLoadedSelCalibGen = isLoadedMethodGeneral && selectIsCalibGen(state, {
          method: selectedTemplateName,
          calibration: selectedCalibrationName,
        });

        const calibrationToUse = archiveCalibrationName ?? (isLoadedSelCalibGen ? selectedCalibrationName : null);

        if (isLoadedMethodGeneral) {
          await dispatch(chooseMethod({ selectedMethod: selectedTemplateName, allowTemplateOverwrite: false }));
        }

        // for report and modal
        await dispatch(fetchCalibConcStandardThunk({ method: selectedTemplateName, calibration: calibrationToUse }));

        dispatch(calibrationActions.addFileCalibrations({
          fileId: id,
          newCalibrations: [calibrationToUse].filter((calib) => calib),
        }));

        dispatch(fileActions.openFile({
          id,
          name: preId,
          type: measurementType,
          /* method: selectedMethod, */
          method: selectedTemplateName,
          calibration: calibrationToUse,
          archiveCalibration: archiveCalibrationName,
          detectorType: effectiveDetectorType,
          openState: shouldOpen ? OPEN_STATES.QUEUE : OPEN_STATES.CLOSED,
          category: fileCategory,
          hash: fileHash,
          packageId,
          path,
        }));
        dispatch(methodActions.addFileMethod({ fileId: id, newMethod: selectedTemplateName }));


        dispatch(chromaPlotsActions.setPlotsAndAddTable({
          id,
          plotsData,
          expectedPlots: packageId ? PACKAGE_EXPECTED_PLOTS : DEFAULT_EXPECTED_PLOTS,
        }));

        dispatch(peaksActions.setPeaksData({ tabId: id, peakTable }));

        dispatch(peaksActions.setCalibrationTable({ tabId: id, calibrationTable }));

        const parsed = parseIntegrationAndReport({
          integration,
          reportSectionChecks,
          reportCalcParams,
        });

        const {
          autoMarkParams, peakIdParams, smoothingParams, report,
        } = parsed;

        dispatch(peaksActions.setPeaksParams({
          tabId: id,
          params: (integration ? autoMarkParams : automarkupParameters),
        }));

        dispatch(reportActions.setReportChecks({
          id,
          generalParams: report.generalParams,
          peakParams: report.peakParams,
        }));

        if (report.reportCalcParams) {
          dispatch(reportActions.setReportCalcParams({
            parentId: id,
            calcParams: report.reportCalcParams,
          }));
        }

        dispatch(chromaMiscActions.updatePeakIdParams({
          id,
          params: peakIdParams,
        }));

        dispatch(chromaMiscActions.updateSmoothingParams({
          id,
          params: smoothingParams,
        }));

        dispatch(changeTrackerActions.resetHasAlteredData(id)); // HACK WATCHLIST somewhat of crutch to not have init and change actions in reducers
        await dispatch(takeFileDataSnapshotThunk({ id }));
        await dispatch(takeFileMethodSnapshotThunk({ id }));
      } else {
        let selectedMethod = selectSelectedMethodIfGeneral(state);

        let selectedCalibration = selectSelectedCalibrationIfGeneral(state, { method: selectedMethod });

        // when creating new measurement from opened file needs to fall back to null to not keep inexplicit data
        if (selectedMethod === NOT_GENERAL_METHOD) {
          selectedMethod = null;
          selectedCalibration = null;
        }

        // this should be redundant, but too be sure
        if (selectedCalibration === NOT_GENERAL_CALIBRATION) {
          selectedCalibration = null;
        }

        dispatch(measurementActions.addMeasurement({
          id, type: 'chroma', method: selectedMethod, calibration: selectedCalibration, shouldOpen,
        }));

        if (selectedMethod != null) dispatch(takeMeasurementMethodSnapshotThunk({ id }));

        return {
          id, type: 'chroma', method: selectedMethod, calibration: selectedCalibration, shouldOpen,
        };
      }
    } catch (error) {
      console.error('Error add chroma', error);
    }
  },
);

export default addChromaThunk;
