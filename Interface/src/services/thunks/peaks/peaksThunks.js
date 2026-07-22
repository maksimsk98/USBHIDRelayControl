import { createAsyncThunk } from '@reduxjs/toolkit';

import _ from 'lodash';

import { peaksActions, selectActiveTab } from '../../reduxImportDispatcher';
import { axiosSession } from '../../axiosConfig';

export const processPeaksData = ({ tabId, peaksData }) => (dispatch) => {
  const {
    peakTable, isUndoEnabled, isRedoEnabled, calibrationTable,
  } = peaksData;
  if (calibrationTable) {
    dispatch(
      peaksActions.setCalibrationTable({ tabId, calibrationTable }),
    );
  }
  dispatch(peaksActions.setPeaksData({ tabId, peakTable }));
  if (isRedoEnabled != null && isUndoEnabled != null) {
    dispatch(
      peaksActions.setHistoryMove({
        tabId,
        historyMove: { isUndoEnabled, isRedoEnabled },
      }),
    );
  }
};

export const fetchPeakTable = createAsyncThunk(
  'peaks/fetchPeakTable',
  async ({ tabId, sendRequest = false, operationInititiator = 'fetchPeaks' }, { getState, dispatch, rejectWithValue }) => {
    try {
      const response = await axiosSession.get(`/api/peaks/fetch/${tabId}?sendRequest=${sendRequest}&operationInititiator=${operationInititiator}`);

      dispatch(processPeaksData({ tabId, peaksData: response.data }));

      return { tabId, peakTable: response.data.peakTable };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const autoMarkPeaks = createAsyncThunk(
  'peaks/autoMark',
  async (paramsObject, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState();
      const tabId = selectActiveTab(state);
      const response = await axiosSession.post('/api/peaks/autoMark', {
        tabId,
        ...paramsObject,
      });

      dispatch(processPeaksData({ tabId, peaksData: response.data }));

      return { tabId, peakTable: response.data.peakTable };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const moveBorders = createAsyncThunk(
  'peaks/moveBorders',
  async ({paramsToSend, suppressUpdate = false}, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState();
      const tabId = paramsToSend?.tabId ?? selectActiveTab(state);

      // for some unknown reason api counts peaks from 1 not 0 in array so i have to play along
      const asjustedForIndex = _.cloneDeep(paramsToSend);
      if (asjustedForIndex.border) asjustedForIndex.border.peakNum += 1;
      if (asjustedForIndex.collision) asjustedForIndex.collision.peakNum += 1;
      if (asjustedForIndex.paired) asjustedForIndex.paired.peakNum += 1;

      const response = await axiosSession.post('/api/peaks/moveBorders', { tabId, ...asjustedForIndex });

      if (!suppressUpdate) {
        dispatch(processPeaksData({ tabId, peaksData: response.data }));
      } else {
        console.log('Suppressed result of moveBorders as it is itermideate') 
      }

      return { tabId, peakTable: response.data.peakTable };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const addPeak = createAsyncThunk(
  'peaks/addPeak',
  async ({ tabId, xCoord, persistMode = false }, { getState, dispatch, rejectWithValue }) => {
    try {
      if (!persistMode) dispatch(peaksActions.setPeakWorkMode({ tabId, workMode: null }));
      const response = await axiosSession.post('/api/peaks/addPeak', { tabId, xCoord });

      dispatch(processPeaksData({ tabId, peaksData: response.data }));
      return { tabId, peakTable: response.data.peakTable };
    } catch (error) {
      console.error('Error adding peak', error);
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const deletePeak = createAsyncThunk(
  'peaks/deletePeak',
  // right point can be null if on click and not area
  async ({ tabId, leftPoint, rightPoint = null, persistMode = false }, { getState, dispatch, rejectWithValue }) => {
    try {
      if (!persistMode) dispatch(peaksActions.setPeakWorkMode({ tabId, workMode: null }));
      const response = await axiosSession.post('/api/peaks/deletePeak', { tabId, leftPoint, rightPoint });

      dispatch(processPeaksData({ tabId, peaksData: response.data }));
      return { tabId, peakTable: response.data.peakTable };
    } catch (error) {
      console.error('Error deleting peak', error);
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const deleteAllPeaks = createAsyncThunk(
  'peaks/deleteAllPeaks',
  async (tabId, { getState, dispatch, rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/peaks/deleteAllPeaks', { tabId });

      dispatch(processPeaksData({ tabId, peaksData: response.data }));
      return { tabId, peakTable: response.data.peakTable };
    } catch (error) {
      console.error('Error deleting peak', error);
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const movePeakHistory = createAsyncThunk(
  'peaks/movePeakHistory',
  async ({ tabId, command }, { getState, dispatch, rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/peaks/movePeakHistory', { tabId, command });

      dispatch(processPeaksData({ tabId, peaksData: response.data }));
      return { tabId, peakTable: response.data.peakTable };
    } catch (error) {
      console.error('Error deleting peak', error);
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const movePeakMarkers = createAsyncThunk(
  'peaks/moveMarkers',
  async ({ tabId, leftBorder, rightBorder }, { getState, dispatch, rejectWithValue }) => {
    try {
      if (!isFinite(leftBorder) || !isFinite(rightBorder)) return rejectWithValue('Invalid borders');
      /* dispatch(peaksActions.setPeaksMarkers({tabId, markers: {leftBorder, rightBorder}})) */
      const response = await axiosSession.post('/api/peaks/moveMarkers', { tabId, leftBorder, rightBorder });
      const { mainParams: statistics } = response.data;
      dispatch(peaksActions.setPeaksStatistics({ tabId, statistics }));
      return { tabId, mainParams: response.data.mainParams };
    } catch (error) {
      console.error('Error moving markers', error);
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const changePeakProperty = createAsyncThunk(
  'peaks/changePeakProperty',
  async ({ tabId, peakIndex, property, suppressUpdate = false }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/peaks/changePeakProperty', {
        tabId,
        peakIndex,
        property,
      });

      if (!suppressUpdate) {
        dispatch(processPeaksData({ tabId, peaksData: response.data }));
      } else {
        console.log('Suppressed result of changePeakProperty as it is itermideate') 
      }
      
      return { tabId, peakTable: response.data.peakTable };
    } catch (error) {
      console.error('Error changing peak property:', error);
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const changeSubstanceName = createAsyncThunk(
  'peaks/changeSubstanceName',
  async (
    { row, newSubstanceName, tabId },
    { getState, dispatch, rejectWithValue },
  ) => {
    try {
      const response = await axiosSession.post('/api/peaks/changeSubstanceName', {
        tabId,
        operation: 'changeSubstanceName',
        row,
        newSubstanceName,
      });

      await dispatch(processPeaksData({ tabId, peaksData: response.data }));

      return { tabId, peakTable: response.data.peakTable };
    } catch (error) {
      console.error('Error changing substance name:', error);
      return rejectWithValue(error.response?.data || error.message);
    }
  },
);
