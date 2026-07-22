import { createAsyncThunk } from '@reduxjs/toolkit';

import {
  measurementActions, fileActions, calibrationActions,
  selectTabCalibOriginFile,
  selectActiveCompIndexByTabId,
  selectTabMethod,
  selectCalibrationHashToId,
  selectCalibDescriptors,
  selectActiveTab,
} from '../../reduxImportDispatcher';
// base
import { selectSelectedCalibration, selectSelectedMethod } from '../../reduxImportDispatcher';
// derived
import { selectActiveTabType, selectIsTabInitialized } from '../../reduxImportDispatcher';

import { fetchPeakTable, processPeaksData } from '../peaks/peaksThunks';
import { chooseMethod } from '../method/chooseMethodThunk';
import { computeCalibKey } from '../../../utils/calib';
import { fetchCalibConcStandardThunk } from '../calibConc/calibConcThunks';
import { axiosSession } from '../../axiosConfig';

const calibrationChangeByTabType = async (
  dispatch,
  activeTab,
  calibrationToSet,
  tabType,
  isTabInitialized,
  operationInititiator,
) => {
  switch (tabType) {
    case 'measurement':
      dispatch(measurementActions.changeCalibration({ id: activeTab, calibration: calibrationToSet }));
      if (isTabInitialized) {
        await dispatch(fetchPeakTable({ tabId: activeTab, sendRequest: false, operationInititiator }));
      }
      break;
    case 'file':
      await dispatch(fetchPeakTable({ tabId: activeTab, sendRequest: false, operationInititiator }));
      dispatch(fileActions.changeCalibration({ id: activeTab, calibration: calibrationToSet }));
      break;
    case 'calibration':
      dispatch(calibrationActions.changeCalibTabCalibration({ id: activeTab, calibration: calibrationToSet }));
      break;
    default:
      console.warn(`No calibration action defined for tab type ${tabType}`);
      break;
  }
};

