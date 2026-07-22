import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  calibrationActions,
  passportActions,
  chromaMiscActions,
  pumpProgramActions,
  measurementActions,
  methodActions,
  selectIsTabInitialized,
  selectSelectedMethod,
  spectroStepsActions,
  selectTabMeasurementType,
  peaksActions,
  reportActions,
  selectDetectorType,
} from '../../reduxImportDispatcher';

// base
import { selectActiveTab, selectIsSelCalibGen } from '../../reduxImportDispatcher';
// derived
import { selectActiveTabType } from '../../reduxImportDispatcher';
import { pickRealMethodData } from '../../../utils/methods';
import { TAB_TYPES } from '../../../constants/constants';
import { getCorrectAveragingKey } from '../../../utils/spectroSteps';
import { takeMeasurementMethodSnapshotThunk } from '../snapshotThunk';
import { axiosSession } from '../../axiosConfig';
import { detectorProgramThunks, setStepTemplateByDetThunk } from '../detectorAwareBranched/detectorAwareStateThunks';

export const chooseMethod = createAsyncThunk(
  'method/chooseMethods',
  async ({
    selectedMethod,
    allowTemplateOverwrite = true,
    allowInitializedOverwrite = false,
    tabId = null, // explicitly pass the tabId; fallback to activeTab if not provided
  }, { dispatch, getState, rejectWithValue }) => {
    try {
      const prevMethod = selectSelectedMethod(getState());

      const methodToSet = selectedMethod === '' ? null : selectedMethod;
      dispatch(methodActions.setSelectedMethod(methodToSet));

      const state = getState();
      const actualTabId = tabId || selectActiveTab(state);
      const isTabInitialized = selectIsTabInitialized(state, actualTabId);
      const tabType = selectActiveTabType(state);
      const isCalibGeneral = selectIsSelCalibGen(state, { method: methodToSet });

      const doForceTemplate = allowTemplateOverwrite && (!isTabInitialized || allowInitializedOverwrite);

      const response = await axiosSession.post('/api/methods/chooseMethod', { name: methodToSet });
      const rawMessage = response.data;

      const cleanedRawMethod = pickRealMethodData(rawMessage);

      const {
        calibrationList = [],
        passport = null,
        detectorProgram = null,
        params: programParams = null,
        chromaMiscData = null,
        pumpProgramData = null,
        options = null,
        optionsSp = null,
        spectroscopic = null,
        instrument,
        integration = null,
        reportSectionChecks = null,
        reportCalcParams = null,
      } = rawMessage;

      const {
        stepsData = null,
        additionalStage = null,
      } = detectorProgram ?? {};

      const {
        stepsData: spectroStepsData = null,
        averaging: spectroParamsAveraging,
        correction,
        sensitivity,
      } = spectroscopic ?? {};

      const {
        generalParams = {},
        peakParams = {},
      } = reportSectionChecks ?? {};

      const {
        markStart = null,
        minHeight = null,
        minHalfWidth = null,

        useRelativeTimes = true,
        maxRelation = 15,
        searchWindow = 2,

        isSmoothingPulseChecked = true,
        isSmoothingAdaptiveChecked = true,
        isSmoothingCubicChecked = false,
        isSmoothingDoubleChecked = false,

        smoothingFactor = 1,
        smoothingWindow = 5,
        smoothingMinLevel = null,

        alternativeFilters = 'none',

        useDriftCompensation = false,
        driftFrom = null,
        driftTo = null,
      } = integration ?? {};

      // if null default here to defauults in slice
      const autoMarkParams = {
        markStart,
        minHeight,
        minHalfWidth,
      };

      const peakIdParams = {
        useRelativeTimes,
        maxRelation,
        searchWindow,
      };

      const smoothingParams = {
        isSmoothingPulseChecked,
        isSmoothingAdaptiveChecked,
        isSmoothingCubicChecked,
        isSmoothingDoubleChecked,
        smoothingFactor,
        smoothingWindow,
        smoothingMinLevel,
        alternativeFilters,
        useDriftCompensation,
        driftFrom,
        driftTo,
      };

      const chromaMiscTemplate = { ...chromaMiscData, peakIdParams, smoothingParams };

      dispatch(calibrationActions.setCalibrationOptions({ method: methodToSet, calibrationList }));

      dispatch(methodActions.setRawMethodParams({
        methodName: methodToSet,
        parameters: cleanedRawMethod,
      }));

      /* console.log('choice', selectedMethod) */

      dispatch(passportActions.setTemplate(passport));

      

      const normalizedSpectroStepTemplate = {
        steps: spectroStepsData,
        params: {
          correction,
          sensitivity,
          [getCorrectAveragingKey(instrument)]: spectroParamsAveraging,
        },
      };

      
      const effectiveDetectorType = selectDetectorType(state);

      dispatch(detectorProgramThunks.setTemplate({ 
        detectorType: effectiveDetectorType, 
        template: { steps: stepsData, additionalStep: additionalStage, params: programParams },
      }));

      dispatch(spectroStepsActions.setTemplate(normalizedSpectroStepTemplate));

      dispatch(chromaMiscActions.setTemplate(chromaMiscTemplate));
      dispatch(pumpProgramActions.setTemplate(pumpProgramData));

      if (!doForceTemplate) return response.data;

      const measurementType = selectTabMeasurementType(state, actualTabId);

      if (tabType === TAB_TYPES.MEASUREMENT) {
        dispatch(measurementActions.changeMethodAndCheckCalib({ id: actualTabId, method: methodToSet, isCalibGeneral }));

        if (measurementType === 'chroma') {
          dispatch(passportActions.forceTemplate({ measurementId: actualTabId, template: passport }));
          
          dispatch(detectorProgramThunks.forceTemplate({ 
            detectorType: effectiveDetectorType, 
            measurementId: actualTabId, 
            template: { steps: stepsData, additionalStep: additionalStage, params: programParams } 
          }));
                
          dispatch(chromaMiscActions.forceTemplate({ measurementId: actualTabId, template: chromaMiscTemplate }));
          dispatch(pumpProgramActions.forceTemplate({ measurementId: actualTabId, template: pumpProgramData }));

          dispatch(peaksActions.setPeaksParams({ tabId: actualTabId, params: autoMarkParams }));

          dispatch(reportActions.setReportChecks({
            id: actualTabId,
            generalParams,
            peakParams,
          }));

          if (reportCalcParams) {
            dispatch(reportActions.setReportCalcParams({
              parentId: actualTabId,
              calcParams: reportCalcParams,
            }));
          }

          // ===============================
          // METHOD SNAPSHOT LOGIC
          // ===============================
          //
          // Take method snapshot ONLY while measurement is NOT initialized.
          // After initialization snapshots are frozen forever.
          //
          if (tabType === TAB_TYPES.MEASUREMENT && !isTabInitialized && methodToSet) {
            dispatch(takeMeasurementMethodSnapshotThunk({ id: actualTabId }));
          }
        }
        if (measurementType === 'spectro') {
          console.log('Forcing spectro template for measurement', actualTabId, normalizedSpectroStepTemplate);
          dispatch(spectroStepsActions.forceTemplate({ measurementId: actualTabId, template: normalizedSpectroStepTemplate }));
        }
      }

      return {
        ...response.data,
        selectedMethod: methodToSet,
        tabId: actualTabId,
        prevMethod,
      };
    } catch (error) {
      console.error(`Failed to choose method ${selectedMethod}`, error);
      return rejectWithValue(error.message);
    }
  },
);
