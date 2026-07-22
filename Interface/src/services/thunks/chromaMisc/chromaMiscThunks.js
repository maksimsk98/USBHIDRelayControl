import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  chromaMiscActions, chromaPlotsActions, selectChromaMiscData, selectIsActCalculatedEmpty, selectIsTabInitialized, selectPeakIdParamsById, selectSmoothingParamsById, selectStreamedMeasurementId, selectTabType,
} from '../../reduxImportDispatcher';
import { EMPTY_OBJECT, UI_ONLY_SIGNAL_PARAMS } from '../../../constants/constants';
import { processPeaksData } from '../peaks/peaksThunks';
import { axiosSession } from '../../axiosConfig';

export const updateSignalParamThunk = createAsyncThunk(
  'misc/updateSignalParam',
  async ({ id, paramName, value }, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState();
      // Update Redux immediately
      dispatch(chromaMiscActions.updateSignalParams({
        id,
        params: { [paramName]: value },
      }));

      if (UI_ONLY_SIGNAL_PARAMS.includes(paramName)) return;

      if (paramName === 'isSignalAveraging' && value) {
        dispatch(chromaMiscActions.updateSignalParams({
          id,
          params: { isCheckedCorrection: value },
        }));
      }

      const tabType = selectTabType(state, id);
      if (!tabType) return; // guard agaisnt not started measurements
      let valueToSend = value;
      let extraValues = {};

      if (paramName === 'isSignalAveraging') {
        if (value) {
          const { averaging } = selectChromaMiscData(state, id);
          valueToSend = averaging;
          extraValues = { isCheckedSignalAveraging: true };
        } else {
          valueToSend = 0.2;
          extraValues = { isCheckedSignalAveraging: false };
        }
      }

      const messageBody = {
        tabId: id,
        paramName,
        value: valueToSend,
        ...extraValues,
      };

      if (tabType === 'file') {
        const response = await axiosSession.post('/api/files/updateFileParam', messageBody);

        const { updatedData } = response.data;

        if (updatedData) {
          dispatch(chromaPlotsActions.clearAllPlotsData({ parentId: id }));
          dispatch(chromaPlotsActions.appendPlotsAndAddTable({ id, plotsData: updatedData.plotsData }));
        }

        return response.data;
      } if (tabType === 'measurement') {
        const isStreaming = selectStreamedMeasurementId(state) === id;
        const response = await axiosSession.post('/api/measurement/chroma/updateMeasParam', {
          ...messageBody,
          responseWithStream: isStreaming,
        });

        if (!isStreaming) {
          const {
            measuredChromatogram,
            signalPhoto,
            signalRef,
          } = response.data?.updatedData;
          const plotTable = {
            mainParams: response.data?.updatedData?.mainParams ?? EMPTY_OBJECT,
            photoParams: response.data?.updatedData?.photoParams ?? EMPTY_OBJECT,
            referenceParams: response.data?.updatedData?.referenceParams ?? EMPTY_OBJECT,
          };

          dispatch(chromaPlotsActions.clearPlot({ parentId: id, plotType: 'measuredChromatogram' }));
          dispatch(chromaPlotsActions.clearPlot({ parentId: id, plotType: 'signalPhoto' }));
          dispatch(chromaPlotsActions.clearPlot({ parentId: id, plotType: 'signalRef' }));

          const result = {
            parentId: id,
            measurementData: {
              measuredChromatogram,
              signalPhoto,
              signalRef,
            },
          };

          dispatch(chromaPlotsActions.setMeasurementPoints(result));
          dispatch(chromaPlotsActions.updatePlotTable({ parentId: id, plotTable }));
        }
        return response.data;
      }

      return rejectWithValue(`Tab type "${tabType}" not supported for updating signal parameters.`);
    } catch (error) {
      console.error('Error in updateFileParamsThunk:', error);
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const updateSmoothingParamsThunk = createAsyncThunk(
  'chromaMisc/smoothingParams',
  async ({ tabId, params = null, }, { getState, dispatch, rejectWithValue }) => {
    const state = getState();
    const resolvedParams =
      params ?? selectSmoothingParamsById(state, tabId);

    // update redux ONLY if params were explicitly provided
    if (params !== null) {
      dispatch(
        chromaMiscActions.updateSmoothingParams({
          id: tabId,
          params,
        })
      );
    }

    const isInitialized = selectIsTabInitialized(state, tabId)
    const noPost = !isInitialized

    if (noPost) return null;

    const withoutResponse = selectIsActCalculatedEmpty(state, { tabId })

    const tabType = selectTabType(state, tabId);

    try {
      let response;
      const messageBody = {
        tabId,
        params: resolvedParams,
        withoutResponse
      };

      if (tabType === 'measurement') {
        response = await axiosSession.post('/api/files/updateSmoothingParams', messageBody);
      } else if (tabType === 'file') {
        response = await axiosSession.post('/api/measurement/chroma/updateSmoothingParams', messageBody);
      } else {
        return null;
      }

      if (withoutResponse) return true

      const { calculatedChromatogram } = response.data;
      if (calculatedChromatogram) {
        dispatch(chromaPlotsActions.clearPlot({
          parentId: tabId,
          plotType: 'calculatedChromatogram',
        }));
        dispatch(chromaPlotsActions.appendPlotPointsData({
          parentId: tabId,
          newPoints: calculatedChromatogram,
          plotType: 'calculatedChromatogram',
        }));
      }

      return calculatedChromatogram;
    } catch (error) {
      console.error('failed changing smoothing params', error);
      return rejectWithValue(error);
    }
  },
);

export const updatePeakIdThunk = createAsyncThunk(
  'chromaMisc/peakIdParams',
  async ({ tabId, params = null }, { getState, dispatch, rejectWithValue }) => {
    const state = getState();

    const resolvedParams =
      params ?? selectPeakIdParamsById(state, tabId);

    // update redux only if explicitly provided
    if (params !== null) {
      dispatch(
        chromaMiscActions.updatePeakIdParams({
          id: tabId,
          params,
        })
      );
    }

    const isInitialized = selectIsTabInitialized(state, tabId)
    const noPost = !isInitialized

    if (noPost) return null;

    const withoutResponse = selectIsActCalculatedEmpty(state, { tabId })

    const tabType = selectTabType(state, tabId);

    try {
      let response;
      const messageBody = {
        tabId,
        params: resolvedParams,
        withoutResponse
      };

      if (tabType === 'measurement') {
        response = await axiosSession.post('/api/files/updatePeakIdParams', messageBody);
      } else if (tabType === 'file') {
        response = await axiosSession.post('/api/measurement/chroma/updatePeakIdParams', messageBody);
      } else {
        return null;
      }

      if (withoutResponse) return true

      dispatch(processPeaksData({ tabId, peaksData: response.data }));

      return response.data;
    } catch (error) {
      console.error('failed changing peak id params', error);
      return rejectWithValue(error);
    }
  },
);