export const confirmCalibComponentEquality = createAsyncThunk(
  'calibration/confirmCalibComponentEquality',
  async (selectedCalibration, { dispatch, getState, rejectWithValue }) => {
    if (selectedCalibration == null) return true; // no calibration selected
    try {
      const state = getState();
      const activeTab = selectActiveTab(state);

      const response = await axiosSession.get('/api/calibrations/confirmComponentEquality', {
        params: {
          calibrationName: selectedCalibration,
          tabId: activeTab,
        },
      });

      const { displayWarning, namesComponentsSame } = response.data;
      if (!displayWarning) return true;

      if (displayWarning && namesComponentsSame == null) console.error('Needs to display component mismatch but check result is nullish');

      return namesComponentsSame ?? false;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const selectCalibration = createAsyncThunk(
  'calibration/selectCalibration',
  async (selectedCalibration, { dispatch, getState, rejectWithValue }) => {
    try {
      const calibrationToSet = selectedCalibration === '' ? null : selectedCalibration;

      dispatch(calibrationActions.setSelectedCalibration(calibrationToSet));

      const state = getState();
      const activeTab = selectActiveTab(state);

      if (!activeTab) {
        console.warn('No active tab to set calibration for');
        return null;
      }

      const isTabInitialized = selectIsTabInitialized(state, activeTab);

      let response = null;
      if (isTabInitialized) {
        response = await axiosSession.post('/api/calibrations/selectCalibration', {
          name: calibrationToSet,
          tabId: activeTab,
        });

        // for report and modal
        await dispatch(fetchCalibConcStandardThunk());
      } else {
        console.warn(`Tab ${activeTab} is not initialized yet, skipping API call on selectCalibration`);
      }

      const tabType = selectActiveTabType(state);

      await calibrationChangeByTabType(
        dispatch,
        activeTab,
        calibrationToSet,
        tabType,
        isTabInitialized,
        'selectCalibration',
      );

      return response.data || null;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const refocusCalibrationIfRepeat = createAsyncThunk(
  'calibration/refocusIfRepeat',
  async ({
    selectedMethod, selectedCalibration, chromaFileId, sourceTabId,
  }, { getState, dispatch }) => {
    const state = getState();

    const actualChromaFileOrigin = chromaFileId || selectTabCalibOriginFile(state, {
      calibration: selectedCalibration,
      tabId: sourceTabId,
    });

    console.groupCollapsed('hash');

    const hash = computeCalibKey(selectedMethod, selectedCalibration, actualChromaFileOrigin);
    console.log(hash);
    const idsByHash = selectCalibrationHashToId(state); // { [hash]: tabId }
    const existingId = idsByHash[hash];

    console.log(Object.entries(idsByHash));

    if (existingId) {
      console.log('refocus existing calib', { hash, existingId });
      dispatch(calibrationActions.setShouldFocus({ id: existingId }));
      return { isRepeat: true, id: existingId, hash };
    }
    console.groupEnd();
    return { isRepeat: false, id: null, hash };
  },
);

export const viewCalibration = createAsyncThunk(
  'calibration/viewCalibration',
  async ({ calibrationTabId, openedOnfileId = null, passRepeatCheck = true }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();

      const selectedCalibration = selectSelectedCalibration(state);
      const selectedMethod = selectSelectedMethod(state);

      const chromaFileId = selectTabCalibOriginFile(state, {
        calibration: selectedCalibration,
        tabId: openedOnfileId ?? calibrationTabId,
      });

      if (!passRepeatCheck) {
        const { isRepeat, id } = await dispatch(
          refocusCalibrationIfRepeat({
            selectedMethod, selectedCalibration, chromaFileId, sourceTabId: calibrationTabId,
          }),
        ).unwrap();

        if (isRepeat) {
          console.warn('thunk repeat');
          return { id, isRepeat: true };
        }
      }

      const response = await axiosSession.post('/api/calibrations/viewCalibration', {
        name: selectedCalibration,
        selectedMethod,
        chromaFileId,
        calibrationTabId,
      });
      dispatch(calibrationActions.setFetchedCalibrationData({ calibrationTabId, fetchedCalibration: response.data }));
      return { calibrationTabId, fetchedCalibration: response.data };
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const closeCalibWithApiCall = createAsyncThunk(
  'calibration/closeCalibWithApiCall',
  async ({ calibrationTabId, deleteEntry = true }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();
      const {
        calibration,
        chromaFileId,
        method,
      } = selectCalibDescriptors(state, calibrationTabId);

      if (deleteEntry) dispatch(calibrationActions.deleteCalibTabData({ calibrationTabId }));

      const response = await axiosSession.post(
        '/api/calibrations/closeCalibration',
        { name: calibration, chromaFileId, selectedMethod: method },
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

const handleCalibration = async ({
  apiEndpoint, calibrationData, selectedMethod, originTabId,
}, { dispatch, rejectWithValue }) => {
  try {
    const response = await axiosSession.post(apiEndpoint, { calibrationData, originTabId });
    const { calibrationList } = response.data;
    dispatch(calibrationActions.setCalibrationOptions({ method: selectedMethod, calibrationList }));
    await dispatch(selectCalibration(calibrationData.name)); // active tab's calib changes here

    return response;
  } catch (error) {
    return rejectWithValue(error);
  }
};

export const addCalibration = createAsyncThunk(
  'calibration/addCalibration',
  async ({ calibrationData, selectedMethod, originTabId }, thunkAPI) => handleCalibration({
    apiEndpoint: '/api/calibrations/addCalibration',
    calibrationData,
    selectedMethod,
    originTabId,
  }, thunkAPI),
);

export const recalibrate = createAsyncThunk(
  'calibration/recalibrate',
  async ({ calibrationData, selectedMethod, originTabId }, thunkAPI) => handleCalibration({
    apiEndpoint: '/api/calibrations/recalibrate',
    calibrationData,
    selectedMethod,
    originTabId,
  }, thunkAPI),
);

export const addComponent = createAsyncThunk(
  'calibration/addComponent',
  async ({ calibrationData, selectedMethod, originTabId }, thunkAPI) => handleCalibration({
    apiEndpoint: '/api/calibrations/addComponent',
    calibrationData,
    selectedMethod,
    originTabId,
  }, thunkAPI),
);

export const confirmAbleToAddLevel = createAsyncThunk(
  'calibration/confirmAbleToAddLevel',
  async ({ selectedCalibration, originTabId }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();
      const method = selectTabMethod(state, originTabId); // this supposed to be a file

      const response = await axiosSession.post('/api/calibrations/confirmAbleToAddLevel', {
        name: selectedCalibration,
        originTabId,
        selectedMethod: method,
      });
      return response.data.isConfirm;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const addLevel = createAsyncThunk(
  'calibration/addLevel',
  async ({
    levelData, selectedMethod, selectedCalibration, originTabId,
  }, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosSession.post('/api/calibrations/addLevel', {
        levelData,
        selectedCalibration,
        originTabId,
        selectedMethod,
      });
      const { calibrationList } = response.data;
      dispatch(calibrationActions.setCalibrationOptions({ method: selectedMethod, calibrationList }));
      await dispatch(selectCalibration(selectedCalibration)); // active tab's calib changes here

      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const deleteCalib = createAsyncThunk(
  'calibration/deleteCalib',
  async ({ calibTabId }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();
      const {
        calibration,
        chromaFileId,
        method,
      } = selectCalibDescriptors(state, calibTabId);

      const response = await axiosSession.post('/api/calibrations/deleteCalib', {
        name: calibration,
        selectedMethod: method,
        chromaFileId,
      });
      const { calibrationList } = response.data;
      dispatch(calibrationActions.setCalibrationOptions({ method, calibrationList }));
      await dispatch(selectCalibration(null)); // active tab's calib changes here
      dispatch(calibrationActions.markTabForClosure({ calibrationTabId: calibTabId }));

      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const copyCalib = createAsyncThunk(
  'calibration/copyCalib',
  async ({ newName, methodToAppendTo, calibTabId }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();
      const {
        calibration,
        chromaFileId,
        method,
      } = selectCalibDescriptors(state, calibTabId);

      const response = await axiosSession.post('/api/calibrations/copyCalib', {
        name: newName,
        methodToAppendTo,
        sourceCalibration: calibration,
        sourceMethod: method,
        chromaFileId,
      });
      const { calibrationList } = response.data;
      dispatch(calibrationActions.setCalibrationOptions({ method: methodToAppendTo, calibrationList }));
      await dispatch(chooseMethod({ selectedMethod: methodToAppendTo, tabId: calibTabId }));
      await dispatch(selectCalibration(newName)); // active tab's calib changes here
      await dispatch(viewCalibration({ calibrationTabId: calibTabId }));

      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const activatePoint = createAsyncThunk(
  'calibration/activatePoint',
  async ({ pointIndex, calibTabId, isActive }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();
      const substanceIndex = selectActiveCompIndexByTabId(state, calibTabId);
      const {
        calibration,
        chromaFileId,
        method,
      } = selectCalibDescriptors(state, calibTabId);

      const dataTosend = {
        isActive,
        substanceIndex,
        name: calibration,
        selectedMethod: method,
        pointIndex,
        chromaFileId,
      };

      const response = await axiosSession.post('/api/calibrations/activatePoint', dataTosend);

      const { calibrationList } = response.data;
      dispatch(calibrationActions.setCalibrationOptions({ method, calibrationList }));
      await dispatch(viewCalibration({ calibrationTabId: calibTabId }));

      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const deleteCalibLevel = createAsyncThunk(
  'calibration/deleteCalibLevel',
  async ({ pointIndex, calibTabId }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();
      const substanceIndex = selectActiveCompIndexByTabId(state, calibTabId);

      const {
        calibration,
        chromaFileId,
        method,
      } = selectCalibDescriptors(state, calibTabId);

      const dataTosend = {
        substanceIndex,
        name: calibration,
        selectedMethod: method,
        pointIndex,
        chromaFileId,
      };

      const response = await axiosSession.post('/api/calibrations/deleteCalibLevel', dataTosend);

      const { calibrationList } = response.data;
      dispatch(calibrationActions.setCalibrationOptions({ method, calibrationList }));
      await dispatch(viewCalibration({ calibrationTabId: calibTabId }));

      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const editCalibComponent = createAsyncThunk(
  'calibration/editCalibComponent',
  async ({ newComponents, calibTabId }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();
      const {
        calibration,
        chromaFileId,
        method,
      } = selectCalibDescriptors(state, calibTabId);
      const newComponentsTimes = newComponents.map((comp) => Number(comp.retentionTime));

      const dataTosend = {
        name: calibration,
        selectedMethod: method,
        newComponentsTimes,
        chromaFileId,
      };

      const response = await axiosSession.post('/api/calibrations/editComponent', dataTosend);

      const { calibrationList } = response.data;
      dispatch(calibrationActions.setCalibrationOptions({ method, calibrationList }));
      await dispatch(viewCalibration({ calibrationTabId: calibTabId }));

      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const deleteCalibComponent = createAsyncThunk(
  'calibration/deleteCalibComponent',
  async ({ substanceIndex, calibTabId }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();

      const {
        calibration,
        chromaFileId,
        method,
      } = selectCalibDescriptors(state, calibTabId);

      const dataTosend = {
        substanceIndex,
        name: calibration,
        selectedMethod: method,
        chromaFileId,
      };

      dispatch(calibrationActions.changeTabActiveComp({ id: calibTabId, activeComponentIndex: 0 }));

      const response = await axiosSession.post('/api/calibrations/deleteComponent', dataTosend);

      const { calibrationList } = response.data;
      dispatch(calibrationActions.setCalibrationOptions({ method, calibrationList }));
      await dispatch(viewCalibration({ calibrationTabId: calibTabId }));

      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);

export const applyCalibration = createAsyncThunk(
  'calibration/applyCalibration',
  async ({ tabId, calibration }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();

      const response = await axiosSession.post('/api/calibrations/apply', {
        name: calibration,
        tabId,
      });

      // refresh peak table
      dispatch(processPeaksData({ tabId, peaksData: response.data }));

      return response.data;
    } catch (error) {
      return rejectWithValue(error);
    }
  },
);
