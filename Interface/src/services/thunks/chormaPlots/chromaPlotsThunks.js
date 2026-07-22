import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  chromaPlotsActions, measurementActions, selectTabType, selectIsTabInitialized, selectStreamedMeasurementId, pumpProgramActions,
  selectDetectorType,
} from '../../reduxImportDispatcher';

import { DETECTOR_TYPES, EMPTY_OBJECT, LUMEX_DETECTOR_TYPES } from '../../../constants/constants';
import { axiosSession } from '../../axiosConfig';
import { detectorProgramThunks } from '../detectorAwareBranched/detectorAwareStateThunks';

export const fetchCalculatedChromotogram = createAsyncThunk(
  'measurement/fetchCalculated',
  async (tabId, { getState, dispatch, rejectWithValue }) => {
    try {
      const response = await axiosSession.get(`/api/measurement/chroma/getCalculated/${tabId}`);
      const { calculatedChromatogram } = response.data;
      dispatch(chromaPlotsActions.appendPlotPointsData({ parentId: tabId, newPoints: calculatedChromatogram, plotType: 'calculatedChromatogram' }));
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const handleClearPlotsIfUpdated = (parentId, isAfterUpdate) => (dispatch) => {
  if (!isAfterUpdate) return;
  dispatch(chromaPlotsActions.clearPlot({ parentId, plotType: 'measuredChromatogram' }));
  dispatch(chromaPlotsActions.clearPlot({ parentId, plotType: 'signalPhoto' }));
  dispatch(chromaPlotsActions.clearPlot({ parentId, plotType: 'signalRef' }));
};

export const handleStatusUpdate = (newStatus) => (dispatch) => {
  if (newStatus) {
    dispatch(measurementActions.changeCurStreamStatus(newStatus));
  }
};

export const handleStepAndStageUpdate = (tabId, activeStep, pumpProgramStage) => (dispatch, getState) => {
  const state = getState()
  const detectorType = selectDetectorType(state)

  dispatch(detectorProgramThunks.setActiveStep({ detectorType, tabId, value: activeStep }));
  dispatch(pumpProgramActions.changeActiveStage({ tabId, activeStage: pumpProgramStage }));
};

export const handleParamsAndPointsUpdate = (parentId, data) => (dispatch) => {
  const {
    measuredChromatogram,
    signalPhoto,
    signalRef,
    mainParams = EMPTY_OBJECT,
    photoParams = EMPTY_OBJECT,
    referenceParams = EMPTY_OBJECT,
  } = data;

  dispatch(chromaPlotsActions.setMeasurementPoints({
    parentId,
    measurementData: { measuredChromatogram, signalPhoto, signalRef },
  }));

  const objHasData = (obj) => Object.keys(obj).length > 0;
  if (objHasData(mainParams) && objHasData(photoParams) && objHasData(referenceParams)) {
    dispatch(chromaPlotsActions.updatePlotTable({
      parentId,
      plotTable: { mainParams, photoParams, referenceParams },
    }));
  }
};

export const fetchChromaMeasurementPoints = createAsyncThunk(
  'measurement/fetchChroma',
  async (parentId, { getState, dispatch }) => {

    try {
      const response = await axiosSession.get('/api/measurement/chroma/listen', {
        params: { measurementName: parentId },
      });
      const { data } = response;
  
      dispatch(handleClearPlotsIfUpdated(parentId, data.isAfterUpdate));
      dispatch(handleStatusUpdate(data.status));
      dispatch(handleStepAndStageUpdate(parentId, data.activeStep, data.pumpProgramStage));
      dispatch(handleParamsAndPointsUpdate(parentId, data));
  
      return {
        parentId,
        measurementData: {
          measuredChromatogram: data.measuredChromatogram,
          signalPhoto: data.signalPhoto,
          signalRef: data.signalRef,
        },
      };
    } catch (error) {
      console.error('Failed fetching points', error)
    }


  },  
);

export const updateMarkersThunk = createAsyncThunk(
  'marker/update',
  async ({ tabId, leftBorder, rightBorder }, { getState, dispatch, rejectWithValue }) => {
    try {
      if (Math.abs(rightBorder - leftBorder) < 1) rejectWithValue('interval is too small ');
      const state = getState();
      const isInitialized = selectIsTabInitialized(state, tabId);
      if (!isInitialized) return rejectWithValue('Tab not initialized');
      const tabType = selectTabType(state, tabId);

      let path = null;
      if (tabType === 'measurement') path = '/api/measurement/chroma/updateMarkers';
      if (tabType === 'file') path = '/api/files/updateMarkers';

      const isStreaming = selectStreamedMeasurementId(state) === tabId;

      const response = await axiosSession.post(path, {
        tabId,
        leftBorder,
        rightBorder,
        ...(isStreaming && { responseWithStream: isStreaming }),
      });

      if (!isStreaming) {
        const { photoParams = {}, referenceParams = {}, mainParams = {} } = response.data?.updatedData ?? {};

        const objHasData = (obj) => Object.keys(obj).length > 0;

        if (objHasData(mainParams) && objHasData(photoParams) && objHasData(referenceParams)) {
          const plotTable = {
            mainParams,
            photoParams,
            referenceParams,
          };
          dispatch(chromaPlotsActions.updatePlotTable({ parentId: tabId, plotTable }));
        }
      }

      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data || { error: 'Unknown error' });
    }
  },
);
